"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const game = require("./index");
const added = [
  "george",
  "ophelia",
  "dylan",
  "caleb",
  "roy",
  "evelyn",
  "zach",
  "victoria",
  "quinto",
  "brenda",
  "hubert",
];
const make = (ids, killerId = "butcher", count = 2) =>
  game.createGame({
    players: Array.from({ length: count }, (_, i) => ({
      id: "p" + i,
      name: "P" + i,
    })),
    options: { survivorIds: ids, killerId },
    seed: "survivor-expansion-" + ids.join("-") + killerId,
  });
function act(s, id, type, predicate = () => true) {
  const p = s.survivors.find((p) => p.id === id);
  const action = game
    .getLegalActions(s, p.ownerId)
    .find(
      (a) =>
        a.type === type &&
        (!a.survivorId || a.survivorId === id) &&
        predicate(a),
    );
  assert.ok(action, `${id}: expected legal ${type}`);
  const snapshot = JSON.stringify(s);
  const next = game.applyAction(s, p.ownerId, action);
  assert.equal(JSON.stringify(s), snapshot, "ability is immutable");
  return next;
}
function encounter(s, id, strength = 10) {
  const p = s.survivors.find((p) => p.id === id);
  s.phase = "encounter";
  s.currentSide = "survivors";
  s.currentPlayerId = p.ownerId;
  s.encounter = {
    roomId: p.roomId,
    remainingIds: [id],
    allIds: [id],
    stage: "defend",
    strength,
  };
  return s;
}

test("eleven official expansion/season-two survivors are selectable with source and mansion adaptation metadata", () => {
  const catalog = game.getCatalog();
  for (const id of added) {
    const definition = catalog.characters.find((c) => c.id === id);
    assert.ok(
      definition?.expansion &&
        definition.sourceUrl.startsWith("https://") &&
        definition.adaptation,
    );
    const s = make([id, "william", "anna"]);
    assert.equal(s.survivors[0].id, id);
    const own = game.getView(s, s.survivors[0].ownerId).survivors[0];
    assert.equal(own.inventoryLimit, id === "brenda" ? 4 : 3);
    assert.ok(own.abilityState);
    const enemy = game.getView(s, s.killer.ownerId).survivors[0];
    assert.equal(enemy.abilityState, null);
    delete s.survivors[0].abilityState;
    assert.deepEqual(
      game.getView(s, s.survivors[0].ownerId).survivors[0].abilityState,
      {},
    );
  }
});

test("Ophelia encourages a distant ally privately, and the token cancels one fear only", () => {
  let s = make(["ophelia", "william", "anna"]);
  s.survivors[1].roomId = "G5";
  s.survivors[1].fear = 2;
  s = act(s, "ophelia", "encourage", (a) => a.targetId === "william");
  assert.equal(s.survivors[1].fear, 0);
  assert.equal(s.survivors[1].abilityState.encouragement, true);
  assert.equal(
    game
      .getView(s, s.killer.ownerId)
      .events.some((e) => e.type === "survivor-ability"),
    false,
  );
  s.phase = "killer";
  s.killer.hand = ["terror", "terror"];
  s.killer.stage = "fast";
  s = game.applyAction(
    s,
    s.killer.ownerId,
    game
      .getLegalActions(s, s.killer.ownerId)
      .find((a) => a.skillId === "terror"),
  );
  assert.equal(s.survivors[1].fear, 0);
  assert.equal(s.survivors[1].abilityState.encouragement, false);
  s = game.applyAction(
    s,
    s.killer.ownerId,
    game
      .getLegalActions(s, s.killer.ownerId)
      .find((a) => a.skillId === "terror"),
  );
  assert.equal(s.survivors[1].fear, 1);
});

test("Ophelia returns the unselected search card to the top without its noise", () => {
  let s = make(["ophelia", "william", "anna"]);
  s.survivors[0].roomId = "R2";
  s.searchDeck = ["limestone", "key"];
  s = act(s, "ophelia", "search");
  assert.deepEqual(s.noise, []);
  s = game.applyAction(
    s,
    s.survivors[0].ownerId,
    game
      .getLegalActions(s, s.survivors[0].ownerId)
      .find((a) => a.index === 0 && a.keep !== false),
  );
  assert.deepEqual(s.searchDeck, ["key"]);
  assert.deepEqual(s.noise, []);
  assert.equal(s.keys, 0);
  assert.ok(s.survivors[0].inventory.includes("limestone"));
});

test("Dylan avoids the first damage once, retains wounds thereafter, and recycles a real discarded toolbox", () => {
  let s = make(["dylan", "william", "anna"]);
  s.survivors[0].fear = 2;
  s = act(encounter(s, "dylan"), "dylan", "defend");
  assert.equal(s.survivors[0].health, 2);
  assert.equal(s.survivors[0].abilityState.toughness, false);
  s = act(encounter(s, "dylan"), "dylan", "defend");
  assert.equal(s.survivors[0].health, 1);
  s = act(encounter(s, "dylan"), "dylan", "defend");
  assert.equal(s.phase, "finished");
  assert.equal(s.result.winningTeam, "killer");

  s = make(["dylan", "william", "anna"]);
  s.survivors[0].roomId = "B4";
  s.itemDiscard.push("toolbox");
  s = act(s, "dylan", "recycleToolbox");
  assert.ok(s.survivors[0].inventory.includes("toolbox"));
  assert.ok(!s.itemDiscard.includes("toolbox"));
  assert.equal(s.survivors[0].acted, false);
});

test("George repairs remotely and spends observation notes without bypassing inventory or revealing a hidden Doll by legal actions", () => {
  let s = make(["george", "william", "anna"]);
  s.survivors[0].roomId = "R4";
  s.survivors[0].inventory = ["toolbox"];
  s.killer.roomId = "B1";
  s = act(s, "george", "remoteRepair");
  assert.equal(s.radio.progress, 1);
  assert.deepEqual(s.noise, []);
  s.killer.roomId = "B5";
  s = act(s, "george", "observeKiller");
  assert.ok(s.survivors[0].inventory.includes("research-notes"));
  s.radio.repairedRound = s.round;
  s = act(s, "george", "useNotes");
  assert.equal(s.radio.progress, 2);
  assert.deepEqual(s.noise, []);
  assert.ok(!s.survivors[0].inventory.includes("research-notes"));

  const near = make(["george", "william", "anna"], "doll");
  near.survivors[0].roomId = "R4";
  near.survivors[0].acted = true;
  near.killer.roomId = "B5";
  const far = JSON.parse(JSON.stringify(near));
  far.killer.roomId = "G3";
  assert.deepEqual(
    game.getLegalActions(near, near.survivors[0].ownerId),
    game.getLegalActions(far, far.survivors[0].ownerId),
  );
  const missed = act(far, "george", "observeKiller");
  assert.ok(!missed.survivors[0].inventory.includes("research-notes"));
  assert.ok(
    !game
      .getLegalActions(missed, missed.survivors[0].ownerId)
      .some((a) => a.type === "observeKiller"),
  );
});

test("Caleb searches the mansion mystic location and his once-per-round coin pays an actual search card", () => {
  let s = make(["caleb", "william", "anna"]);
  s.survivors[0].roomId = "G2";
  s.survivors[0].health = 1;
  s.searchDeck = ["key", "limestone"];
  assert.ok(
    game
      .getLegalActions(s, s.survivors[0].ownerId)
      .some((a) => a.type === "search"),
  );
  s = act(s, "caleb", "luckyCoin");
  assert.equal(s.survivors[0].health, 2);
  assert.equal(s.keys, 0);
  assert.deepEqual(s.searchDeck, ["limestone"]);
  assert.ok(
    !game
      .getLegalActions(s, s.survivors[0].ownerId)
      .some((a) => a.type === "luckyCoin"),
  );
  s.round++;
  s = act(s, "caleb", "luckyCoin");
  s = act(s, "caleb", "coinMove", (a) => a.path.at(-1) === "G5");
  assert.equal(s.survivors[0].roomId, "G5");
  assert.equal(s.survivors[0].acted, false);
});

test("Roy guides an ally without spending their turn and adds two defense with his melee weapon", () => {
  let s = make(["roy", "william", "anna"]);
  s = act(
    s,
    "roy",
    "guide",
    (a) => a.targetId === "william" && a.roomId === "B1",
  );
  assert.equal(s.survivors[1].roomId, "B1");
  assert.equal(s.survivors[1].acted, false);
  assert.equal(s.survivors[0].acted, true);
  assert.deepEqual(s.noise, ["R1"]);
  s = encounter(make(["roy", "william", "anna"]), "roy");
  const armed = act(s, "roy", "defend", (a) => a.itemId === "hatchet");
  const bare = act(s, "roy", "defend", (a) => !a.itemId);
  const defense = (state) =>
    state.events.findLast((e) => e.type === "defended").defense;
  assert.equal(defense(armed) - defense(bare), 4);
});

test("Evelyn must spend a later-round action to finish silent bandaging", () => {
  let s = make(["evelyn", "william", "anna"]);
  s.survivors[1].health = 1;
  s.survivors[1].poisoned = true;
  s = act(s, "evelyn", "bandage", (a) => a.targetId === "william");
  assert.equal(s.survivors[1].health, 1);
  s.round++;
  s.survivors[0].acted = false;
  s = act(s, "evelyn", "finishBandage", (a) => a.targetId === "william");
  assert.equal(s.survivors[1].health, 2);
  assert.equal(s.survivors[1].poisoned, false);
  assert.deepEqual(s.noise, []);
});

test("Zach keeps repair silent with his wrench and accelerates once the killer reaches level three", () => {
  let s = make(["zach", "william", "anna"]);
  s.survivors[0].roomId = "B1";
  s = act(s, "zach", "repair");
  assert.equal(s.radio.progress, 1);
  assert.deepEqual(s.noise, []);
  s.round++;
  s.survivors[0].acted = false;
  s.killer.level = 3;
  s = act(s, "zach", "repair");
  assert.equal(s.radio.progress, 3);
  assert.deepEqual(s.noise, []);
});

test("Victoria crafts a finite gadget, clears nearby fear, and has her calm-defense modifier", () => {
  let s = make(["victoria", "william", "anna"]);
  s.survivors[0].roomId = "R4";
  s.survivors[1].roomId = "R5";
  s.survivors[1].fear = 2;
  s = act(s, "victoria", "craftGadget");
  assert.ok(s.survivors[0].inventory.includes("experimental-gadget"));
  s = act(s, "victoria", "activateGadget", (a) => a.targetId === "william");
  assert.equal(s.survivors[1].fear, 0);
  assert.ok(!s.survivors[0].inventory.includes("experimental-gadget"));
  s = encounter(make(["victoria", "william", "anna"]), "victoria");
  s = act(s, "victoria", "defend");
  const result = s.events.findLast((e) => e.type === "defended");
  assert.equal(result.defense, result.dice.reduce((sum, x) => sum + x, 0) + 1);
});

test("Quinto shortcuts once without consuming a primary action and speeds a just-repaired rescue once", () => {
  let s = make(["quinto", "william", "anna"]);
  s.survivors[0].roomId = "B1";
  s = act(s, "quinto", "shortcut");
  assert.equal(s.survivors[0].roomId, "G2");
  assert.equal(s.survivors[0].acted, false);
  assert.ok(
    !game
      .getLegalActions(s, s.survivors[0].ownerId)
      .some((a) => a.type === "shortcut"),
  );
  s.survivors[0].roomId = "B1";
  s.radio = { progress: 5, rescueRemaining: 5, repairedRound: s.round };
  s = act(s, "quinto", "speedRescue");
  assert.equal(s.radio.rescueRemaining, 4);
  assert.ok(
    !game
      .getLegalActions(s, s.survivors[0].ownerId)
      .some((a) => a.type === "speedRescue"),
  );
});

test("Brenda shares her companion loadout, and Hubert executes two distinct primary actions after rehearsal", () => {
  let s = make(["brenda", "william", "anna"]);
  assert.equal(
    game.getView(s, s.survivors[0].ownerId).survivors[0].inventoryLimit,
    4,
  );
  assert.ok(s.survivors[0].inventory.includes("revolver"));
  s = act(s, "brenda", "cooperBark");
  assert.equal(s.noise.length, 1);
  assert.ok(
    !game
      .getLegalActions(s, s.survivors[0].ownerId)
      .some((a) => a.type === "cooperBark"),
  );

  s = make(["hubert", "william", "anna"]);
  s = act(s, "hubert", "prepareRecording");
  s.round++;
  s.survivors.forEach((p) => {
    p.acted = p.id !== "hubert";
  });
  s = act(
    s,
    "hubert",
    "move",
    (a) => a.path.length === 1 && a.path[0] === "B1",
  );
  assert.equal(s.survivors[0].acted, false);
  assert.ok(
    !game
      .getLegalActions(s, s.survivors[0].ownerId)
      .some((a) => a.type === "move" && a.survivorId === "hubert"),
  );
  s = act(s, "hubert", "repair");
  assert.equal(s.survivors[0].acted, true);
  assert.equal(s.phase, "discover");
});

for (const ids of [
  ["george", "ophelia", "dylan"],
  ["caleb", "roy", "evelyn"],
  ["zach", "victoria", "quinto"],
  ["brenda", "hubert", "anna"],
]) {
  for (const count of [2, 4])
    test(`new survivors ${ids.join("/")} finish a projected ${count}-seat bot game without free-action loops`, () => {
      let s = make(ids, "butcher", count),
        turns = 0;
      while (s.phase !== "finished" && turns++ < 500) {
        const id = s.currentPlayerId,
          view = game.getView(s, id),
          before = JSON.stringify(view);
        const action = game.chooseBotAction(view, view.legalActions);
        assert.ok(
          view.legalActions.includes(action),
          `${s.phase} has a bot continuation`,
        );
        assert.equal(JSON.stringify(view), before);
        s = JSON.parse(JSON.stringify(game.applyAction(s, id, action)));
      }
      assert.equal(
        s.phase,
        "finished",
        `must terminate within 500 actions, got ${turns}`,
      );
    });
}
