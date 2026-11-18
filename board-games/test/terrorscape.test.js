'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { JsonStore } = require('../lib/store');
const { RoomService } = require('../lib/rooms');
const { plugins } = require('../registry');
const { createBoardGamesHandler } = require('../server');
const game = require('../games/terrorscape');

const users = ['killer', 'alice', 'bob', 'carol'].map(key => ({ key, name: key }));
const seats = users.map(({ key, name }) => ({ id: key, name }));
function directory(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrorscape-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('terrorscape-test-'));
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  return dir;
}
function command(service, room, user, type, body = {}) {
  return service.mutate(room.id, user, type, {
    requestId: `${type}-${room.version}-terrorscape`, expectedVersion: room.version, ...body
  });
}
function start(service, count) {
  let room = service.create(users[0], { gameId: 'terrorscape', capacity: count, requestId: `create-terrorscape-${count}` }).room;
  for (const user of users.slice(1, count)) room = command(service, room, user, 'join').room;
  for (const user of users.slice(0, count)) room = command(service, room, user, 'ready', { ready: true }).room;
  return command(service, room, users[0], 'start').room;
}

test('Terrorscape plugin registration and public catalog satisfy the common service contract', () => {
  assert.equal(plugins.get('terrorscape'), game);
  assert.equal(game.manifest.minPlayers, 2);
  assert.equal(game.manifest.maxPlayers, 4);
  const catalog = game.getCatalog();
  assert.equal(catalog.rooms.length, 15);
  assert.equal(catalog.rooms.find(r => r.id === 'R3').englishName, 'Hallway');
  assert.equal(catalog.rooms.find(r => r.id === 'R5').englishName, 'Library');
  assert.equal(catalog.manifest.id, 'terrorscape');
  assert.deepEqual(JSON.parse(JSON.stringify(catalog)), catalog);
  assert.throws(() => game.validateOptions({ seed: 'public-seed' }), { code: 'INVALID_OPTIONS' });
  assert.deepEqual(game.createGame({ players: seats, seed: 'deterministic' }), game.createGame({ players: seats, seed: 'deterministic' }));
});

test('Terrorscape killer seat configuration preserves defaults and explicit player priority', () => {
  const defaults = game.validateOptions({});
  assert.deepEqual(game.validateOptions({ killerSeat: 'last' }), defaults);
  assert.deepEqual(game.validateOptions({ killerSeat: 'first' }), { ...defaults, killerSeat: 'first' });
  for (const killerSeat of [null, '', 'middle', 0, ['first']]) {
    assert.throws(() => game.validateOptions({ killerSeat }), { code: 'INVALID_OPTIONS', status: 400 });
  }
  for (const count of [2, 3, 4]) {
    const players = seats.slice(0, count);
    const create = options => game.createGame({ players, options, seed: 'killer-seat-config' });
    assert.equal(create({}).killer.ownerId, players[count - 1].id);
    assert.equal(create({ killerSeat: 'last' }).killer.ownerId, players[count - 1].id);
    const first = create({ killerSeat: 'first' });
    assert.equal(first.killer.ownerId, players[0].id);
    assert.ok(first.survivors.every(p => p.ownerId !== players[0].id));
    assert.equal(create({ killerSeat: 'first', killerPlayerId: players[count - 1].id }).killer.ownerId, players[count - 1].id);
  }
});

test('Terrorscape mansion search sites and secret passages match the publisher v2 map on pages 7 and 9', () => {
  const catalog = game.getCatalog();
  assert.deepEqual(catalog.rooms.filter(r => r.search).map(r => r.id).sort(), ['B4', 'G4', 'R2']);
  const edgeIds = edges => edges.map(edge => edge.slice().sort().join(':')).sort();
  assert.deepEqual(edgeIds(catalog.edges), edgeIds([
    ['B1', 'B2'], ['B2', 'B3'], ['B3', 'B4'], ['B4', 'G5'], ['B2', 'B5'], ['R3', 'B5'], ['R4', 'B5'],
    ['R1', 'B1'], ['R1', 'B2'], ['R1', 'R3'], ['R1', 'R2'], ['R2', 'R3'], ['R2', 'R5'], ['R4', 'R5'],
    ['R5', 'G4'], ['R2', 'G1'], ['G4', 'G5'], ['G1', 'G2'], ['G2', 'G3'], ['G3', 'G5']
  ]));
  let state = game.createGame({ players: seats });
  const p = state.survivors[0];
  p.inventory.push('flashlight');
  for (const [from, to] of [['B1', 'G2'], ['G2', 'B1'], ['B5', 'G5'], ['G5', 'B5']]) {
    p.roomId = from;
    const passages = game.getLegalActions(state, p.ownerId).filter(a => a.type === 'passage');
    assert.deepEqual(passages.map(a => a.roomId), [to], `secret passage from ${from}`);
  }
  for (const id of ['R2', 'G4']) {
    p.roomId = id;
    assert.ok(!game.getLegalActions(state, p.ownerId).some(a => a.type === 'passage'));
  }
});

for (const count of [2, 3, 4]) test(`Terrorscape ${count} accounts control exactly one killer and all three survivors`, () => {
  const players = seats.slice(0, count);
  const state = game.createGame({ players, seed: 'ownership-contract' });
  assert.equal(state.survivors.length, 3);
  assert.ok(players.some(p => p.id === state.killer.ownerId));
  assert.ok(state.survivors.every(s => players.some(p => p.id === s.ownerId) && s.ownerId !== state.killer.ownerId));
  assert.deepEqual(new Set(state.survivors.map(s => s.ownerId)), new Set(players.filter(p => p.id !== state.killer.ownerId).map(p => p.id)));
  assert.deepEqual(game.getLegalActions(state, 'outsider'), []);
  assert.throws(() => game.applyAction(state, 'outsider', { type: 'endTurn' }));
});

test('Terrorscape private projections and legal submissions cannot mutate or expose the authoritative state', () => {
  const state = game.createGame({ players: seats, seed: 'private-contract' });
  const before = JSON.stringify(state);
  const killerView = game.getView(state, state.killer.ownerId);
  assert.ok(killerView.survivors.every(s => s.roomId == null && s.inventory == null));
  assert.equal(killerView.radio.progress, null);
  for (const p of seats) {
    const view = game.getView(state, p.id);
    assert.equal(view.seed, undefined);
    assert.equal(view.rngState, undefined);
    assert.equal(view.discoverDeck, undefined);
    assert.equal(view.searchDeck, undefined);
    if (p.id !== state.killer.ownerId) assert.ok(view.survivors.every(s => typeof s.roomId === 'string'));
    const legal = game.getLegalActions(state, p.id);
    for (const action of legal.slice(0, 5)) {
      const next = game.applyAction(state, p.id, action);
      assert.notEqual(next, state);
      assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
      assert.equal(JSON.stringify(state), before);
    }
    if (view.survivors[0]) view.survivors[0].health = 999;
    legal.push({ type: 'forged' });
    assert.equal(JSON.stringify(state), before);
  }
  assert.throws(() => game.applyAction(state, state.killer.ownerId, { type: 'killerMove', roomId: 'FORGED' }));
  assert.equal(JSON.stringify(state), before);
});

function killerEndingState() {
  const state = game.createGame({ players: seats });
  state.phase = 'killer';
  state.killer.actionsRemaining = 0;
  state.currentPlayerId = state.killer.ownerId;
  return state;
}
function endKiller(state) {
  const action = game.getLegalActions(state, state.killer.ownerId).find(a => a.type === 'endTurn');
  assert.ok(action, 'killer can end its completed turn');
  return game.applyAction(state, state.killer.ownerId, action);
}

test('Terrorscape five keys require all survivors at an exit and terminate on a legal phase transition', () => {
  let state = killerEndingState();
  state.keys = 5;
  state.survivors.forEach(s => { s.roomId = 'R1'; });
  const next = endKiller(state);
  assert.equal(next.phase, 'finished');
  assert.ok(next.result);
  for (const p of seats) assert.deepEqual(game.getLegalActions(next, p.id), []);
  assert.throws(() => game.applyAction(next, next.killer.ownerId, { type: 'endTurn' }));
  state = killerEndingState();
  state.keys = 5;
  state.survivors[0].roomId = 'B1';
  assert.notEqual(endKiller(state).phase, 'finished');
});

test('Terrorscape radio countdown survives JSON reload and resolves rescue before the next round', () => {
  const state = killerEndingState();
  state.radio.progress = 5;
  state.radio.rescueRemaining = 1;
  state.radio.repairedRound = state.round - 1;
  const next = endKiller(JSON.parse(JSON.stringify(state)));
  assert.equal(next.phase, 'finished');
  assert.equal(next.radio.rescueRemaining, 0);
  assert.ok(next.result);
});

test('Terrorscape radio repair is once per round and its new noise stays hidden until the killer turn', () => {
  let state = game.createGame({ players: seats });
  const a = state.survivors[0], b = state.survivors[1];
  a.roomId = b.roomId = 'B1';
  state = game.applyAction(state, a.ownerId, { type: 'repair', survivorId: a.id });
  assert.equal(state.radio.progress, 1);
  assert.ok(state.noise.includes('B1'));
  assert.ok(!game.getView(state, state.killer.ownerId).noise.includes('B1'));
  assert.ok(!game.getLegalActions(state, b.ownerId).some(action => action.type === 'repair'));
  assert.throws(() => game.applyAction(state, a.ownerId, { type: 'rest', survivorId: b.id }), { code: 'ILLEGAL_ACTION' });
});

test('Terrorscape William sprints three steps with destination noise and Marco consumes his starting medical kit', () => {
  let state = game.createGame({ players: seats });
  const william = state.survivors.find(p => p.id === 'william');
  const action = game.getLegalActions(state, william.ownerId).find(a => a.type === 'sprint' && a.path.length === 3);
  assert.ok(action);
  state = game.applyAction(state, william.ownerId, action);
  assert.equal(state.survivors.find(p => p.id === william.id).roomId, action.path[2]);
  assert.ok(state.noise.includes(action.path[2]));
  assert.ok(!game.getView(state, state.killer.ownerId).noise.includes(action.path[2]));
  state = game.createGame({ players: seats });
  const marco = state.survivors.find(p => p.id === 'marco');
  const target = state.survivors.find(p => p.id === 'anna');
  assert.ok(marco.inventory.includes('medical-kit'));
  target.health = 1; target.fear = 2;
  state = game.applyAction(state, marco.ownerId, { type: 'heal', survivorId: marco.id, itemId: 'medical-kit', targetId: target.id });
  assert.equal(state.survivors.find(p => p.id === target.id).health, 2);
  assert.equal(state.survivors.find(p => p.id === target.id).fear, 0);
  assert.ok(!state.survivors.find(p => p.id === marco.id).inventory.includes('medical-kit'));
  assert.ok(state.itemDiscard.includes('medical-kit'));
});

test('Terrorscape hunts switch actor to the killer, then defender, and killing one survivor ends the hunt', () => {
  let state = killerEndingState();
  state.killer.roomId = 'R1';
  state.killer.actionsRemaining = 2;
  state.killer.strength = 100;
  state.survivors[0].health = 1;
  state = game.applyAction(state, state.killer.ownerId, game.getLegalActions(state, state.killer.ownerId).find(a => a.type === 'killerSearch'));
  assert.equal(state.phase, 'encounter');
  assert.equal(state.currentPlayerId, state.killer.ownerId);
  assert.equal(state.currentSide, 'killer');
  state = game.applyAction(state, state.killer.ownerId, { type: 'attack' });
  const defender = state.survivors[0];
  assert.equal(state.currentPlayerId, defender.ownerId);
  state = game.applyAction(state, defender.ownerId, { type: 'defend', survivorId: defender.id });
  assert.equal(state.phase, 'finished');
  assert.equal(state.result.winningTeam, 'killer');
  assert.deepEqual(state.result.winnerIds, [state.killer.ownerId]);
});

test('Terrorscape exhausted discoveries end the game unless rescue has already been called', () => {
  let state = game.createGame({ players: seats });
  state.discoverDeck = [];
  for (const p of state.survivors) state = game.applyAction(state, p.ownerId, { type: 'rest', survivorId: p.id });
  assert.equal(state.phase, 'discover');
  const actor = state.survivors[0];
  const saved = JSON.parse(JSON.stringify(state));
  state = game.applyAction(state, actor.ownerId, { type: 'discover', survivorId: actor.id });
  assert.equal(state.phase, 'finished');
  assert.equal(state.result.winningTeam, 'killer');
  saved.radio.progress = 5;
  saved.radio.rescueRemaining = 3;
  assert.equal(game.applyAction(saved, actor.ownerId, { type: 'discover', survivorId: actor.id }).phase, 'killer');
});

for (const count of [2, 3, 4]) test(`Terrorscape ${count}-account complete games offer a legal continuation through final discovery`, () => {
  let state = game.createGame({ players: seats.slice(0, count), seed: `complete-${count}` });
  const seen = new Set();
  for (let step = 0; step < 500 && state.phase !== 'finished'; step++) {
    seen.add(state.phase);
    const actions = game.getLegalActions(state, state.currentPlayerId);
    assert.ok(actions.length, `no continuation in ${state.phase} for ${state.currentPlayerId}`);
    const action = actions.find(a => a.type === 'rest') || actions.find(a => a.type === 'endTurn') ||
      actions.find(a => a.type === 'chooseItem' && a.index === -1) || actions[0];
    const before = JSON.stringify(state);
    const next = game.applyAction(state, state.currentPlayerId, action);
    assert.equal(JSON.stringify(state), before);
    state = JSON.parse(JSON.stringify(next));
  }
  assert.equal(state.phase, 'finished');
  assert.equal(state.result.winningTeam, 'killer');
  assert.ok(seen.has('discover') && seen.has('chooseItem') && seen.has('killer'));
});

for (const count of [2, 3, 4]) test(`Terrorscape ${count}-account rooms persist seats, legal actions and private refreshes`, t => {
  const dir = directory(t);
  const service = new RoomService(new JsonStore(dir), plugins);
  let room = start(service, count);
  assert.equal(room.status, 'playing');
  assert.equal(room.players.length, count);
  const state = service.find(room.id).game;
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  const before = JSON.stringify(service.store.state);
  assert.throws(() => service.view(service.find(room.id), { key: 'outsider' }), { code: 'NOT_A_MEMBER' });
  assert.throws(() => command(service, room, { key: 'outsider' }, 'actions', { action: { type: 'endTurn' } }), { code: 'NOT_A_MEMBER' });
  assert.equal(JSON.stringify(service.store.state), before);
  const restored = new RoomService(new JsonStore(dir), plugins);
  for (const user of users.slice(0, count)) {
    const view = service.view(service.find(room.id), user);
    assert.deepEqual(restored.view(restored.find(room.id), user), view);
    assert.equal(JSON.stringify(view).includes('accountId'), false);
    assert.ok(view.players.some(p => p.id === view.viewerPlayerId));
  }
  const actor = users.slice(0, count).find(user => service.view(service.find(room.id), user).legalActions.length);
  assert.ok(actor, 'a player must be able to continue');
  room = service.view(service.find(room.id), actor);
  const body = { requestId: 'action-terrorscape-once', expectedVersion: room.version, action: room.legalActions[0] };
  const next = service.mutate(room.id, actor, 'actions', body);
  assert.equal(next.room.version, room.version + 1);
  assert.equal(service.mutate(room.id, actor, 'actions', body).replayed, true);
  assert.throws(() => service.mutate(room.id, actor, 'actions', { ...body, requestId: 'action-terrorscape-stale' }), { code: 'VERSION_CONFLICT' });
  const after = service.view(service.find(room.id), actor);
  assert.deepEqual(new RoomService(new JsonStore(dir), plugins).view(service.find(room.id), actor), after);
});

test('Terrorscape a completed rescue persists finished room status and rejects further room actions', t => {
  const dir = directory(t);
  const service = new RoomService(new JsonStore(dir), plugins);
  let room = start(service, 2);
  const stored = JSON.parse(JSON.stringify(service.find(room.id)));
  stored.game.phase = 'killer';
  stored.game.currentSide = 'killer';
  stored.game.currentPlayerId = stored.game.killer.ownerId;
  stored.game.killer.actionsRemaining = 0;
  stored.game.radio = { progress: 5, rescueRemaining: 1, repairedRound: 1 };
  service.store.commit({ ...service.store.state, rooms: { ...service.store.state.rooms, [room.id]: stored } });
  const actor = users.find(user => stored.players.find(p => p.accountId === user.key)?.id === stored.game.killer.ownerId);
  room = command(service, room, actor, 'actions', { action: { type: 'endTurn' } }).room;
  assert.equal(room.status, 'finished');
  assert.equal(room.game.result.winningTeam, 'survivors');
  assert.deepEqual(room.legalActions, []);
  const restored = new RoomService(new JsonStore(dir), plugins);
  assert.deepEqual(restored.view(restored.find(room.id), actor), room);
  assert.throws(() => command(restored, room, actor, 'actions', { action: { type: 'endTurn' } }), { code: 'GAME_NOT_RUNNING' });
});

test('Terrorscape public HTTP catalog and authenticated rooms work on an isolated server', async t => {
  const dir = directory(t);
  let handler = createBoardGamesHandler({ dataDir: dir, getUser: async req => req.headers['x-test-user'] ? { key: req.headers['x-test-user'], name: '测试玩家' } : null });
  const server = http.createServer(async (req, res) => { if (!await handler(req, res)) { res.writeHead(404); res.end(); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}/api/board-games`;
  const request = async (route, user, body) => {
    const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: {
      'Content-Type': 'application/json', 'X-Board-Games-Request': '1', ...(user ? { 'X-Test-User': user } : {})
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const catalog = await request('/games/terrorscape');
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.game.id, 'terrorscape');
  const created = await request('/rooms', 'host', { gameId: 'terrorscape', capacity: 2, requestId: 'http-terrorscape-create' });
  assert.equal(created.status, 201);
  const room = created.body.room;
  assert.equal((await request('/rooms/' + room.id, 'intruder')).status, 403);
  handler = createBoardGamesHandler({ dataDir: dir, getUser: async req => req.headers['x-test-user'] ? { key: req.headers['x-test-user'], name: '测试玩家' } : null });
  assert.deepEqual((await request('/rooms/' + room.id, 'host')).body.room, room);
});
