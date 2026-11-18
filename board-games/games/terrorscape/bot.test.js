"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const game = require("./index");

const players = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `玩家${index}`,
  }));
const create = (options = {}, count = 2, seed = "bot-fixture") =>
  game.createGame({ players: players(count), options, seed });

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
}

function choose(state, playerId = state.currentPlayerId) {
  const view = freeze(game.getView(state, playerId));
  const legal = freeze(game.getLegalActions(state, playerId));
  const before = JSON.stringify({ view, legal });
  const action = game.chooseBotAction(view, legal);
  assert.ok(
    legal.includes(action),
    `${view.phase}: must return one of this seat's latest legal objects`,
  );
  assert.equal(
    JSON.stringify({ view, legal }),
    before,
    "projected view and legal actions remain unchanged",
  );
  return action;
}

test("bot API returns null when a seat has no actions or is spectating", () => {
  assert.equal(game.chooseBotAction(null, []), null);
  const state = create();
  assert.equal(
    game.chooseBotAction(game.getView(state, state.killer.ownerId)),
    null,
  );
  assert.equal(game.chooseBotAction(game.getView(state, "spectator")), null);
});

test("hunter choice depends on its projected information rather than hidden survivor locations or decks", () => {
  const state = create();
  state.phase = "killer";
  state.currentSide = "killer";
  state.currentPlayerId = state.killer.ownerId;
  const other = JSON.parse(JSON.stringify(state));
  other.survivors[0].roomId = "G2";
  other.survivors[1].inventory.push("revolver");
  other.radio.progress = 4;
  other.discoverDeck.reverse();
  other.searchDeck.reverse();
  other.rngState = 123456;
  assert.deepEqual(
    game.getView(state, state.killer.ownerId),
    game.getView(other, other.killer.ownerId),
  );
  assert.deepEqual(choose(state), choose(other));
});

test("survivor discovery keeps a needed key and discards a less useful item from a full inventory", () => {
  let state = create();
  const p = state.survivors[0];
  state.phase = "chooseItem";
  state.currentPlayerId = p.ownerId;
  state.choice = {
    survivorId: p.id,
    cards: ["limestone", "key"],
    stage: "select",
    resume: "killer",
  };
  const take = choose(state);
  assert.equal(take.index, 1);
  state = game.applyAction(state, p.ownerId, take);
  assert.equal(state.keys, 1);

  const next = state.survivors[0];
  next.inventory = ["toolbox", "revolver", "first-aid", "whiskey"];
  state.phase = "chooseItem";
  state.choice = {
    survivorId: next.id,
    cards: [],
    stage: "discard",
    resume: "survivors",
  };
  state.currentPlayerId = next.ownerId;
  const discard = choose(state);
  assert.equal(next.inventory[discard.index], "whiskey");
  const after = game.applyAction(state, next.ownerId, discard);
  assert.equal(after.survivors[0].inventory.length, 3);
});

test("survivor bot repairs with a toolbox and spends healing or fear remedies usefully", () => {
  let state = create();
  const p = state.survivors[0];
  p.roomId = "B1";
  p.inventory = ["toolbox"];
  let action = choose(state, p.ownerId);
  assert.equal(action.type, "repair");
  assert.equal(action.itemId, "toolbox");
  state = game.applyAction(state, p.ownerId, action);
  assert.equal(state.radio.progress, 2);

  state = create();
  state.survivors[0].health = 1;
  action = choose(state, state.survivors[2].ownerId);
  assert.equal(action.type, "heal");
  state = game.applyAction(state, state.survivors[2].ownerId, action);
  assert.equal(state.survivors[0].health, 2);

  state = create();
  state.survivors[0].fear = 2;
  state.survivors[0].inventory = ["energy-drink"];
  action = choose(state, state.survivors[0].ownerId);
  assert.equal(action.type, "useItem");
  assert.equal(action.itemId, "energy-drink");
  state = game.applyAction(state, state.survivors[0].ownerId, action);
  assert.equal(state.survivors[0].fear, 0);
});

test("survivor bot chooses defensive equipment and a legal escape after an encounter", () => {
  let state = create();
  const p = state.survivors[0];
  p.health = 1;
  p.fear = 2;
  p.inventory = ["revolver", "ammo", "limestone"];
  state.phase = "encounter";
  state.encounter = {
    roomId: p.roomId,
    remainingIds: [p.id],
    allIds: [p.id],
    stage: "defend",
    strength: 7,
  };
  state.currentPlayerId = p.ownerId;
  const defense = choose(state);
  assert.equal(defense.type, "defend");
  assert.equal(defense.itemId, "revolver");
  assert.equal(defense.ammo, true);

  state = create();
  state.phase = "flee";
  state.killer.roomId = "R1";
  state.flee = { roomId: "R1", remainingIds: [state.survivors[0].id] };
  state.currentPlayerId = state.survivors[0].ownerId;
  const flee = choose(state);
  assert.equal(flee.type, "flee");
  assert.notEqual(flee.roomId, "R1");
  assert.doesNotThrow(() =>
    game.applyAction(state, state.currentPlayerId, flee),
  );
});

test("bot gathers a key-ready team at an exit instead of cycling free item exchanges", () => {
  let state = create();
  state.keys = 5;
  state.survivors.forEach((p) => {
    p.inventory = ["whiskey"];
  });
  for (let step = 0; step < 30 && state.phase !== "finished"; step++) {
    const id = state.currentPlayerId;
    const action = choose(state, id);
    assert.notEqual(action.type, "giveItem");
    state = game.applyAction(state, id, action);
  }
  assert.equal(state.phase, "finished");
  assert.equal(state.result.winningTeam, "survivors");
  assert.equal(state.result.reason, "main-exit");
});

for (const count of [2, 3, 4]) {
  for (const killerSeat of ["first", "last"]) {
    for (const survivorIds of [
      ["william", "anna", "marco"],
      ["johnson", "sophia", "anna"],
    ]) {
      test(`${count} seats, killer ${killerSeat}, ${survivorIds.join("/")}: projected bots play a bounded full game`, () => {
        let state = create(
          { killerSeat, survivorIds },
          count,
          `bot-${count}${killerSeat}-${survivorIds.join()}`,
        );
        let steps = 0;
        for (; steps < 500 && state.phase !== "finished"; steps++) {
          const id = state.currentPlayerId;
          const action = choose(state, id);
          assert.notEqual(action.type, "giveItem");
          state = game.applyAction(state, id, action);
          // Exercise the exact JSON persistence boundary used by the server.
          state = JSON.parse(JSON.stringify(state));
        }
        assert.equal(
          state.phase,
          "finished",
          `no decision loop after ${steps} steps`,
        );
        assert.ok(["killer", "survivors"].includes(state.result.winningTeam));
        assert.ok(state.result.winnerIds.length);
      });
    }
  }
}
