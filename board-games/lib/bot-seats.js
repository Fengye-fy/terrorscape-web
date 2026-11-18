'use strict';
const { randomUUID } = require('node:crypto');
const { fail } = require('./errors');

function botMode(plugin) {
  if (plugin.manifest.botActionMode === 'projected-legal' && typeof plugin.chooseBotAction === 'function') return 'projected';
  if (typeof plugin.chooseBotAction === 'function') return 'simultaneous';
  if (typeof plugin.playBotMove === 'function') return 'scheduled';
  return null;
}

function prepareSeats(room, plugin, body = {}) {
  const mode = botMode(plugin);
  for (const field of ['fillBots', 'fillWithBots']) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') fail('INVALID_INPUT', `${field} 必须是布尔值`);
  }
  if (body.fillBots !== undefined && body.fillWithBots !== undefined && body.fillBots !== body.fillWithBots) {
    fail('INVALID_INPUT', 'fillBots 与 fillWithBots 不能相互矛盾');
  }
  const fillBots = body.fillBots ?? body.fillWithBots;
  if (fillBots && !mode) fail('BOTS_UNSUPPORTED', '这款桌游未提供人机补位');
  // The released Dune contract requires ready + explicit fill. The projected
  // Terrorscape contract lets clicking start ready the host and fill a solo room.
  if (mode === 'projected' || (fillBots && plugin.manifest.autoReadyHostOnBotStart)) room.players.find(p => p.id === room.hostPlayerId).ready = true;
  const shouldFill = fillBots ?? (mode === 'projected' && room.players.length < plugin.manifest.minPlayers);
  if (shouldFill) {
    let number = 0;
    for (let seat = room.players.length + 1; seat <= room.capacity; seat++) {
      number++;
      room.players.push({ id: randomUUID(), accountId: null,
        name: mode === 'projected' ? '电脑 ' + seat + ' 号' : number + ' 号人机', ready: true, isBot: true, botNumber: number });
    }
  }
  const minimum = plugin.minPlayersForOptions?.(room.options || {}) ?? plugin.manifest.minPlayers;
  if (room.players.length < minimum) fail('NOT_ENOUGH_PLAYERS', '至少需要 ' + minimum + ' 个席位', 409);
  if (room.players.some(p => !p.ready)) fail('PLAYERS_NOT_READY', '请等其他玩家准备后再开始', 409);
}

// Released Good Cop games can ask several seats to respond simultaneously, even
// with a null or human currentPlayerId. Keep that API separate from legal-array AI.
function playBotMoves(room, plugin) {
  if (botMode(plugin) !== 'simultaneous') return { moves: 0, more: false };
  const bots = room.players.filter(player => player.isBot);
  let moves = 0;
  const deadline = performance.now() + 55;
  while (room.status === 'playing' && bots.length) {
    let played = false;
    for (const bot of bots) {
      const view = plugin.getView(room.game, bot.id);
      const action = plugin.chooseBotAction(view, bot.id);
      if (!action) continue;
      room.game = plugin.applyAction(room.game, bot.id, action);
      room.status = room.game.phase === 'finished' || room.game.status === 'finished' ? 'finished' : 'playing';
      played = true;
      break;
    }
    if (!played) break;
    moves++;
    if (moves >= 32 || performance.now() >= deadline) return { moves, more: room.status === 'playing' };
  }
  return { moves, more: false };
}

// Commit only human decision points and completed games. A room retry replays the
// entire version, including all automatic moves, without advancing any seat twice.
function advanceBots(room, plugin) {
  if (room.game.phase === 'finished' || room.game.status === 'finished') {
    room.status = 'finished';
    return;
  }
  if (botMode(plugin) !== 'projected') return;
  const bots = new Set(room.players.filter(p => p.isBot).map(p => p.id));
  let steps = 0;
  while (room.game.phase !== 'finished' && room.game.status !== 'finished') {
    const id = room.game.currentPlayerId;
    if (!bots.has(id)) return;
    const view = plugin.getView(room.game, id);
    const action = plugin.chooseBotAction(view, view.legalActions);
    if (!action || ++steps > 128) fail('BOT_ACTION_FAILED', '电脑席位暂时无法行动，请重试', 500);
    room.game = plugin.applyAction(room.game, id, action);
  }
  room.status = 'finished';
}

module.exports = { botMode, prepareSeats, advanceBots, playBotMoves };
