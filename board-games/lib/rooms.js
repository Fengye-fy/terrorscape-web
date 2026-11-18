'use strict';
const crypto = require('node:crypto');
const { fail, object } = require('./errors');
const { botMode, prepareSeats, advanceBots, playBotMoves } = require('./bot-seats');
const deletion = require('./room-deletion');
const { savedAwards, mapAwards } = require('./room-series');

const copy = value => JSON.parse(JSON.stringify(value));
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function fingerprint(type, body) {
  const { requestId, ...payload } = body;
  return crypto.createHash('sha256').update(canonical({ type, payload })).digest('hex');
}
function requestId(body) {
  if (typeof body.requestId !== 'string' || !/^[\w-]{8,80}$/.test(body.requestId)) {
    fail('INVALID_REQUEST_ID', 'requestId 必须是 8–80 位字母、数字、下划线或连字符');
  }
  return body.requestId;
}
function text(value, fallback, max = 60) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f]/.test(value)) {
    fail('INVALID_INPUT', `文本长度须在 1–${max} 之间且不能有控制字符`);
  }
  return value.trim();
}

const lifecycleEvents = new Set(['created', 'join', 'ready', 'leave', 'start', 'close']);
function recordEvent(room, actorPlayerId, type, privateAction = false) {
  room.version++;
  room.updatedAt = new Date().toISOString();
  if (!privateAction) room.events.push({ version: room.version, type, actorPlayerId, at: room.updatedAt });
  room.events = room.events.slice(-100);
}

function botToMove(room) {
  return room?.status === 'playing' && room.players.some(p => p.isBot && p.id === room.game?.currentPlayerId);
}

function eligibleBots(room, plugin) {
  if (room?.status !== 'playing' || !plugin) return false;
  if (botMode(plugin) === 'simultaneous') return room.players.some(player => player.isBot);
  return botMode(plugin) === 'scheduled' && botToMove(room);
}

class RoomService {
  constructor(store, plugins) {
    this.store = store;
    this.plugins = plugins;
    this.botTimers = new Map();
    for (const room of Object.values(store.state.rooms)) this.scheduleBots(room);
  }

  cancelBots(id) {
    clearTimeout(this.botTimers.get(id));
    this.botTimers.delete(id);
  }

  dispose() {
    for (const id of this.botTimers.keys()) this.cancelBots(id);
  }

  scheduleBots(room, delay = 350) {
    const plugin = room && this.plugins.get(room.gameId);
    if (!eligibleBots(room, plugin)) {
      if (room) this.cancelBots(room.id);
      return;
    }
    if (this.botTimers.has(room.id)) return;
    const id = room.id;
    const timer = setTimeout(() => {
      this.botTimers.delete(id);
      const current = this.store.state.rooms[id];
      if (!eligibleBots(current, this.plugins.get(current?.gameId))) return;
      try {
        this.advanceBots(current);
      } catch (error) {
        console.error('[board-games] 人机回合暂缓', id, error.code || error.message);
        this.scheduleBots(this.store.state.rooms[id], Math.min(delay * 4, 60000));
      }
    }, delay);
    timer.unref();
    this.botTimers.set(id, timer);
  }

  advanceBots(current) {
    const plugin = this.plugin(current.gameId);
    if (!eligibleBots(current, plugin)) return;
    const room = { ...current, events: [...current.events] };
    if (botMode(plugin) === 'simultaneous') {
      const { moves, more } = playBotMoves(room, plugin);
      if (!moves) return;
      room.version++;
      room.updatedAt = new Date().toISOString();
      this.store.commit({ ...this.store.state, rooms: { ...this.store.state.rooms, [room.id]: room } });
      if (more) this.scheduleBots(room, 75);
      return;
    }
    const deadline = performance.now() + 35;
    for (let count = 0; count < 12 && botToMove(room); count++) {
      const actor = room.game.currentPlayerId;
      const { action, game } = plugin.playBotMove(room.game, actor);
      room.game = game;
      room.status = game.phase === 'finished' || game.status === 'finished' ? 'finished' : 'playing';
      recordEvent(room, actor, action.type, plugin.manifest.privateActions === true);
      if (room.game.currentPlayerId !== actor || performance.now() >= deadline) break;
    }
    this.store.commit({ ...this.store.state, rooms: { ...this.store.state.rooms, [room.id]: room } });
    this.scheduleBots(room);
  }

  plugin(id) {
    if (!this.plugins.has(id)) fail('GAME_NOT_FOUND', '桌游不存在', 404);
    return this.plugins.get(id);
  }

  find(id) {
    if (typeof id !== 'string' || !/^[A-F0-9]{12}$/.test(id) || !has(this.store.state.rooms, id)) {
      fail('ROOM_NOT_FOUND', '房间不存在', 404);
    }
    return this.store.state.rooms[id];
  }

  member(room, user) {
    const player = room.players.find(item => item.accountId === user.key);
    if (!player) fail('NOT_A_MEMBER', '请先加入房间', 403);
    return player;
  }

  canDelete(room, user) { return deletion.canDelete(room, user); }

  nextRoom(room) {
    const next = room.nextRoomId && this.store.state.rooms[room.nextRoomId];
    return next && next.status !== 'closed' ? next : null;
  }

  summary(room, user) {
    return {
      id: room.id, gameId: room.gameId, name: room.name, status: room.status,
      visibility: room.visibility, capacity: room.capacity, version: room.version,
      options: copy(room.options || {}), canDelete: deletion.canDelete(room, user),
      hostPlayerId: room.hostPlayerId, createdAt: room.createdAt, updatedAt: room.updatedAt,
      players: room.players.map(({ id, name, ready, isBot }) => ({ id, name, ready, ...(isBot ? { isBot: true } : {}) }))
    };
  }

  view(room, user) {
    const player = this.member(room, user);
    const plugin = this.plugin(room.gameId);
    const next = this.nextRoom(room);
    return {
      ...this.summary(room, user), viewerPlayerId: player.id, ruleset: room.game?.ruleset ||
        (plugin.rulesetForOptions ? plugin.rulesetForOptions(room.options || {}) : plugin.manifest.ruleset),
      ...(next ? { nextRoomId: next.id } : {}),
      game: room.game ? plugin.getView(room.game, player.id) : null,
      legalActions: room.status === 'playing' ? plugin.getLegalActions(room.game, player.id) : [],
      events: (plugin.manifest.privateActions === true
        ? room.events.filter(event => lifecycleEvents.has(event.type)) : room.events).slice(-50)
    };
  }

  list(user) {
    const rooms = Object.values(this.store.state.rooms).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const mine = room => room.players.some(player => player.accountId === user.key) || deletion.canDelete(room, user);
    return [...rooms.filter(mine), ...rooms.filter(room => !mine(room) && room.visibility === 'public' && room.status === 'waiting').slice(0, 100)]
      .map(room => this.summary(room, user));
  }

  create(user, body) {
    object(body);
    const idempotencyKey = requestId(body);
    const hash = fingerprint('create', body);
    const previous = this.store.state.createRequests.find(item => item.accountId === user.key && item.requestId === idempotencyKey) ||
      Object.values(this.store.state.rooms).map(room => room.creationRequest).find(item => item?.accountId === user.key && item.requestId === idempotencyKey) ||
      deletion.deletedCreation(this.store.state, user.key, idempotencyKey);
    if (previous) {
      if (previous.hash !== hash) fail('REQUEST_ID_REUSED', '同一 requestId 不能用于不同请求', 409);
      const room = this.store.state.rooms[previous.roomId];
      if (!room) return { room: null, roomId: previous.roomId, replayed: true, appliedVersion: 1 };
      const stillMember = room.players.some(player => player.accountId === user.key);
      return { room: stillMember ? this.view(room, user) : null, roomId: room.id, replayed: true, appliedVersion: 1 };
    }
    const plugin = this.plugin(body.gameId);
    let previousRoom, inheritedAwards;
    if (body.previousRoomId !== undefined) {
      previousRoom = this.find(body.previousRoomId);
      const member = this.member(previousRoom, user);
      if (member.id !== previousRoom.hostPlayerId) fail('HOST_ONLY', '仅房主可开启续局', 403);
      const awards = previousRoom.gameId === body.gameId && previousRoom.status === 'finished' && plugin.getContinuation?.(previousRoom.game);
      if (!awards) fail('CONTINUATION_UNAVAILABLE', '这间房没有可继承的已结算对局', 409);
      const next = this.nextRoom(previousRoom);
      if (next) fail('NEXT_ROOM_EXISTS', '续局已经建立', 409, { roomId: next.id });
      inheritedAwards = savedAwards(previousRoom, awards);
    }
    const settings = previousRoom || body;
    const capacity = settings.capacity === undefined ? plugin.manifest.maxPlayers : settings.capacity;
    const suppliedOptions = settings.options === undefined ? {} : object(settings.options, 'options');
    if (!plugin.validateOptions && Object.keys(suppliedOptions).length) {
      fail('UNSUPPORTED_OPTIONS', '当前版本尚无可配置的游戏选项');
    }
    const options = plugin.validateOptions ? plugin.validateOptions(suppliedOptions) : {};
    const minimum = plugin.minPlayersForOptions?.(options) ?? plugin.manifest.minPlayers;
    if (!Number.isInteger(capacity) || capacity < minimum || capacity > plugin.manifest.maxPlayers) {
      fail('INVALID_CAPACITY', `此配置支持 ${minimum}–${plugin.manifest.maxPlayers} 人`);
    }
    const visibility = settings.visibility === undefined ? 'private' : settings.visibility;
    if (!['public', 'private'].includes(visibility)) fail('INVALID_INPUT', 'visibility 必须是 public 或 private');
    const rooms = Object.values(this.store.state.rooms);
    if (rooms.length >= 5000) fail('ROOM_LIMIT', '存档数量已达上限，请联系站长归档', 409);
    if (rooms.filter(room => ['waiting', 'playing'].includes(room.status) && room.players.some(player => player.accountId === user.key)).length >= 10) {
      fail('ROOM_LIMIT', '最多同时参加 10 个未结束房间', 409);
    }
    let id;
    do { id = crypto.randomBytes(6).toString('hex').toUpperCase(); } while (has(this.store.state.rooms, id) || has(this.store.state.deletedRooms || {}, id) ||
      (this.store.state.deleteRequests || []).some(receipt => receipt.roomId === id));
    const player = { id: crypto.randomUUID(), accountId: user.key, name: text(user.name, '玩家'), ready: false };
    const now = new Date().toISOString();
    const room = {
      id, gameId: body.gameId, name: text(settings.name, plugin.manifest.name + '的房间'), capacity,
      ...(previousRoom ? { previousRoomId: previousRoom.id, inheritedAwards } : {}),
      visibility, options: copy(options), status: 'waiting', version: 1, hostPlayerId: player.id,
      players: [player], game: null, createdAt: now, updatedAt: now, requests: [],
      creationRequest: { accountId: user.key, requestId: idempotencyKey, hash, roomId: id },
      events: [{ version: 1, type: 'created', actorPlayerId: player.id, at: now }]
    };
    const next = {
      ...this.store.state, rooms: { ...this.store.state.rooms,
        ...(previousRoom ? { [previousRoom.id]: { ...previousRoom, nextRoomId: id, version: previousRoom.version + 1, updatedAt: now } } : {}),
        [id]: room },
      createRequests: [...this.store.state.createRequests, { accountId: user.key, requestId: idempotencyKey, hash, roomId: id }].slice(-5000)
    };
    this.store.commit(next);
    return { room: this.view(room, user), replayed: false, appliedVersion: 1 };
  }

  mutate(id, user, type, body) {
    object(body);
    const key = requestId(body);
    if (type === 'delete') return deletion.deleteRoom(this, id, user, body, key, fingerprint(type, body));
    const current = this.find(id);
    const hash = fingerprint(type, body);
    const previous = current.requests.find(item => item.accountId === user.key && item.requestId === key);
    if (previous) {
      if (previous.hash !== hash) fail('REQUEST_ID_REUSED', '同一 requestId 不能用于不同请求', 409);
      const stillMember = current.players.some(player => player.accountId === user.key);
      return {
        room: stillMember ? this.view(current, user) : null, roomId: id,
        replayed: true, appliedVersion: previous.version
      };
    }
    const room = copy(current);
    let player, moreBotMoves = false;
    if (type === 'join') {
      if (room.status !== 'waiting') fail('ROOM_NOT_WAITING', '对局已开始或关闭', 409);
      player = room.players.find(item => item.accountId === user.key);
      if (player) fail('ALREADY_JOINED', '已在房间中，请读取房间继续', 409);
      if (room.players.length >= room.capacity) fail('ROOM_FULL', '房间已满', 409);
      const active = Object.values(this.store.state.rooms).filter(item => ['waiting', 'playing'].includes(item.status) && item.players.some(member => member.accountId === user.key));
      if (active.length >= 10) fail('ROOM_LIMIT', '最多同时参加 10 个未结束房间', 409);
      player = { id: crypto.randomUUID(), accountId: user.key, name: text(user.name, '玩家'), ready: false };
      room.players.push(player);
    } else {
      player = this.member(room, user);
      if (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1) fail('VERSION_REQUIRED', '请提交当前 expectedVersion');
      if (body.expectedVersion !== room.version) fail('VERSION_CONFLICT', '房间已更新，请刷新后重新操作', 409, { currentVersion: room.version });
      if (type === 'settings') {
        if (room.hostPlayerId !== player.id) fail('HOST_ONLY', '仅房主可修改设置', 403);
        if (room.status !== 'waiting') fail('ROOM_NOT_WAITING', '对局已开始或关闭', 409);
        const plugin = this.plugin(room.gameId);
        if (!plugin.manifest.supportsRoomSettings || !plugin.validateOptions) fail('SETTINGS_UNSUPPORTED', '这款桌游不支持等待室修改设置');
        const options = plugin.validateOptions(object(body.options, 'options'));
        const minimum = plugin.minPlayersForOptions?.(options) ?? plugin.manifest.minPlayers;
        if (room.capacity < minimum) fail('INVALID_CAPACITY', `当前设置至少需要 ${minimum} 个座位`);
        if (canonical(options) !== canonical(room.options || {})) {
          room.options = copy(options);
          // Everyone must acknowledge the new rules before the host can start.
          for (const member of room.players) member.ready = false;
        }
      } else if (type === 'ready') {
        if (room.status !== 'waiting') fail('ROOM_NOT_WAITING', '对局已开始或关闭', 409);
        if (typeof body.ready !== 'boolean') fail('INVALID_INPUT', 'ready 必须是布尔值');
        player.ready = body.ready;
      } else if (type === 'leave') {
        if (room.status !== 'waiting') fail('ROOM_NOT_WAITING', '对局中不能退出座位；重新连接会恢复原座位', 409);
        room.players = room.players.filter(item => item.id !== player.id);
        if (!room.players.length) room.status = 'closed';
        else if (room.hostPlayerId === player.id) room.hostPlayerId = room.players[0].id;
      } else if (type === 'start') {
        if (room.hostPlayerId !== player.id) fail('HOST_ONLY', '仅房主可开始', 403);
        if (room.status !== 'waiting') fail('ROOM_NOT_WAITING', '对局已开始或关闭', 409);
        const plugin = this.plugin(room.gameId);
        prepareSeats(room, plugin, body);
        const setup = { players: room.players.map(({ id, name }) => ({ id, name })), options: copy(room.options || {}) };
        if (room.inheritedAwards) {
          setup.continuation = mapAwards(room.players, room.inheritedAwards);
          delete room.inheritedAwards;
        } else if (room.previousRoomId) {
          const prior = this.find(room.previousRoomId);
          setup.continuation = mapAwards(room.players, savedAwards(prior, plugin.getContinuation(prior.game)));
        }
        room.game = plugin.createGame(setup);
        room.status = 'playing';
        advanceBots(room, plugin);
        moreBotMoves = playBotMoves(room, plugin).more;
      } else if (type === 'close') {
        if (room.hostPlayerId !== player.id) fail('HOST_ONLY', '仅房主可关闭房间', 403);
        if (!['waiting', 'playing'].includes(room.status)) fail('ROOM_CLOSED', '房间已经结束', 409);
        room.status = 'closed';
      } else if (type === 'actions') {
        if (room.status !== 'playing') fail('GAME_NOT_RUNNING', '当前没有进行中的对局', 409);
        const action = object(body.action, 'action');
        if (typeof action.type !== 'string') fail('INVALID_ACTION', 'action.type 必填');
        const plugin = this.plugin(room.gameId);
        room.game = plugin.applyAction(room.game, player.id, action);
        advanceBots(room, plugin);
        moreBotMoves = playBotMoves(room, plugin).more;
      } else fail('NOT_FOUND', '接口不存在', 404);
    }
    recordEvent(room, player.id, type === 'actions' ? body.action.type : type,
      type === 'actions' && this.plugin(room.gameId).manifest.privateActions === true);
    room.requests.push({ accountId: user.key, requestId: key, hash, version: room.version });
    room.requests = room.requests.slice(-256);
    this.store.commit({ ...this.store.state, rooms: { ...this.store.state.rooms, [id]: room } });
    if (moreBotMoves) this.scheduleBots(room, 75);
    else if (botMode(this.plugin(room.gameId)) === 'scheduled') this.scheduleBots(room);
    else this.cancelBots(room.id);
    return {
      room: type === 'leave' ? null : this.view(room, user), roomId: id,
      replayed: false, appliedVersion: room.version
    };
  }
}

module.exports = { RoomService };
