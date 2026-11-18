"use strict";

// A bot is a client of the projection API. This module never receives a game state.
const engine = require("../../../apps/site/public/board-games/terrorscape/engine.js");
const {
  chooseHunterAction,
} = require("../../../apps/site/public/board-games/terrorscape/hunter.js");
const catalog = engine.getCatalog();
const rooms = new Map(catalog.rooms.map((room) => [room.id, room]));
const items = new Map(catalog.items.map((item) => [item.id, item]));
const edgeKey = (a, b) => [a, b].sort().join(":");
const has = (p, itemId) => (p.inventory || []).includes(itemId);
const neighbors = (id) =>
  catalog.edges
    .filter((edge) => edge.includes(id))
    .map((edge) => edge.find((to) => to !== id));
const capacity = (p) =>
  p.inventoryLimit || (["johnson", "brenda"].includes(p.id) ? 4 : 3);
const unreachable = 100;

function best(actions, score) {
  let chosen = null;
  let highest = -Infinity;
  for (const action of actions) {
    const rank = score(action);
    if (rank > highest) {
      chosen = action;
      highest = rank;
    }
  }
  return chosen;
}

// Survivor routes respect public barricades. The killer can cross them; his
// threat distance deliberately uses the unblocked normal map instead.
function distances(from, blocks = [], passage = false) {
  const denied = new Set(blocks.map((edge) => edgeKey(...edge)));
  const result = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i];
    const adjacent = neighbors(here);
    if (passage && rooms.get(here)?.passage) {
      const other = catalog.rooms.find(
        (room) => room.id !== here && room.passage === rooms.get(here).passage,
      );
      if (other) adjacent.push(other.id);
    }
    for (const to of adjacent) {
      if (denied.has(edgeKey(here, to)) || result.has(to)) continue;
      result.set(to, result.get(here) + 1);
      queue.push(to);
    }
  }
  return result;
}

function context(view) {
  const survivors = view.survivors || [];
  const threat = distances(view.killer.roomId);
  const paths = new Map();
  const canPassage = (p) =>
    ["sophia", "quinto"].includes(p.id) || has(p, "flashlight");
  const distance = (p, from, to, blocks = view.blocks) => {
    const key = `${p.id}:${from}:${blocks === view.blocks ? "usual" : JSON.stringify(blocks)}`;
    if (!paths.has(key))
      paths.set(key, distances(from, blocks || [], canPassage(p)));
    return paths.get(key).get(to) ?? unreachable;
  };
  const danger = (id) => threat.get(id) ?? unreachable;
  const rescue = view.radio.rescueRemaining !== null;
  const escape = view.keys >= 5;

  // Everyone selects the same exit from the same allied view. Use the latest
  // gather event implicitly through positions, rather than keeping bot memory.
  const exits = ["R1"];
  if (survivors.some((p) => has(p, "secret-map"))) exits.push("G5");
  const exitRank = (id) =>
    Math.max(...survivors.map((p) => distance(p, p.roomId, id))) * 3 +
    survivors.reduce((sum, p) => sum + distance(p, p.roomId, id), 0) +
    (danger(id) <= 1 ? 2 : 0);
  const exit = exits.reduce((chosen, id) =>
    exitRank(id) < exitRank(chosen) ? id : chosen,
  );

  // Include already-acted survivors: someone who just reached the radio stays
  // its designated worker, instead of attracting every remaining ally there.
  const worker =
    !rescue && !escape && view.killer.roomId !== "B1"
      ? survivors.slice().sort((a, b) => {
          const rank = (p) =>
            distance(p, p.roomId, "B1") / (p.id === "william" ? 3 : 2) -
            (has(p, "toolbox") ? (p.id === "johnson" ? 1.6 : 1.2) : 0) +
            (p.health === 1 && danger("B1") <= 2 ? 1 : 0);
          return rank(a) - rank(b);
        })[0]
      : null;

  function goal(p) {
    if (escape) return exit;
    if (rescue) {
      // A room with onward paths and fewer allies is harder to sweep. Prefer
      // staying safely hidden over creating needless movement every round.
      return catalog.rooms.slice().sort((a, b) => {
        const rank = (room) =>
          danger(room.id) * 4 +
          neighbors(room.id).length -
          distance(p, p.roomId, room.id) * 1.4 -
          survivors.filter((q) => q.id !== p.id && q.roomId === room.id)
            .length *
            2;
        return rank(b) - rank(a);
      })[0].id;
    }
    if (worker?.id === p.id) return "B1";
    if (view.searchDeckCount > 0) {
      return catalog.rooms
        .filter((room) => room.search)
        .sort((a, b) => {
          const rank = (room) =>
            distance(p, p.roomId, room.id) +
            (danger(room.id) <= 1 ? 5 : 0) +
            survivors.filter((q) => q.id !== p.id && q.roomId === room.id)
              .length *
              0.7;
          return rank(a) - rank(b);
        })[0].id;
    }
    return "B1";
  }
  return {
    view,
    survivors,
    danger,
    distance,
    goal,
    rescue,
    escape,
    worker,
    exit,
  };
}

function itemValue(id, p, ctx) {
  const { view, survivors, rescue, escape } = ctx;
  const duplicate = has(p, id) ? 18 : 0;
  if (id === "key") return escape ? 0 : 200;
  if (id === "wrench") return p.id === "zach" && !rescue && !escape ? 110 : 45;
  if (id === "hatchet") return p.id === "roy" ? 95 : 64;
  if (id === "research-notes") return rescue || escape ? 2 : 105;
  if (id === "experimental-gadget") return 65 - duplicate;
  if (id === "lucky-coin") return 38;
  if (id === "toolbox") return rescue || escape ? 3 : 100 - duplicate;
  if (id === "medical-kit" || id === "first-aid") {
    return (survivors.some((q) => q.health === 1) ? 100 : 55) - duplicate;
  }
  if (id === "revolver") return 80 - duplicate * 2;
  if (id === "amulet") return 72 - duplicate;
  if (id === "limestone") return 64 - duplicate;
  if (id === "energy-drink") return (p.fear ? 75 : 35) - duplicate;
  if (id === "flashlight") return (p.id === "sophia" ? 15 : 45) - duplicate;
  if (id === "secret-map")
    return (
      (survivors.some((q) => has(q, id)) ? 12 : view.keys >= 3 ? 75 : 40) -
      duplicate
    );
  if (id === "ammo") return (has(p, "revolver") ? 65 : 20) - duplicate;
  if (id === "firecracker") return 28 - duplicate;
  if (id === "whiskey") return 20 - duplicate;
  return 1;
}

function chooseItem(actions, ctx) {
  const choice = ctx.view.choice;
  const p = ctx.survivors.find((p) => p.id === choice?.survivorId);
  if (!p) return actions[0];
  if (choice.stage === "discard") {
    return best(
      actions,
      (a) =>
        -itemValue(
          p.inventory[a.index],
          { ...p, inventory: p.inventory.filter((_, i) => i !== a.index) },
          ctx,
        ),
    );
  }
  return best(actions, (a) =>
    a.index < 0
      ? -1
      : a.keep === false
        ? -2
        : itemValue(choice.cards[a.index], p, ctx),
  );
}

// Evaluate the actual digital dice distribution, rather than using a bot-only
// roll. The engine remains the only authority that rolls or resolves damage.
function defenseProbability(dice, required) {
  let distribution = new Map([[0, 1]]);
  for (let i = 0; i < dice; i++) {
    const next = new Map();
    for (const [sum, probability] of distribution) {
      for (const face of [0, 0, 1, 1, 1, 3])
        next.set(sum + face, (next.get(sum + face) || 0) + probability / 6);
    }
    distribution = next;
  }
  return [...distribution].reduce(
    (sum, [value, probability]) => sum + (value >= required ? probability : 0),
    0,
  );
}

function chooseDefense(actions, ctx) {
  return best(actions, (a) => {
    const p = ctx.survivors.find((p) => p.id === a.survivorId);
    const bonus =
      (items.get(a.itemId)?.defense || 0) +
      (a.ammo ? 2 : 0) +
      (p.id === "william" && !a.itemId ? 1 : 0) +
      (p.id === "victoria" && p.fear === 0 ? 1 : 0) +
      (p.id === "roy" && ["hatchet", "longsword"].includes(a.itemId) ? 2 : 0) +
      (a.encouragement ? 1 : 0);
    const chance = defenseProbability(
      4 - p.fear,
      ctx.view.encounter.strength - bonus,
    );
    const cost =
      a.itemId && !items.get(a.itemId)?.persistent
        ? itemValue(a.itemId, p, ctx) * 0.04
        : 0;
    return (
      chance * 200 +
      (p.health === 2 || p.abilityState?.toughness ? 9 : 0) -
      cost -
      (a.ammo ? 1 : 0) -
      (a.encouragement ? 0.4 : 0)
    );
  });
}

function movementScore(p, to, ctx) {
  if (to === p.roomId) return -100;
  const target = ctx.goal(p);
  const before = ctx.distance(p, p.roomId, target);
  const after = ctx.distance(p, to, target);
  const oldDanger = ctx.danger(p.roomId);
  const newDanger = ctx.danger(to);
  if (newDanger === 0) return -500;
  let score = ctx.escape
    ? 85
    : ctx.rescue
      ? 25
      : ctx.worker?.id === p.id
        ? 65
        : 45;
  score += (before - after) * 8 + (to === target ? 12 : 0);
  score -=
    newDanger === 1 ? (p.health === 1 ? 65 : 28) : newDanger === 2 ? 8 : 0;
  if (oldDanger === 0) score += 140;
  else if (oldDanger === 1 && newDanger >= 3) score += 65;
  else if (oldDanger === 2 && newDanger >= 4 && ctx.rescue) score += 35;
  if (ctx.rescue) score += Math.min(newDanger, 5) * 7;
  // Progress dominates scenic detours, even when a room is nominally safer.
  if (!ctx.rescue && after >= before && oldDanger >= 3) score -= 65;
  return score;
}

function extraItemScore(action, p, ctx) {
  if (action.itemId === "energy-drink") return p.fear ? 250 : -100;
  if (action.itemId === "firecracker") {
    return ctx.view.noise.some(
      (id) => ctx.survivors.some((q) => q.roomId === id) && ctx.danger(id) <= 2,
    )
      ? 180
      : -100;
  }
  if (action.itemId === "whiskey") {
    const occupied = ctx.survivors.some((q) => q.roomId === action.roomId);
    return !occupied &&
      ctx.danger(p.roomId) <= 2 &&
      !ctx.view.noise.includes(action.roomId)
      ? 130
      : -100;
  }
  return -100;
}

function chooseSurvivorAction(view, actions) {
  const ctx = context(view);
  if (view.phase === "chooseItem") return chooseItem(actions, ctx);
  if (view.phase === "encounter") return chooseDefense(actions, ctx);
  if (view.phase === "flee") {
    return best(actions, (a) => {
      const p = ctx.survivors.find((p) => p.id === a.survivorId);
      return (
        movementScore(p, a.roomId, ctx) +
        neighbors(a.roomId).length -
        ctx.survivors.filter((q) => q.id !== p.id && q.roomId === a.roomId)
          .length *
          3
      );
    });
  }
  return best(actions, (action) => {
    const p = ctx.survivors.find((p) => p.id === action.survivorId);
    if (!p) return -1000;
    switch (action.type) {
      case "chooseItem":
        return -1000;
      case "defend":
        return -1000;
      case "giveItem":
        // Transfers are reversible free actions. Do not autonomously create an
        // unbounded exchange sequence when another bot has the recipient seat.
        return -1000;
      case "useItem":
        return extraItemScore(action, p, ctx);
      case "heal":
        return 150 + (p.id === action.targetId ? 4 : 0);
      case "wakeUp":
      case "cleansePoison":
        return p.health === 1 || ctx.danger(p.roomId) <= 2 ? 148 : 95;
      case "clearFrost":
        return (p.roomId === "B1" && !ctx.rescue) ||
          (rooms.get(p.roomId)?.search && !ctx.escape)
          ? 112
          : 15;
      case "clearCore":
        return p.roomId === "B1" || p.health === 1 ? 95 : 55;
      case "freezeStatue":
        return view.killer.roomId === p.roomId ? 140 : 45;
      case "shootZombie":
        return (
          75 +
          20 *
            view.killer.zombies.filter((z) => z.roomId === action.roomId).length
        );
      case "catchDoll":
        return view.killer.roomId === p.roomId
          ? 175
          : view.killer.stolenKeys
            ? 56
            : 12;
      case "finishBandage":
        return 150;
      case "bandage":
        return 100;
      case "observeKiller":
        return 190;
      case "useNotes":
        return 200;
      case "recycleToolbox":
        return ctx.rescue || ctx.escape ? -50 : 180;
      case "remoteRepair":
        return 130 + (view.radio.progress >= 4 ? 35 : 0);
      case "remoteSearch":
        return ctx.rescue || ctx.escape ? -50 : 82;
      case "speedRescue":
        return 300;
      case "encourage": {
        const target = ctx.survivors.find((q) => q.id === action.targetId);
        return target.fear ? 85 + target.fear * 15 : 10;
      }
      case "craftGadget":
        return ctx.danger(p.roomId) <= 2 ? 65 : 30;
      case "activateGadget":
        return 155;
      case "prepareRecording":
        return ctx.escape || ctx.rescue ? 15 : 68;
      case "luckyCoin":
        return p.health === 1 && ctx.danger(p.roomId) <= 2 ? 95 : 2;
      case "coinMove":
        return movementScore(p, action.path.at(-1), ctx) + 35;
      case "shortcut":
        return movementScore(p, action.roomId, ctx) + 25;
      case "nurseRemedy":
        return p.fear
          ? 250 +
              (action.roomId === p.roomId
                ? 0
                : movementScore(p, action.roomId, ctx) / 10)
          : movementScore(p, action.roomId, ctx) - 30;
      case "cooperBark":
        return ctx.danger(p.roomId) <= 2 &&
          !view.noise.includes(action.roomId) &&
          !ctx.survivors.some((q) => q.roomId === action.roomId)
          ? 150
          : -100;
      case "guide": {
        const target = ctx.survivors.find((q) => q.id === action.targetId);
        return movementScore(target, action.roomId, ctx) - 35;
      }
      case "repair": {
        const progress = view.radio.progress;
        const amount =
          action.itemId === "toolbox"
            ? p.id === "johnson"
              ? 3
              : 2
            : p.id === "zach" && view.killer.level >= 3
              ? 2
              : 1;
        return (
          120 +
          Math.min(amount, 5 - progress) * 5 +
          (progress + amount >= 5 ? 35 : 0) -
          (action.itemId && progress === 4 ? 1 : 0)
        );
      }
      case "search":
        return ctx.escape || ctx.rescue
          ? -50
          : 75 +
              (view.keys >= 3 ? 20 : 0) -
              (ctx.danger(p.roomId) === 1 ? 45 : 0);
      case "move":
      case "sprint":
        return (
          movementScore(p, action.path[action.path.length - 1], ctx) -
          action.path.length * 0.1 -
          (action.type === "sprint" ? 4 : 0)
        );
      case "passage":
        return movementScore(p, action.roomId, ctx);
      case "rest": {
        if (ctx.escape && p.roomId === ctx.exit) return 115;
        if (ctx.rescue && ctx.danger(p.roomId) >= 3) return 78 + p.fear * 5;
        if (
          ctx.worker?.id === p.id &&
          p.roomId === "B1" &&
          view.radio.repairedRound === view.round
        )
          return 80;
        return 5 + (p.fear === 2 ? 35 : p.fear ? 15 : 0);
      }
      case "unblock": {
        const remaining = (view.blocks || []).filter(
          (edge) => edgeKey(...edge) !== edgeKey(p.roomId, action.roomId),
        );
        const target = ctx.goal(p);
        const improvement =
          ctx.distance(p, p.roomId, target) -
          ctx.distance(p, p.roomId, target, remaining);
        return improvement > 0 ? 65 + Math.min(improvement, 5) * 5 : 12;
      }
      case "discover":
        return (
          60 +
          Math.min(ctx.danger(p.roomId), 5) * 2 +
          (capacity(p) - p.inventory.length) * 3
        );
      default:
        return -1000;
    }
  });
}

function publicRandom(view, actions) {
  const text = JSON.stringify([
    view.round,
    view.turn,
    view.killer.roomId,
    view.killer.hand,
    view.events[view.events.length - 1]?.sequence,
    actions,
  ]);
  let state = 2166136261;
  for (const character of text)
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function chooseBotAction(view, legalActions = view?.legalActions) {
  if (!view || !Array.isArray(legalActions) || !legalActions.length)
    return null;
  if (view.viewerSide === "spectator" || view.phase === "finished") return null;
  let selected;
  if (view.viewerSide === "killer") {
    selected = chooseHunterAction(
      { ...view, legalActions },
      catalog,
      publicRandom(view, legalActions),
    );
  } else if (view.viewerSide === "survivors") {
    selected = chooseSurvivorAction(view, legalActions);
  }
  // Do not synthesize, persist or reuse a command; callers submit one of the
  // latest legal objects they provided and must request a fresh view afterwards.
  return legalActions.includes(selected) ? selected : null;
}

module.exports = { chooseBotAction };
