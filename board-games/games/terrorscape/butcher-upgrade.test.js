"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const game = require("./index");
const {
  chooseHunterAction,
} = require("../../../apps/site/public/board-games/terrorscape/hunter.js");

function make() {
  const s = game.createGame({
    players: [
      { id: "s", name: "Survivors" },
      { id: "k", name: "Killer" },
    ],
    seed: "butcher-upgrade",
  });
  s.phase = "killer";
  s.currentSide = "killer";
  s.currentPlayerId = "k";
  return s;
}
const copies = (s) =>
  [...s.killer.hand, ...s.killer.deck, ...s.killer.discard].filter(
    (id) => id === "brutal-rage",
  ).length;
function act(s, type, predicate = () => true, playerId = "k") {
  const action = game
    .getLegalActions(s, playerId)
    .find((a) => a.type === type && predicate(a));
  assert.ok(action, `expected legal ${type}`);
  const before = JSON.stringify(s);
  const next = game.applyAction(s, playerId, action);
  assert.equal(JSON.stringify(s), before);
  return next;
}
function readyRage() {
  const s = make();
  s.killer.level = 3;
  s.killer.hand = ["brutal-rage", "pursue", "rage"];
  return act(s, "playSkill", (a) => a.skillId === "brutal-rage");
}

test("Butcher ultimate is locked out of initial composition and unlocks on the actual transition to level three", () => {
  const original = make();
  assert.equal(copies(original), 0);
  assert.equal(
    game.getCatalog().killers.find((k) => k.id === "butcher")
      .startingDeckCounts["brutal-rage"],
    undefined,
  );
  original.killer.level = 2;
  original.killer.deck = [];
  original.killer.discard = ["sense", "pursue", "terror", "rage"];
  original.killer.hand = ["sense", "pursue", "barricade", "chainsaw", "rage"];
  const next = act(original, "endTurn");
  assert.equal(next.killer.level, 3);
  assert.equal(copies(next), 1);
  assert.equal(next.killer.hand.length, 5);
  assert.equal(
    next.killer.hand[0],
    "pursue",
    "leftmost old card is replaced deterministically",
  );
  assert.ok(next.killer.hand.includes("brutal-rage"));
  assert.deepEqual(next.killer.unlockedSkills, ["brutal-rage"]);
  assert.ok(next.events.some((e) => e.type === "skill-unlocked"));
  assert.ok(
    !game.getView(next, "s").events.some((e) => e.type === "unlock-overflow"),
  );
  assert.ok(
    game
      .getView(next, "k")
      .events.some((e) => e.type === "unlock-overflow" && e.cardId === "sense"),
  );
});

test("old level-three saves receive one ultimate on next draw without rebuilding their deck order", () => {
  const original = make();
  original.killer.level = 3;
  original.killer.deck = [
    "terror",
    "sense",
    "pursue",
    "barricade",
    "rage",
    "chainsaw",
  ];
  const next = act(original, "endTurn");
  assert.equal(copies(next), 1);
  assert.deepEqual(next.killer.deck, original.killer.deck.slice(3));
  assert.deepEqual(next.killer.unlockedSkills, ["brutal-rage"]);
  next.phase = "killer";
  next.currentSide = "killer";
  next.currentPlayerId = "k";
  const again = act(next, "endTurn");
  assert.equal(copies(again), 1);

  const existing = make();
  existing.killer.level = 4;
  existing.killer.discard.push("brutal-rage");
  assert.equal(
    copies(act(existing, "endTurn")),
    1,
    "an ultimate already in a legacy pile is not duplicated",
  );
});

test("level-five deck cycles do not trigger a repeated level-up or duplicate unlock", () => {
  let s = make();
  s.killer.level = 5;
  s.killer.unlockedSkills = ["brutal-rage"];
  s.killer.hand = ["brutal-rage", "sense", "pursue", "terror", "rage"];
  s.killer.deck = [];
  s.killer.discard = ["sense", "pursue", "barricade", "chainsaw"];
  for (let i = 0; i < 4; i++) {
    s.phase = "killer";
    s.currentSide = "killer";
    s.currentPlayerId = "k";
    s = act(s, "endTurn");
  }
  assert.equal(s.killer.level, 5);
  assert.equal(copies(s), 1);
  assert.ok(
    !s.events.some((e) => e.type === "level-up" || e.type === "skill-unlocked"),
  );
});

test("rampage publicly breaches one or two steps, searches, and repeats only after removing a block", () => {
  let s = readyRage();
  s.blocks = [
    ["G5", "B4"],
    ["B4", "B3"],
    ["B3", "B2"],
  ];
  s = act(
    s,
    "brutalRageMove",
    (a) => JSON.stringify(a.path) === JSON.stringify(["B4", "B3"]),
  );
  assert.equal(s.killer.roomId, "B3");
  assert.equal(s.killer.brutalRage.segments, 1);
  assert.deepEqual(s.blocks, [["B3", "B2"]]);
  assert.equal(s.currentPlayerId, "k");
  assert.equal(s.phase, "killer");
  assert.ok(
    game
      .getLegalActions(s, "k")
      .every((a) => ["brutalRageMove", "endBrutalRage"].includes(a.type)),
  );
  s = JSON.parse(JSON.stringify(s));
  s = act(
    s,
    "brutalRageMove",
    (a) => a.path.length === 1 && a.path[0] === "B2",
  );
  assert.equal(s.killer.brutalRage.segments, 2);
  s = act(
    s,
    "brutalRageMove",
    (a) => a.path.length === 1 && a.path[0] === "B1",
  );
  assert.equal(s.round, 2);
  assert.equal(s.phase, "survivors");
  assert.equal(s.killer.brutalRage, undefined);
  assert.equal(s.events.filter((e) => e.type === "killer-searched").length, 3);
});

test("rampage encounter immediately interrupts the chain and retains existing attack/defend/flee flow", () => {
  let s = readyRage();
  s.blocks = [["G5", "B4"]];
  s.survivors[0].roomId = "B4";
  s = act(
    s,
    "brutalRageMove",
    (a) => a.path.length === 1 && a.path[0] === "B4",
  );
  assert.equal(s.phase, "encounter");
  assert.equal(s.killer.brutalRage, undefined);
  assert.ok(
    !game.getLegalActions(s, "k").some((a) => a.type === "brutalRageMove"),
  );
  s = act(s, "playSkill", (a) => a.skillId === "rage");
  assert.equal(s.encounter.stage, "defend");
  s = act(s, "defend", () => true, "s");
  assert.equal(s.phase, "flee");
  s = act(s, "flee", () => true, "s");
  assert.equal(s.phase, "survivors");
  assert.equal(s.round, 2);
});

test("rampage ownership, paths and voluntary stop are validated by the current legal list", () => {
  const s = readyRage();
  assert.deepEqual(game.getLegalActions(s, "s"), []);
  assert.throws(
    () => game.applyAction(s, "s", { type: "brutalRageMove", path: ["B4"] }),
    { code: "ILLEGAL_ACTION" },
  );
  assert.throws(
    () => game.applyAction(s, "k", { type: "brutalRageMove", path: ["R1"] }),
    { code: "ILLEGAL_ACTION" },
  );
  assert.throws(
    () =>
      game.applyAction(s, "k", {
        type: "brutalRageMove",
        path: ["B4", "B3", "B2"],
      }),
    { code: "ILLEGAL_ACTION" },
  );
  assert.equal(act(s, "endBrutalRage").phase, "survivors");
});

test("hunter and server bots resolve rampage using only noise, public barricades and projected search history", () => {
  let s = readyRage();
  s.blocks = [["G5", "B4"]];
  s.noise = ["B3"];
  s.publicNoise = ["B3"];
  const other = JSON.parse(JSON.stringify(s));
  other.survivors[0].roomId = "G2";
  const view = game.getView(s, "k"),
    otherView = game.getView(other, "k");
  assert.deepEqual(view, otherView);
  const local = chooseHunterAction(view, game.getCatalog(), () => 0.2);
  assert.equal(local.type, "brutalRageMove");
  assert.equal(local.path.at(-1), "B3");
  assert.deepEqual(game.chooseBotAction(view), game.chooseBotAction(otherView));
  for (
    let steps = 0;
    s.phase === "killer" && s.killer.brutalRage && steps < 9;
    steps++
  ) {
    const projected = game.getView(s, "k");
    const action = game.chooseBotAction(projected);
    assert.ok(projected.legalActions.includes(action));
    s = game.applyAction(s, "k", action);
  }
  assert.ok(
    !s.killer.brutalRage,
    "every continuation consumes a finite public block",
  );
});

test("subsequent defenders retain the Queen multi-unit encounter strength", () => {
  let s = game.createGame({
    players: [
      { id: "s", name: "S" },
      { id: "k", name: "K" },
    ],
    options: { killerId: "queen" },
    seed: "queen-strength-reset",
  });
  s.phase = "encounter";
  s.currentSide = "survivors";
  s.currentPlayerId = "s";
  s.killer.roomId = "R1";
  s.killer.level = 4;
  s.killer.strength = 4;
  s.killer.zombies.forEach((z) => {
    z.roomId = "R1";
  });
  s.survivors[0].fear = 2;
  s.survivors[0].inventory = [];
  s.encounter = {
    roomId: "R1",
    remainingIds: s.survivors.map((p) => p.id),
    allIds: s.survivors.map((p) => p.id),
    stage: "defend",
    strength: 12,
  };
  s = act(s, "defend", (a) => a.survivorId === s.survivors[0].id, "s");
  assert.equal(s.encounter.stage, "attack");
  assert.equal(s.encounter.strength, 12);
});
