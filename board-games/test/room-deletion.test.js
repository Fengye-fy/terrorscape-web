'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { JsonStore } = require('../lib/store');
const { RoomService } = require('../lib/rooms');
const { createBoardGamesHandler } = require('../server');
const users = ['host', 'guest', 'outside'].map(key => ({ key, name: key }));
const fixture = {
  manifest: { id: 'fixture', name: '测试游戏', minPlayers: 2, maxPlayers: 4, ruleset: 'test' },
  createGame: ({ players }) => ({ players, phase: 'playing' }), getView: state => state,
  getLegalActions: () => [], applyAction: state => state
};
const registry = new Map([['fixture', fixture]]);
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'room-deletion-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('room-deletion-test-'));
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  const store = new JsonStore(dir);
  return { dir, store, service: new RoomService(store, registry) };
}
const createBody = { gameId: 'fixture', capacity: 2, visibility: 'public', requestId: 'create-delete-test' };
const create = service => service.create(users[0], createBody).room;
const remove = (service, room, user = users[0], extra = {}) => service.mutate(room.id, user, 'delete', {
  expectedVersion: room.version, requestId: 'delete-room-test', ...extra
});

for (const status of ['waiting', 'playing', 'finished', 'closed']) test(`host permanently deletes ${status} rooms with a durable idempotent receipt`, t => {
  const { service, store, dir } = setup(t);
  const room = create(service);
  store.state.rooms[room.id].status = status;
  if (status === 'finished') store.commit({ ...store.state, createRequests: [] });
  const deleted = remove(service, room);
  assert.deepEqual(deleted, { room: null, roomId: room.id, deleted: true, replayed: false, appliedVersion: 2 });
  assert.equal(Object.hasOwn(store.state.rooms, room.id), false);
  assert.deepEqual(service.list(users[0]), []);
  assert.deepEqual(service.list(users[2]), []);
  assert.throws(() => service.find(room.id), { code: 'ROOM_NOT_FOUND' });
  const restored = new RoomService(new JsonStore(dir), registry);
  assert.equal(remove(restored, room).replayed, true);
  assert.throws(() => remove(restored, room, users[1]), { code: 'ROOM_NOT_FOUND' });
  assert.throws(() => remove(restored, room, users[0], { expectedVersion: 2 }), { code: 'REQUEST_ID_REUSED' });
  assert.throws(() => remove(restored, room, users[0], { requestId: 'different-delete' }), { code: 'ROOM_NOT_FOUND' });
  assert.deepEqual(restored.create(users[0], createBody), { room: null, roomId: room.id, replayed: true, appliedVersion: 1 });
  // Even after normal creation receipt rotation, a deleted creation cannot reappear.
  restored.store.commit({ ...restored.store.state, createRequests: [] });
  assert.equal(restored.create(users[0], createBody).room, null);
  assert.throws(() => restored.create(users[0], { ...createBody, capacity: 3 }), { code: 'REQUEST_ID_REUSED' });
  const fresh = restored.create(users[0], { ...createBody, requestId: 'brand-new-room-request' }).room;
  assert.notEqual(fresh.id, room.id);
});

test('deletion capability follows the host; members and outsiders cannot delete or bypass version checks', t => {
  const { service } = setup(t);
  let room = create(service);
  assert.equal(room.canDelete, true);
  assert.equal(service.list(users[2])[0].canDelete, false);
  room = service.mutate(room.id, users[1], 'join', { requestId: 'guest-join-test' }).room;
  assert.equal(room.canDelete, false);
  assert.throws(() => remove(service, room, users[1]), { code: 'HOST_ONLY' });
  assert.throws(() => remove(service, room, users[2]), { code: 'HOST_ONLY' });
  assert.throws(() => remove(service, room, users[0], { expectedVersion: 1 }), { code: 'VERSION_CONFLICT' });
  assert.throws(() => remove(service, room, users[0], { expectedVersion: undefined }), { code: 'VERSION_REQUIRED' });
  service.mutate(room.id, users[0], 'leave', { expectedVersion: room.version, requestId: 'host-leave-test' });
  room = service.view(service.find(room.id), users[1]);
  assert.equal(room.canDelete, true);
  assert.throws(() => remove(service, room, users[0]), { code: 'HOST_ONLY' });
  assert.equal(remove(service, room, users[1]).room, null);
});

test('legacy rooms and empty closed rooms remain deletable, and failed deletion leaves both storage layers untouched', t => {
  const { service, store, dir } = setup(t);
  let room = create(service);
  assert.equal(store.state.deletedRooms, undefined);
  const before = JSON.stringify(store.state);
  const disk = fs.readFileSync(store.file, 'utf8');
  const commit = store.commit;
  store.commit = () => { throw Object.assign(new Error('disk unavailable'), { code: 'PERSIST_FAILED' }); };
  assert.throws(() => remove(service, room), { code: 'PERSIST_FAILED' });
  assert.equal(JSON.stringify(store.state), before);
  assert.equal(fs.readFileSync(store.file, 'utf8'), disk);
  store.commit = commit;
  service.mutate(room.id, users[0], 'leave', { expectedVersion: room.version, requestId: 'last-leave-test' });
  room = { ...room, version: 2 };
  assert.equal(service.list(users[0])[0].canDelete, true);
  assert.equal(remove(service, room).room, null);
  assert.equal(remove(new RoomService(new JsonStore(dir), registry), room).replayed, true);
});

test('all owned archives remain listed beyond 100 public rooms and transferred empty rooms belong to the final host', t => {
  const { service, store } = setup(t);
  let room = create(service);
  const template = store.state.rooms[room.id];
  const rooms = {};
  for (let i = 0; i < 105; i++) {
    const id = i.toString(16).padStart(12, '0').toUpperCase();
    rooms[id] = { ...template, id, status: 'closed', updatedAt: '2000-01-01T00:00:00.000Z' };
  }
  for (let i = 105; i < 210; i++) {
    const id = i.toString(16).padStart(12, '0').toUpperCase();
    rooms[id] = { ...template, id, players: template.players.map(p => ({ ...p, accountId: 'outside' })) };
  }
  store.commit({ ...store.state, rooms: { ...rooms, [room.id]: template } });
  assert.equal(service.list(users[0]).filter(r => r.canDelete).length, 106);
  assert.equal(service.list(users[0]).filter(r => !r.canDelete).length, 100);
  room = service.mutate(room.id, users[1], 'join', { requestId: 'transfer-guest-join' }).room;
  service.mutate(room.id, users[0], 'leave', { expectedVersion: room.version, requestId: 'first-host-leave' });
  room = service.view(service.find(room.id), users[1]);
  service.mutate(room.id, users[1], 'leave', { expectedVersion: room.version, requestId: 'last-host-leave' });
  room = { ...room, version: room.version + 1 };
  assert.equal(service.list(users[1]).find(r => r.id === room.id).canDelete, true);
  assert.throws(() => remove(service, room, users[0]), { code: 'HOST_ONLY' });
  assert.equal(remove(service, room, users[1]).room, null);
});

test('SDK and real HTTP delete a room, enforce CSRF and hide it from former members on refresh', async t => {
  const { dir } = setup(t);
  let handler = createBoardGamesHandler({ dataDir: dir, registry, getUser: async req => {
    const key = req.headers['x-dev-user']; return key ? { key, name: key } : null;
  } });
  const server = http.createServer(async (req, res) => { if (!await handler(req, res)) { res.writeHead(404); res.end(); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/board-games`;
  const { createBoardGamesClient } = await import(pathToFileURL(path.resolve(__dirname, '../client/board-games.mjs')).href);
  const host = createBoardGamesClient({ baseUrl, devUser: 'host' });
  const guest = createBoardGamesClient({ baseUrl, devUser: 'guest' });
  let { room } = await host.create({ gameId: 'fixture', capacity: 2 });
  ({ room } = await guest.join(room.id));
  await assert.rejects(guest.deleteRoom(room), { code: 'HOST_ONLY' });
  const csrf = await fetch(`${baseUrl}/rooms/${room.id}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dev-User': 'host' }, body: JSON.stringify({ requestId: 'csrf-delete-test', expectedVersion: room.version }) });
  assert.equal(csrf.status, 403);
  const result = await host.deleteRoom(room, { requestId: 'sdk-delete-retry' });
  assert.equal(result.room, null);
  handler = createBoardGamesHandler({ dataDir: dir, registry, getUser: async req => {
    const key = req.headers['x-dev-user']; return key ? { key, name: key } : null;
  } });
  assert.equal((await host.deleteRoom(room, { requestId: 'sdk-delete-retry' })).replayed, true);
  await assert.rejects(host.room(room.id), { code: 'ROOM_NOT_FOUND', status: 404 });
  await assert.rejects(guest.room(room.id), { code: 'ROOM_NOT_FOUND', status: 404 });
  assert.deepEqual((await host.rooms()).rooms, []);
  assert.deepEqual((await guest.rooms()).rooms, []);
});
