// Co-op multiplayer via PlaySDK. Host-authoritative: the host runs enemy AI
// and broadcasts enemy state; non-host clients render enemies from snapshots
// and relay damage events back to the host.

const MP_SNAPSHOT_HZ = 20;
const MP_SNAPSHOT_INTERVAL = 1000 / MP_SNAPSHOT_HZ;
const MP_BUFFER_MS = 150;
const MP_EXTRAPOLATE_MS = 150;
const MP_MAX_PLAYERS = 4;

let room = null;
let localUserId = null;
let messageHandler = null;
let disconnectHandler = null;

// Remote player snapshot buffers: userId → { snaps: [], offset }
const remotes = new Map();

// ---- public API ----

export function mpAvailable() {
  return !!(window.PlaySDK && window.PlaySDK.multiplayer);
}

export function mpOpenLobby({ onStart, onCancel }) {
  if (!mpAvailable()) return;
  PlaySDK.multiplayer.showLobby({
    maxPlayers: MP_MAX_PLAYERS,
    onStart: () => {
      room = PlaySDK.multiplayer.getRoom();
      _captureUserId();
      onStart(room.isHost);
    },
    onCancel,
  });
}

export function mpIsHost() { return room ? room.isHost : true; }
export function mpRoom() { return room; }
export function mpLocalUserId() { return localUserId; }

export function mpLeave() {
  if (room) { room.leave(); room = null; }
  remotes.clear();
}

export function mpSend(payload) {
  if (room) room.send(payload);
}

export function mpSetMessageHandler(fn) { messageHandler = fn; }
export function mpSetDisconnectHandler(fn) { disconnectHandler = fn; }

export function mpGetRemotes() { return remotes; }

// Ingest a plane-state snapshot for a remote player.
export function mpIngestPlaneState(fromUserId, msg) {
  if (fromUserId === localUserId) return;
  if (!remotes.has(fromUserId)) {
    remotes.set(fromUserId, { snaps: [], offset: null, mesh: null });
  }
  const r = remotes.get(fromUserId);
  const now = Date.now();
  if (r.offset === null) r.offset = now - msg.t;
  const localT = msg.t + r.offset;
  r.snaps.push({ ...msg, localT });
  // Keep last 30 snapshots (~1.5s of data).
  while (r.snaps.length > 30) r.snaps.shift();
}

// Interpolate a remote player's state for the current render frame.
export function mpInterpolateRemote(userId) {
  const r = remotes.get(userId);
  if (!r || r.snaps.length === 0) return null;
  const snaps = r.snaps;
  const targetT = Date.now() - MP_BUFFER_MS;

  // Find surrounding snapshots.
  let lo = null, hi = null;
  for (let i = snaps.length - 1; i >= 0; i--) {
    if (snaps[i].localT <= targetT) { lo = snaps[i]; hi = snaps[i + 1] || null; break; }
  }
  if (!lo) lo = snaps[0];
  if (!hi) {
    // Extrapolate from the last snapshot.
    const last = snaps[snaps.length - 1];
    const dt = (Date.now() - last.localT) / 1000;
    if (dt > MP_EXTRAPOLATE_MS / 1000) return last; // stale, just use last
    return {
      x: last.x + (last.vx || 0) * dt,
      y: last.y + (last.vy || 0) * dt,
      z: last.z + (last.vz || 0) * dt,
      yaw: last.yaw, pitch: last.pitch, roll: last.roll,
      hp: last.hp, alive: last.alive, dying: last.dying, firing: last.firing,
    };
  }
  // Linear interpolation.
  const span = hi.localT - lo.localT;
  const f = span > 0 ? Math.max(0, Math.min(1, (targetT - lo.localT) / span)) : 0;
  return {
    x: lo.x + (hi.x - lo.x) * f,
    y: lo.y + (hi.y - lo.y) * f,
    z: lo.z + (hi.z - lo.z) * f,
    yaw: lo.yaw + _angleDelta(lo.yaw, hi.yaw) * f,
    pitch: lo.pitch + (hi.pitch - lo.pitch) * f,
    roll: lo.roll + (hi.roll - lo.roll) * f,
    hp: hi.hp, alive: hi.alive, dying: hi.dying, firing: hi.firing,
  };
}

// ---- init: wire PlaySDK events ----

export function mpInit() {
  if (!mpAvailable()) return;
  PlaySDK.multiplayer.on('game', (fromUserId, msg) => {
    if (msg.type === 'plane-state') {
      mpIngestPlaneState(fromUserId, msg);
    }
    if (messageHandler) messageHandler(fromUserId, msg);
  });
  PlaySDK.multiplayer.on('disconnected', () => {
    room = null;
    remotes.clear();
    if (disconnectHandler) disconnectHandler();
  });
  PlaySDK.multiplayer.on('kicked', () => {
    room = null;
    remotes.clear();
    if (disconnectHandler) disconnectHandler();
  });
}

// ---- helpers ----

function _captureUserId() {
  // PlaySDK doesn't expose getUserId; capture from URL token or room player list.
  try {
    const params = new URLSearchParams(location.search);
    const token = params.get('play_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      localUserId = payload.sub;
      return;
    }
  } catch (_) { /* ignore */ }
  // Fallback: if room has exactly one player matching our session, we might
  // be able to infer it later from messages. For now, generate a random ID.
  localUserId = 'local-' + Math.random().toString(36).slice(2, 8);
}

function _angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
