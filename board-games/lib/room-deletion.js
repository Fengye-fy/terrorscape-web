'use strict';
const { fail } = require('./errors');
const { botMode } = require('./bot-seats');
const { unlinkRoom } = require('./room-series');
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function hostAccount(room) {
  const host = room.players.find(player => player.id === room.hostPlayerId);
  if (host) return host.accountId;
  // Legacy empty rooms retain the last host's leave event and request receipt.
  const last = room.events.slice().reverse().find(event => event.actorPlayerId === room.hostPlayerId);
  return last && room.requests.find(request => request.version === last.version)?.accountId;
}
function canDelete(room, user) { return Boolean(user?.key && hostAccount(room) === user.key); }
function deletedCreation(state, accountId, requestId) {
  return Object.values(state.deletedRooms || {}).flatMap(room => room.createRequests || [])
    .find(request => request.accountId === accountId && request.requestId === requestId);
}
function deleteRoom(service, id, user, body, key, hash) {
  if (typeof id !== 'string' || !/^[A-F0-9]{12}$/.test(id)) fail('ROOM_NOT_FOUND', '房间不存在', 404);
  const deleted = service.store.state.deletedRooms || {};
  if (has(deleted, id)) {
    const receipt = deleted[id];
    if (receipt.accountId === user.key && receipt.requestId === key) {
      if (receipt.hash !== hash) fail('REQUEST_ID_REUSED', '同一 requestId 不能用于不同请求', 409);
      return { room: null, roomId: id, deleted: true, replayed: true, appliedVersion: receipt.version };
    }
    fail('ROOM_NOT_FOUND', '房间不存在', 404);
  }
  // Published Dune versions used a bounded receipt array. Accept those retries
  // without requiring an eager storage migration or recreating the deleted room.
  if (!has(service.store.state.rooms, id)) {
    const receipt = (service.store.state.deleteRequests || []).find(request => request.roomId === id && request.accountId === user.key && request.requestId === key);
    if (receipt) {
      if (receipt.hash !== hash) fail('REQUEST_ID_REUSED', '同一 requestId 不能用于不同请求', 409);
      return { room: null, roomId: id, deleted: true, replayed: true, appliedVersion: receipt.version };
    }
  }
  const room = service.find(id);
  const legacyDuneContract = ['scheduled', 'simultaneous'].includes(botMode(service.plugin(room.gameId)));
  if (legacyDuneContract) {
    // Preserve released membership/version/permission error precedence. A final
    // owner of an empty archived room is additionally recoverable from receipts.
    if (!canDelete(room, user)) service.member(room, user);
  } else if (!canDelete(room, user)) fail('HOST_ONLY', '仅房主可删除房间', 403);
  const previous = room.requests.find(request => request.accountId === user.key && request.requestId === key);
  if (previous) fail('REQUEST_ID_REUSED', '同一 requestId 不能用于不同请求', 409);
  if (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1) fail('VERSION_REQUIRED', '请提交当前 expectedVersion');
  if (body.expectedVersion !== room.version) fail('VERSION_CONFLICT', '房间已更新，请刷新后重新操作', 409, { currentVersion: room.version });
  if (legacyDuneContract && (!canDelete(room, user) || service.plugin(room.gameId).manifest.allowRoomDeletion !== true)) {
    fail('DELETE_FORBIDDEN', '你没有删除这间房的权限', 403);
  }
  const rooms = { ...service.store.state.rooms };
  unlinkRoom(rooms, room, service.plugin(room.gameId), new Date().toISOString());
  delete rooms[id];
  const version = room.version + 1;
  const receipt = {
    accountId: user.key, requestId: key, hash, version,
    createRequests: room.creationRequest ? [room.creationRequest] :
      service.store.state.createRequests.filter(request => request.roomId === id)
  };
  const legacyReceipt = { accountId: user.key, requestId: key, hash, roomId: id, version };
  service.store.commit({ ...service.store.state, rooms,
    createRequests: service.store.state.createRequests.filter(request => request.roomId !== id),
    deleteRequests: [...(service.store.state.deleteRequests || []), legacyReceipt].slice(-5000),
    deletedRooms: { ...deleted, [id]: receipt } });
  service.cancelBots(id);
  return { room: null, roomId: id, deleted: true, replayed: false, appliedVersion: version };
}
module.exports = { canDelete, deletedCreation, deleteRoom };
