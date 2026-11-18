'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { JsonStore } = require('../lib/store');
const { RoomService } = require('../lib/rooms');
const game = require('../games/terrorscape');

const humans = Array.from({ length: 4 }, (_, index) => ({ key: `human-${index}`, name: `真人 ${index + 1}` }));

function fixture(t, plugin = game) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'terrorscape-bot-rooms-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('terrorscape-bot-rooms-'));
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  const plugins = new Map([['terrorscape', plugin]]);
  let service = new RoomService(new JsonStore(directory), plugins);
  let sequence = 0;
  return {
    get service() { return service; },
    create(capacity, options = {}) {
      return service.create(humans[0], { gameId: 'terrorscape', capacity, options, requestId: `bot-room-create-${sequence++}` }).room;
    },
    command(room, user, type, payload = {}) {
      const body = { requestId: `bot-room-command-${sequence++}`, expectedVersion: room.version, ...payload };
      return { ...service.mutate(room.id, user, type, body), body };
    },
    populate(room, count) {
      for (const user of humans.slice(1, count)) {
        room = this.command(room, user, 'join').room;
        room = this.command(room, user, 'ready', { ready: true }).room;
      }
      return room;
    },
    reload() {
      service = new RoomService(new JsonStore(directory), plugins);
      return service;
    },
  };
}

for (const capacity of [2, 3, 4]) {
  for (const killerSeat of ['first', 'last']) {
    test(`Terrorscape one human fills ${capacity} seats with killer ${killerSeat} and pauses at a human decision`, t => {
      const f = fixture(t);
      const created = f.create(capacity, { killerSeat });
      const started = f.command(created, humans[0], 'start', { fillBots: true });
      const saved = f.service.find(created.id);
      const bots = saved.players.filter(p => p.isBot);
      const hostId = saved.hostPlayerId;
      assert.equal(saved.players.length, capacity);
      assert.equal(bots.length, capacity - 1);
      assert.ok(saved.players.every(p => p.ready));
      assert.ok(bots.every(p => !p.accountId && p.id !== hostId));
      assert.equal(new Set(saved.players.map(p => p.id)).size, capacity);
      assert.equal(saved.game.survivors.length, 3);
      assert.equal(saved.game.currentPlayerId, hostId);
      assert.ok(game.getLegalActions(saved.game, hostId).length);
      assert.equal(saved.game.killer.ownerId, killerSeat === 'first' ? hostId : saved.players[capacity - 1].id);
      assert.equal(saved.status, 'playing');

      // A timed-out start is replayed with exactly the same seats and bot moves.
      const snapshot = JSON.stringify(saved);
      const replay = f.service.mutate(created.id, humans[0], 'start', started.body);
      assert.equal(replay.replayed, true);
      assert.equal(replay.appliedVersion, started.appliedVersion);
      assert.deepEqual(replay.room, started.room);
      assert.equal(JSON.stringify(f.service.find(created.id)), snapshot);
      const restored = f.reload();
      assert.deepEqual(restored.view(restored.find(created.id), humans[0]), started.room);
    });
  }
}

test('Terrorscape one-human default fills vacant seats, while explicit no-fill rejects atomically', t => {
  const f = fixture(t);
  let room = f.create(4);
  const before = JSON.stringify(f.service.find(room.id));
  assert.throws(() => f.command(room, humans[0], 'start', { fillBots: false }), { code: 'NOT_ENOUGH_PLAYERS', status: 409 });
  assert.equal(JSON.stringify(f.service.find(room.id)), before);
  for (const fillBots of ['true', 1, null]) {
    assert.throws(() => f.command(room, humans[0], 'start', { fillBots }), { code: 'INVALID_INPUT', status: 400 });
    assert.equal(JSON.stringify(f.service.find(room.id)), before);
  }
  room = f.command(room, humans[0], 'start').room;
  assert.equal(room.players.length, 4);
  assert.equal(f.service.find(room.id).players.filter(p => p.isBot).length, 3);
});

test('Terrorscape filling never overrides a human readiness decision and failed starts add no bots', t => {
  const f = fixture(t);
  let room = f.create(4);
  room = f.command(room, humans[1], 'join').room;
  const before = JSON.stringify(f.service.find(room.id));
  assert.throws(() => f.command(room, humans[0], 'start', { fillBots: true }), { code: 'PLAYERS_NOT_READY', status: 409 });
  assert.equal(JSON.stringify(f.service.find(room.id)), before);
  assert.equal(f.service.find(room.id).players.length, 2);
  assert.throws(() => f.command(room, humans[1], 'start', { fillBots: true }), { code: 'HOST_ONLY', status: 403 });
  assert.equal(JSON.stringify(f.service.find(room.id)), before);
  room = f.command(room, humans[1], 'ready', { ready: true }).room;
  room = f.command(room, humans[0], 'start', { fillBots: true }).room;
  assert.equal(room.players.length, 4);
  assert.equal(f.service.find(room.id).players.filter(p => p.isBot).length, 2);
});

test('Terrorscape two ready humans can start below capacity without filling and retain three survivor tokens', t => {
  const f = fixture(t);
  let room = f.populate(f.create(4), 2);
  room = f.command(room, humans[0], 'start', { fillBots: false }).room;
  const saved = f.service.find(room.id);
  assert.equal(saved.players.length, 2);
  assert.ok(saved.players.every(p => !p.isBot));
  assert.equal(saved.game.survivors.length, 3);
  assert.ok(saved.game.survivors.every(p => p.ownerId === saved.hostPlayerId));
  assert.equal(saved.game.killer.ownerId, saved.players[1].id);
});

test('Terrorscape room automation calls bots only with their own clipped view and latest legal actions', t => {
  const observed = new Set();
  const plugin = {
    ...game,
    chooseBotAction(view, legal) {
      observed.add(view.viewerSide);
      for (const hidden of ['rngState', 'discoverDeck', 'searchDeck', 'seed']) assert.ok(!(hidden in view));
      assert.deepEqual(legal, view.legalActions);
      if (view.viewerSide === 'killer') {
        assert.ok(view.survivors.every(p => p.roomId === null && p.inventory === null));
        assert.equal(view.radio.progress, null);
        assert.ok(view.events.every(event => event.type !== 'items-found' && event.type !== 'survivor-moved'));
      } else {
        assert.equal(view.viewerSide, 'survivors');
        assert.ok(view.survivors.every(p => p.roomId && Array.isArray(p.inventory)));
        assert.ok(!('hand' in view.killer) && !('deckCount' in view.killer));
      }
      const snapshot = JSON.stringify(view);
      const action = game.chooseBotAction(view, legal);
      assert.equal(JSON.stringify(view), snapshot);
      assert.ok(legal.includes(action));
      return action;
    },
  };
  const f = fixture(t, plugin);
  for (const killerSeat of ['first', 'last']) {
    let room = f.create(4, { killerSeat });
    room = f.command(room, humans[0], 'start', { fillBots: true }).room;
    for (let step = 0; step < 6 && room.status !== 'finished'; step++) {
      const saved = f.service.find(room.id);
      const action = game.chooseBotAction(game.getView(saved.game, saved.hostPlayerId));
      assert.ok(action);
      room = f.command(room, humans[0], 'actions', { action }).room;
    }
  }
  assert.deepEqual([...observed].sort(), ['killer', 'survivors']);
});

for (const realPlayers of [1, 2, 3]) {
  for (const killerSeat of ['first', 'last']) {
    test(`Terrorscape ${realPlayers} humans plus vacant-seat bots, killer ${killerSeat}: room reaches and persists a terminal result`, t => {
      const f = fixture(t);
      let room = f.populate(f.create(4, { killerSeat }), realPlayers);
      room = f.command(room, humans[0], 'start', { fillBots: true }).room;
      assert.equal(f.service.find(room.id).players.filter(p => p.isBot).length, 4 - realPlayers);
      let steps = 0;
      for (; steps < 200 && room.status !== 'finished'; steps++) {
        const saved = f.service.find(room.id);
        const seat = saved.players.find(p => p.id === saved.game.currentPlayerId);
        assert.ok(seat && !seat.isBot, 'automatic sequence must pause at a real seat');
        const user = humans.find(user => saved.players.find(p => p.accountId === user.key)?.id === seat.id);
        assert.ok(user);
        const view = f.service.view(saved, user);
        const action = game.chooseBotAction(view.game, view.game.legalActions);
        assert.ok(action, 'a paused human decision must have legal continuation');
        const previousVersion = room.version;
        const applied = f.command(room, user, 'actions', { action });
        room = applied.room;
        assert.equal(room.version, previousVersion + 1, 'bot replies are part of one human command version');

        const snapshot = JSON.stringify(f.service.find(room.id));
        const retry = f.service.mutate(room.id, user, 'actions', applied.body);
        assert.equal(retry.replayed, true);
        assert.equal(retry.appliedVersion, applied.appliedVersion);
        assert.deepEqual(retry.room, room);
        assert.equal(JSON.stringify(f.service.find(room.id)), snapshot);
        if (steps % 7 === 0) {
          f.reload();
          assert.deepEqual(f.service.view(f.service.find(room.id), user), room);
        }
      }
      assert.equal(room.status, 'finished', `must finish after ${steps} human commands`);
      const saved = f.service.find(room.id);
      assert.equal(saved.game.phase, 'finished');
      assert.ok(saved.game.result.winnerIds.length);
      assert.ok(['killer', 'survivors'].includes(saved.game.result.winningTeam));
      const restored = f.reload();
      const final = restored.view(restored.find(room.id), humans[0]);
      assert.equal(final.status, 'finished');
      assert.deepEqual(final.game.result, saved.game.result);
      assert.deepEqual(final.game.legalActions, []);
      assert.throws(() => f.command(final, humans[0], 'actions', { action: { type: 'endTurn' } }), { code: 'GAME_NOT_RUNNING', status: 409 });
    });
  }
}
