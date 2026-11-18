'use strict';
const copy = value => JSON.parse(JSON.stringify(value));

function savedAwards(room, awards) {
  return room.players.filter(player => awards?.[player.id]).map(player => ({
    ...(player.isBot ? { botNumber: player.botNumber } : { accountId: player.accountId }),
    awards: copy(awards[player.id])
  }));
}

function mapAwards(players, saved) {
  const mapped = {};
  for (const player of players) {
    const record = saved.find(row => player.isBot ? row.botNumber === player.botNumber : row.accountId === player.accountId);
    if (record) mapped[player.id] = copy(record.awards);
  }
  return mapped;
}

// Unlink both neighbors atomically with the tombstone. A waiting continuation
// keeps an account/bot-number reward snapshot even after its parent is removed.
function unlinkRoom(rooms, room, plugin, now) {
  const prior = rooms[room.previousRoomId];
  if (prior?.nextRoomId === room.id) {
    const { nextRoomId, ...rest } = prior;
    rooms[prior.id] = { ...rest, version: prior.version + 1, updatedAt: now };
  }
  const child = rooms[room.nextRoomId];
  if (child?.previousRoomId === room.id) {
    const { previousRoomId, ...rest } = child;
    if (child.status === 'waiting' && !child.inheritedAwards) {
      rest.inheritedAwards = savedAwards(room, plugin.getContinuation?.(room.game));
    }
    rooms[child.id] = { ...rest, version: child.version + 1, updatedAt: now };
  }
}

module.exports = { savedAwards, mapAwards, unlinkRoom };
