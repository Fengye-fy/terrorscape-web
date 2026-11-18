(function (global) {
  "use strict";

  // The automated opponent receives only the killer's projected view of the table.
  function chooseHunterAction(view, catalog, random = Math.random) {
    const actions = view.legalActions;
    const first = (type) => actions.find((a) => a.type === type);
    const skill = (id) =>
      actions.filter((a) => a.type === "playSkill" && a.skillId === id);
    const pick = (list) => list[Math.floor(random() * list.length)];
    const rage = skill("rage");
    if (first("attack"))
      return rage.length && random() < 0.55 ? rage[0] : first("attack");
    if (!actions.length) return null;

    const here = view.killer.roomId;
    const rampageMoves = actions.filter((a) => a.type === "brutalRageMove");
    if (rampageMoves.length) {
      const searched = new Set(
        view.events
          .filter((e) => e.round === view.round && e.type === "killer-searched")
          .map((e) => e.roomId),
      );
      const blocked = new Set(
        view.blocks.map((edge) => edge.slice().sort().join(":")),
      );
      const ranked = rampageMoves
        .map((a) => {
          let from = here,
            breaches = 0;
          for (const to of a.path) {
            if (blocked.has([from, to].sort().join(":"))) breaches++;
            from = to;
          }
          const destination = a.path.at(-1),
            room = catalog.rooms.find((r) => r.id === destination);
          const score =
            (view.noise.includes(destination) ? 12 : 0) +
            breaches * 3 +
            (room?.search || room?.radio ? 1 : 0) -
            (searched.has(destination) ? 9 : 0) -
            a.path.length * 0.1 +
            random() * 0.3;
          return { action: a, score };
        })
        .sort((a, b) => b.score - a.score);
      return ranked[0].score < -4 && first("endBrutalRage")
        ? first("endBrutalRage")
        : ranked[0].action;
    }
    // Character abilities are selected using only this side's projected clues.
    // No survivor coordinates, inventories, deck order, or hidden repair progress
    // are available to this opponent.
    const special = actions.filter(
      (a) =>
        a.type === "playSkill" &&
        ![
          "sense",
          "pursue",
          "chainsaw",
          "barricade",
          "rage",
          "terror",
        ].includes(a.skillId),
    );
    if (special.length) {
      const score = (a) => {
        let n = 0;
        const id = a.roomId;
        const place = catalog.rooms.find((r) => r.id === id);
        if (id && view.noise.includes(id)) n += 8;
        if (place?.search || place?.radio) n += 2;
        if (
          [
            "evolve",
            "hyper-hearing",
            "steal-key",
            "hunger",
            "prank",
            "summon-zombie",
          ].includes(a.skillId)
        )
          n += 5;
        if (a.skillId === "evolve" && a.evolution === "speed") n += 1;
        if (a.skillId === "brutal-rage")
          n += view.blocks.length ? 6 : view.noise.length ? 3 : 0;
        if (a.skillId === "plant-core" && view.killer.cores?.includes(id))
          n -= 8;
        if (
          a.skillId === "command-zombie" &&
          a.command === "search" &&
          !view.noise.includes(
            view.killer.zombies.find((z) => z.id === a.zombieId)?.roomId,
          )
        )
          n -= 5;
        if (a.zone && view.noise.some((id) => id.startsWith(a.zone))) n += 5;
        return n + random();
      };
      const ranked = special
        .map((a) => ({ a, score: score(a) }))
        .sort((a, b) => b.score - a.score);
      if (ranked[0].score >= 2 || random() < 0.35) return ranked[0].a;
    }
    const searched = new Set(
      view.events
        .filter((e) => e.round === view.round && e.type === "killer-searched")
        .map((e) => e.roomId),
    );
    const lastEncounter = view.events
      .slice()
      .reverse()
      .find((e) => e.type === "killer-searched" && e.survivorIds?.length);
    const latestSense = view.events
      .slice()
      .reverse()
      .find((e) => e.round === view.round && e.type === "sense-result");
    const targets = catalog.rooms.map((room) => {
      let score = 0;
      if (view.noise.includes(room.id)) score += 8;
      if (view.keys >= 4 && room.exit === "main") score += 4;
      if (room.radio && view.radio.rescueRemaining == null) score += 1;
      if (room.search) score += 1;
      if (
        lastEncounter?.roomId === room.id &&
        lastEncounter.round >= view.round - 1
      )
        score += 3;
      if (latestSense?.zone === room.zone && latestSense.survivorIds?.length)
        score += 2;
      if (searched.has(room.id)) score -= 12;
      return { id: room.id, score };
    });
    if (
      first("killerSearch") &&
      !searched.has(here) &&
      (view.noise.includes(here) ||
        (lastEncounter?.roomId === here &&
          lastEncounter.round >= view.round - 1))
    ) {
      return skill("chainsaw")[0] || first("killerSearch");
    }
    if (first("endTurn") && !first("killerMove")) {
      const blocks = skill("barricade");
      return blocks.length && random() < 0.45 ? pick(blocks) : first("endTurn");
    }
    const sensing = skill("sense");
    if (sensing.length && !latestSense && !view.noise.length && random() < 0.65)
      return pick(sensing);
    const adjacent = (id) =>
      catalog.edges
        .filter((e) => e.includes(id))
        .map((e) => (e[0] === id ? e[1] : e[0]));
    function distances(from) {
      const distance = new Map([[from, 0]]),
        queue = [from];
      for (let i = 0; i < queue.length; i++) {
        const room = queue[i];
        for (const n of adjacent(room))
          if (!distance.has(n)) {
            distance.set(n, distance.get(room) + 1);
            queue.push(n);
          }
      }
      return distance;
    }
    const fromHere = distances(here);
    for (const t of targets)
      t.rank = t.score - 0.7 * fromHere.get(t.id) + random() * 2.2;
    const target = targets.sort((a, b) => b.rank - a.rank)[0].id;
    if (here === target && first("killerSearch") && !searched.has(here))
      return first("killerSearch");
    const toward = distances(target);
    const step = actions
      .filter((a) => a.type === "killerMove")
      .sort((a, b) => toward.get(a.roomId) - toward.get(b.roomId))[0];
    if (step) {
      const quick = skill("pursue").find((a) => a.roomId === step.roomId);
      return quick && here !== target ? quick : step;
    }
    return first("endTurn") || actions[0];
  }
  if (typeof module === "object" && module.exports)
    module.exports = { chooseHunterAction };
  else global.TerrorscapeHunter = { chooseHunterAction };
})(globalThis);
