(function () {
  'use strict';
  const engine = globalThis.TerrorscapeEngine;
  const mount = document.getElementById('night-table');
  const saveKey = 'fengye.terrorscape.mansion.practice.v1';
  const survivorSeat = 'practice-team', hunterSeat = 'practice-hunter';
  const catalog = engine.getCatalog();
  let storage;
  try { storage = window.localStorage; } catch { /* The table can also run in memory. */ }
  let botTimer = 0, asyncBusy = false, storageFailed = false;
  const unique = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

  function newSession(options = {}) {
    const players = [{id:survivorSeat,name:'幸存者小队'}, {id:hunterSeat,name:'电脑追猎者'}];
    return { id: unique(), version: 1, game: engine.createGame({players, options}) };
  }
  function readSave() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(saveKey);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      const game = saved?.game;
      if (!saved.id || !Number.isInteger(saved.version) || game?.ruleset !== catalog.manifest.ruleset ||
          game.players?.[0]?.id !== survivorSeat || game.killer?.ownerId !== hunterSeat || game.survivors?.length !== 3) return null;
      engine.getView(game, survivorSeat);
      return saved;
    } catch { return null; }
  }
  function persist() {
    if (!storage) { storageFailed = true; return; }
    try { storage.setItem(saveKey, JSON.stringify(session)); }
    catch { storageFailed = true; }
  }
  let session = readSave() || newSession();
  const table = globalThis.TerrorscapeTable.createTable({
    catalog, mode:'practice', lobby:location.protocol === 'file:' ? null : mount.dataset.lobby,
    onAction: a => commit(survivorSeat,a), onRestart: reset
  });
  mount.replaceChildren(table.root);
  function paint() {
    clearTimeout(botTimer);
    const view = engine.getView(session.game,survivorSeat);
    table.update(view, view.legalActions, {version:session.id + '-' + session.version,busy:false});
    if (storageFailed) table.ping('浏览器无法保存进度，本局仍可继续游玩。');
    if (session.game.currentPlayerId === hunterSeat && session.game.phase !== 'finished' && !document.hidden) {
      botTimer = setTimeout(() => {
        const hunterView = engine.getView(session.game,hunterSeat);
        const action = globalThis.TerrorscapeHunter.chooseHunterAction(hunterView,catalog);
        if (action) commit(hunterSeat,action);
      },500);
    }
  }
  async function withLatest(operation) {
    if (asyncBusy) return;
    asyncBusy = true;
    try {
      const guarded = () => {
        const latest = storageFailed ? null : readSave();
        if (latest && (latest.id !== session.id || latest.version !== session.version)) { session = latest; return; }
        operation();
        persist();
      };
      if (navigator.locks) await navigator.locks.request(saveKey, guarded);
      else guarded();
    } catch (e) { table.ping(e.message || '无法执行这一步，请重新选择。'); }
    finally { asyncBusy = false; paint(); }
  }
  function commit(seat, action) {
    return withLatest(() => {
      const game = engine.applyAction(session.game,seat,action);
      session = { id:session.id, version:session.version + 1, game };
    });
  }
  function reset(options) {
    return withLatest(() => { session = newSession(options); });
  }
  window.addEventListener('storage', e => {
    if (e.key !== saveKey) return;
    const latest = readSave();
    if (latest && (latest.id !== session.id || latest.version > session.version)) {session = latest; paint();}
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(botTimer); else paint(); });
  window.addEventListener('pagehide', () => { clearTimeout(botTimer); table.dispose(); });
  window.addEventListener('pageshow', e => { if (e.persisted) paint(); });
  persist();
  paint();
})();
