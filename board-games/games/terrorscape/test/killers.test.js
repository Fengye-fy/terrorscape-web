"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("..");
const seats = [
  { id: "team", name: "小队" },
  { id: "killer", name: "追猎者" },
];
const catalog = engine.getCatalog();
function setup(killerId) {
  return engine.createGame({
    players: seats,
    options: { killerId },
    seed: "expansion-test",
  });
}
function hunting(id) {
  const s = setup(id);
  s.phase = "killer";
  s.currentPlayerId = "killer";
  s.currentSide = "killer";
  return s;
}
function use(s, id, predicate = () => true) {
  const a = engine
    .getLegalActions(s, "killer")
    .find((a) => a.type === "playSkill" && a.skillId === id && predicate(a));
  assert.ok(a, "missing " + id);
  return engine.applyAction(s, "killer", a);
}
function giveSkills(s, ...ids) {
  s.killer.hand = ids;
  return s;
}

test("every documented killer is selectable, projected safely, immutable and resumable", () => {
  assert.equal(catalog.killers.length, 14);
  assert.throws(() => engine.validateOptions({ killerId: "invented" }), {
    code: "INVALID_OPTIONS",
  });
  for (const profile of catalog.killers) {
    const s = setup(profile.id),
      before = JSON.stringify(s);
    assert.equal(s.killer.id, profile.id);
    assert.deepEqual(JSON.parse(before), s);
    const team = engine.getView(s, "team"),
      killer = engine.getView(s, "killer");
    assert.equal(team.killer.ability, profile.ability);
    assert.equal(team.killer.hand, undefined);
    assert.equal(killer.rngState, undefined);
    assert.ok(
      killer.survivors.every((p) => p.roomId === null && p.inventory === null),
    );
    const action = engine
      .getLegalActions(s, "team")
      .find((a) => a.type === "rest");
    assert.ok(action);
    const next = engine.applyAction(s, "team", action);
    assert.equal(JSON.stringify(s), before);
    assert.notEqual(next, s);
    assert.deepEqual(
      engine.getView(JSON.parse(JSON.stringify(next)), "team"),
      engine.getView(next, "team"),
    );
  }
});

test("Huntress traps stop each traversed step, hide their type, and direct damage can end the game", () => {
  let s = setup("huntress");
  assert.ok(
    engine.getView(s, "team").killer.traps.every((t) => t.type === null),
  );
  assert.ok(
    engine.getView(s, "killer").killer.traps.some((t) => t.type === "net"),
  );
  s = engine.applyAction(s, "team", {
    type: "move",
    survivorId: "william",
    path: ["R2", "G1"],
  });
  assert.equal(s.survivors[0].roomId, "R2");
  assert.equal(s.survivors[0].snaredUntilRound, 1);
  assert.ok(!s.killer.traps.some((t) => t.roomId === "R2"));
  s = setup("huntress");
  s.killer.traps = [{ roomId: "B1", type: "bear" }];
  s.survivors[0].health = 1;
  s = engine.applyAction(s, "team", {
    type: "move",
    survivorId: "william",
    path: ["B1"],
  });
  assert.equal(s.phase, "finished");
  assert.equal(s.result.winningTeam, "killer");
});

test("Werewolf hearing follows published noise rather than hidden survivor positions", () => {
  let s = giveSkills(hunting("werewolf"), "hyper-hearing");
  s.publicNoise = ["B4"];
  const a = engine
    .getLegalActions(s, "killer")
    .find((a) => a.skillId === "hyper-hearing");
  assert.equal(a.roomId, "B4");
  const moved = JSON.parse(JSON.stringify(s));
  moved.survivors.forEach((p) => (p.roomId = "G1"));
  assert.deepEqual(
    engine.getLegalActions(moved, "killer"),
    engine.getLegalActions(s, "killer"),
  );
  s = engine.applyAction(s, "killer", a);
  assert.equal(s.killer.roomId, "B4");
  assert.ok(s.events.some((e) => e.type === "killer-searched"));
});

test("Strangler plants a public core, teleports there, attacks from it and allows survivor removal", () => {
  let s = giveSkills(
    hunting("strangler"),
    "plant-core",
    "telesynthesis",
    "frenzy-vines",
  );
  s.killer.roomId = "R1";
  s = use(s, "plant-core", (a) => a.roomId === "B1");
  s = use(s, "telesynthesis", (a) => a.roomId === "B1");
  assert.equal(s.killer.roomId, "B1");
  assert.ok(engine.getView(s, "team").killer.cores.includes("B1"));
  s.survivors[0].roomId = "B1";
  s = use(s, "frenzy-vines", (a) => a.roomId === "B1");
  assert.equal(s.phase, "encounter");
  s = setup("strangler");
  s.survivors[0].roomId = "G5";
  s = engine.applyAction(s, "team", {
    type: "clearCore",
    survivorId: "william",
  });
  assert.deepEqual(s.killer.cores, []);
});

test("Unidentified receives exactly two gated, persistent evolution opportunities", () => {
  let s = giveSkills(hunting("unidentified"), "evolve", "evolve");
  assert.ok(
    !engine.getLegalActions(s, "killer").some((a) => a.skillId === "evolve"),
  );
  s.killer.level = 2;
  s = use(s, "evolve", (a) => a.evolution === "speed");
  assert.equal(s.killer.actionsRemaining, 3);
  assert.ok(
    !engine.getLegalActions(s, "killer").some((a) => a.skillId === "evolve"),
  );
  s.killer.level = 4;
  s = use(s, "evolve", (a) => a.evolution === "might");
  assert.equal(s.killer.strength, 6);
  assert.deepEqual(s.killer.evolutions, ["speed", "might"]);
});

test("Statues expose four bodies, allow freezing a lone body and cannot move a frozen main statue", () => {
  let s = setup("statues");
  assert.equal(s.killer.statues.length, 4);
  const st = s.killer.statues[0];
  st.roomId = "B1";
  s.killer.roomId = "B1";
  s.survivors[0].roomId = "B1";
  s = engine.applyAction(s, "team", {
    type: "freezeStatue",
    survivorId: "william",
    statueId: st.id,
  });
  assert.equal(s.killer.statues[0].frozen, true);
  s.phase = "killer";
  s.currentPlayerId = "killer";
  assert.ok(
    !engine
      .getLegalActions(s, "killer")
      .some((a) => ["killerMove", "killerSearch"].includes(a.type)),
  );
  giveSkills(s, "statue-switch");
  s = use(s, "statue-switch", (a) => a.statueId === "statue-1");
  assert.equal(s.killer.roomId, "G5");
  s.phase = "encounter";
  s.encounter = {
    stage: "defend",
    remainingIds: ["william"],
    roomId: "B1",
    strength: 4,
  };
  assert.ok(
    engine
      .getLegalActions(s, "team")
      .some((a) => a.type === "defend" && a.survivorId === "william"),
  );
});

test("Queen zombies attack with combined strength and the supplied crossbow removes two", () => {
  let s = giveSkills(hunting("queen"), "command-zombie");
  s.killer.zombies.forEach((z) => (z.roomId = "R1"));
  s = use(s, "command-zombie", (a) => a.command === "search");
  assert.equal(s.encounter.strength, 4);
  s = setup("queen");
  s.killer.zombies.forEach((z) => (z.roomId = "R1"));
  assert.ok(s.survivors[0].inventory.includes("crossbow"));
  s = engine.applyAction(s, "team", {
    type: "shootZombie",
    survivorId: "william",
    roomId: "R1",
  });
  assert.equal(s.killer.zombies.length, 0);
});

test("Orion marks a sensed zone before a remote spear encounter; Eyebot scans from a deployed drone", () => {
  let s = giveSkills(hunting("orion"), "target-lock", "spear-gun");
  s.killer.roomId = "B1";
  s = use(s, "target-lock", (a) => a.zone === "R");
  assert.deepEqual(s.killer.markedIds, ["william", "marco"]);
  s = use(s, "spear-gun", (a) => a.roomId === "R1");
  assert.equal(s.encounter.roomId, "R1");
  assert.equal(s.encounter.strength, 6);
  assert.equal(s.killer.roomId, "B1");
  s = giveSkills(hunting("eyebot"), "deploy-drone", "drone-scan");
  s.killer.roomId = "R1";
  s = use(s, "deploy-drone", (a) => a.roomId === "R2");
  s = use(s, "drone-scan");
  assert.deepEqual(s.killer.drones, ["R2"]);
  assert.ok(s.events.some((e) => e.type === "sense-result" && e.zone === "R"));
});

test("Parasitoid delayed cloud triggers next turn, while Doctor poison damages on a second exposure and can be cleansed", () => {
  let s = giveSkills(hunting("parasitoid"), "infestation-cloud");
  s.killer.roomId = "R1";
  s = use(s, "infestation-cloud", (a) => a.roomId === "R1");
  assert.equal(s.survivors[0].poisoned, undefined);
  s.phase = "discover";
  s.round = 2;
  s.discoverDeck = [];
  s.radio.rescueRemaining = 2;
  s = engine.applyAction(s, "team", {
    type: "discover",
    survivorId: "william",
  });
  assert.equal(s.survivors[0].poisoned, true);
  assert.equal(s.survivors[0].fear, 1);
  s = giveSkills(hunting("doctor"), "toxic-treatment", "toxic-treatment");
  s.killer.roomId = "R1";
  s = use(s, "toxic-treatment", (a) => a.roomId === "R1");
  s = use(s, "toxic-treatment", (a) => a.roomId === "R1");
  assert.equal(s.survivors[0].health, 1);
  s.phase = "survivors";
  s.currentPlayerId = "team";
  s = engine.applyAction(s, "team", {
    type: "cleansePoison",
    survivorId: "william",
  });
  assert.equal(s.survivors[0].poisoned, false);
});

test("Nightmare boosts encounters against dreamers and survivors can spend an action waking up", () => {
  let s = giveSkills(hunting("nightmare"), "drag-to-dream");
  s.killer.roomId = "R1";
  s = use(s, "drag-to-dream", (a) => a.zone === "R");
  s = engine.applyAction(s, "killer", { type: "killerSearch" });
  assert.equal(s.encounter.strength, 7);
  s.phase = "survivors";
  s.currentPlayerId = "team";
  s = engine.applyAction(s, "team", { type: "wakeUp", survivorId: "william" });
  assert.equal(s.survivors[0].dreaming, false);
});

test("Wendigo hunger clogs its deck, frost stops travel and repair, and survivors can clear frost", () => {
  let s = giveSkills(hunting("wendigo"), "hunger", "frost-breath");
  s.killer.roomId = "R1";
  s = use(s, "hunger");
  assert.ok(s.killer.discard.includes("starvation"));
  s = use(s, "frost-breath", (a) => a.roomId === "B1");
  s.phase = "survivors";
  s.currentPlayerId = "team";
  s = engine.applyAction(s, "team", {
    type: "move",
    survivorId: "william",
    path: ["B1", "B2"],
  });
  assert.equal(s.survivors[0].roomId, "B1");
  s.survivors[0].acted = false;
  assert.ok(
    !engine
      .getLegalActions(s, "team")
      .some((a) => a.type === "repair" && a.survivorId === "william"),
  );
  s = engine.applyAction(s, "team", {
    type: "clearFrost",
    survivorId: "william",
  });
  assert.deepEqual(s.killer.frozenRooms, []);
});

test("Doll randomized start, movement and trap information stay secret, stolen keys can be recovered and four catches win", () => {
  const starts = new Set();
  for (let i = 0; i < 8; i++) {
    const s = engine.createGame({
      players: seats,
      options: { killerId: "doll" },
      seed: i,
    });
    starts.add(s.killer.roomId);
    assert.notEqual(s.killer.roomId, "R1");
    assert.equal(engine.getView(s, "team").killer.roomId, null);
    assert.ok(!engine.getView(s, "team").events[0].text.includes("花园"));
  }
  assert.ok(starts.size > 1);
  let s = giveSkills(hunting("doll"), "steal-key", "prank");
  s.keys = 2;
  s = use(s, "steal-key");
  assert.equal(s.keys, 1);
  assert.equal(s.killer.stolenKeys, 1);
  s = use(s, "prank");
  assert.ok(s.discoverDeck.includes("doll-prank"));
  const move = engine
    .getLegalActions(s, "killer")
    .find((a) => a.type === "killerMove");
  s = engine.applyAction(s, "killer", move);
  assert.ok(
    !engine.getView(s, "team").events.some((e) => e.type === "killer-moved"),
  );
  s.phase = "survivors";
  s.currentPlayerId = "team";
  s.survivors[0].roomId = s.killer.roomId;
  s = engine.applyAction(s, "team", {
    type: "catchDoll",
    survivorId: "william",
  });
  assert.equal(s.keys, 2);
  s.killer.catches = 3;
  s.survivors[0].acted = false;
  s = engine.applyAction(s, "team", {
    type: "catchDoll",
    survivorId: "william",
  });
  assert.equal(s.phase, "finished");
  assert.equal(s.result.winningTeam, "survivors");
});

for (const profile of catalog.killers)
  test(`${profile.englishName} completes a fully projected bot game without an illegal or missing decision`, () => {
    let s = setup(profile.id);
    for (let step = 0; step < 1600 && s.phase !== "finished"; step++) {
      const id = s.currentPlayerId,
        view = engine.getView(s, id);
      const a = engine.chooseBotAction(view, view.legalActions);
      assert.ok(a, `${profile.id} stalled in ${s.phase}`);
      s = JSON.parse(JSON.stringify(engine.applyAction(s, id, a)));
    }
    assert.equal(s.phase, "finished", profile.id + " exceeded action bound");
    assert.ok(s.result.winnerIds.length > 0);
  });
