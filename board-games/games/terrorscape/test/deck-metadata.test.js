"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("..");
const players = [
  { id: "team", name: "小队" },
  { id: "killer", name: "追猎者" },
];
const create = (killerId, seed = "metadata") =>
  engine.createGame({ players, options: { killerId }, seed });
function counts(cards) {
  return Object.fromEntries(
    [...new Set(cards)]
      .sort()
      .map((id) => [id, cards.filter((card) => card === id).length]),
  );
}

test("each initial deck manifest matches the cards actually dealt across seeds without sharing mutable arrays", () => {
  const roles = engine.getCatalog().killers;
  for (const role of roles) {
    assert.ok(
      Object.values(role.startingDeckCounts).every(
        (n) => Number.isInteger(n) && n > 0,
      ),
    );
    for (const seed of ["first", "second", "third"]) {
      const s = create(role.id, seed);
      assert.equal(s.killer.hand.length, 2);
      assert.deepEqual(
        counts([...s.killer.deck, ...s.killer.hand, ...s.killer.discard]),
        role.startingDeckCounts,
        role.id,
      );
      assert.ok(
        Object.keys(role.startingDeckCounts).every((id) =>
          engine.getCatalog().skills.some((skill) => skill.id === id),
        ),
      );
    }
  }
  const catalog = engine.getCatalog();
  catalog.killers[0].startingDeckCounts.sense = 999;
  assert.equal(engine.getCatalog().killers[0].startingDeckCounts.sense, 2);
  assert.deepEqual(
    counts([
      ...create("butcher").killer.deck,
      ...create("butcher").killer.hand,
    ]),
    engine.getCatalog().killers[0].startingDeckCounts,
  );
});

test("remaining deck statistics are exact and order-independent, visible only to the killer until game over", () => {
  const s = create("queen"),
    before = JSON.stringify(s);
  const own = engine.getView(s, "killer").killer;
  assert.deepEqual(own.deckCounts, counts(s.killer.deck));
  assert.equal(
    Object.values(own.deckCounts).reduce((a, b) => a + b, 0),
    own.deckCount,
  );
  assert.equal(engine.getView(s, "team").killer.deckCounts, undefined);
  assert.equal(engine.getView(s, "team").killer.deckCount, undefined);
  assert.equal(engine.getView(s, "outsider").killer.deckCounts, undefined);
  assert.equal(own.deck, undefined);
  const reordered = JSON.parse(before);
  reordered.killer.deck.reverse();
  assert.equal(
    JSON.stringify(engine.getView(reordered, "killer").killer.deckCounts),
    JSON.stringify(own.deckCounts),
  );
  own.deckCounts.sense = 999;
  assert.equal(JSON.stringify(s), before);
  s.phase = "finished";
  assert.deepEqual(
    engine.getView(s, "team").killer.deckCounts,
    counts(s.killer.deck),
  );
});

test("statistics count a saved partial deck, not the catalog recipe, and include generated cards", () => {
  const s = create("wendigo");
  s.killer.deck = ["starvation", "pursue", "starvation"];
  s.killer.hand = ["sense"];
  s.killer.discard = ["rage"];
  delete s.killer.evolutions;
  const saved = JSON.stringify(s);
  const restored = JSON.parse(saved);
  assert.deepEqual(engine.getView(restored, "killer").killer.deckCounts, {
    pursue: 1,
    starvation: 2,
  });
  assert.equal(engine.getView(restored, "killer").killer.deckCount, 3);
  assert.equal(JSON.stringify(restored), saved);
  assert.equal(
    engine.getCatalog().killers.find((k) => k.id === "wendigo")
      .startingDeckCounts.starvation,
    undefined,
  );
  restored.killer.deck = [];
  assert.deepEqual(engine.getView(restored, "killer").killer.deckCounts, {});
});

test("level previews match actual base-strength progression without inventing specialist unlocks", () => {
  const roles = engine.getCatalog().killers;
  for (const role of roles) {
    assert.deepEqual(
      role.levels.map((l) => l.level),
      [1, 2, 3, 4, 5],
    );
    assert.equal(role.levels[0].strength, role.startingStrength);
    assert.ok(
      role.levels.every(
        (l) => typeof l.effect === "string" && l.effect.length > 0,
      ),
    );
    for (let from = 1; from < 5; from++) {
      const s = create(role.id);
      s.phase = "killer";
      s.currentPlayerId = "killer";
      s.currentSide = "killer";
      s.killer.level = from;
      s.killer.strength = role.levels[from - 1].strength;
      s.killer.deck = [];
      s.killer.discard = [
        "sense",
        "pursue",
        "rage",
        "terror",
        "sense",
        "pursue",
      ];
      s.killer.hand = [];
      const next = engine.applyAction(s, "killer", { type: "endTurn" });
      assert.equal(next.killer.level, from + 1, role.id);
      assert.equal(next.killer.strength, role.levels[from].strength, role.id);
    }
    assert.equal(role.levels[4].effect, "沿用上级能力。");
    if (role.id !== "butcher") assert.deepEqual(role.unlocks, []);
  }
  const butcher = roles.find((k) => k.id === "butcher"),
    unknown = roles.find((k) => k.id === "unidentified");
  assert.deepEqual(butcher.unlocks, [{ level: 3, skillId: "brutal-rage" }]);
  assert.equal(butcher.startingDeckCounts["brutal-rage"], undefined);
  assert.match(butcher.levels[2].effect, /解锁蛮力狂暴/);
  assert.match(unknown.levels[1].effect, /须使用适应进化牌/);
  assert.match(unknown.levels[3].effect, /新增一次进化机会/);
  assert.match(
    roles.find((k) => k.id === "queen").levels[1].effect,
    /按参战单位数累计提高/,
  );
});
