import { VERSION, CANVAS_W, CANVAS_H } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';
import { Joystick } from './input.js';
import { Plane } from './plane.js';
import { buildFokker, buildCockpit, buildAirfield, createSmokePool, emitSmoke, updateSmoke, createScorchPool, placeScorch, createFirePool, emitFire, updateFire } from './models.js';
import { terrainHeight } from './world.js';
import { drawHud } from './hud.js';
import { Spawner } from './enemy-spawner.js';
import { Enemy } from './enemy.js';
import { Guns, EnemyTracers } from './weapons.js';
import { PLAYER, ENEMY, WORLD } from './config.js';
import { Balloon, Zeppelin, Artillery, HealthPickup } from './targets.js';
import { Weather } from './weather.js';
import { GameState, STATE, saveSettings } from './game.js';
import { initAudio, startWind, stopWind, playFlyby, playExplosion, playDeathWhine, playGunBurst, playHit, playKill } from './audio.js';
import { mpAvailable, mpOpenLobby, mpIsHost, mpRoom, mpSend, mpInit, mpLeave,
         mpSetMessageHandler, mpSetDisconnectHandler, mpGetRemotes, mpInterpolateRemote } from './multiplayer.js';

const gameCanvas = document.getElementById('game-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
gameCanvas.width = CANVAS_W;
gameCanvas.height = CANVAS_H;
overlayCanvas.width = CANVAS_W;
overlayCanvas.height = CANVAS_H;

const { renderer, scene, camera } = createRenderer(gameCanvas);
camera.rotation.order = 'YXZ';
const cockpit = buildCockpit();
camera.add(cockpit);
scene.add(camera);
const worldData = buildWorld(scene);

// Player plane and its mesh
const plane = new Plane();
plane.position.y = 200;
const planeMesh = buildFokker();
planeMesh.visible = false; // hidden from cockpit — we're inside it
planeMesh.rotation.order = 'YXZ';
scene.add(planeMesh);

// Airfield — off to one side of the map. Position at terrain height.
const airfield = buildAirfield();
const airfieldY = WORLD.GROUND_Y + terrainHeight(WORLD.AIRFIELD_X, WORLD.AIRFIELD_Z);
airfield.position.set(WORLD.AIRFIELD_X, airfieldY, WORLD.AIRFIELD_Z);
scene.add(airfield);

// Menu display Fokker — slowly rotates in front of the camera during MENU state.
const menuFokker = buildFokker();
menuFokker.visible = false;
menuFokker.rotation.order = 'YXZ';
scene.add(menuFokker);
let menuFokkerAngle = 0;

const weather = new Weather(scene);
weather.cloudMat = worldData.cloudMat;
const enemies = [];
const healthPickups = [];
const spawner = new Spawner(scene);
const guns = new Guns(scene);
// In MP, non-host relays damage to the host instead of applying locally.
guns._onDamage = (enemyId, amount) => {
  if (mpMode && !mpIsHost()) {
    mpSend({ type: 'damage-enemy', id: enemyId, amount });
  }
};
const enemyTracers = new EnemyTracers(scene);

const smokePool = createSmokePool(scene);
const scorchPool = createScorchPool(scene);
const firePool = createFirePool(scene);
let smokeTimer = 0;

const gs = new GameState();

// Joystick + input
const joystick = new Joystick();
const octx = overlayCanvas.getContext('2d');
overlayCanvas.style.pointerEvents = 'auto';
function screenToCanvas(clientX, clientY) {
  const rect = overlayCanvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (CANVAS_W / rect.width),
    y: (clientY - rect.top) * (CANVAS_H / rect.height),
  };
}
overlayCanvas.addEventListener('pointerdown', (e) => {
  initAudio();
  const p = screenToCanvas(e.clientX, e.clientY);
  const inBtn = (btn) => btn && p.x >= btn.x && p.x <= btn.x + btn.w && p.y >= btn.y && p.y <= btn.y + btn.h;

  // ---- Menu ----
  if (gs.state === STATE.MENU) {
    if (inBtn(drawHud._mpBtn) && mpAvailable()) {
      mpOpenLobby({
        onStart: (isHost) => mpStartGame(isHost),
        onCancel: () => {},
      });
      return;
    }
    mpMode = false;
    resetGameObjects();
    gs.startRun();
    return;
  }

  // ---- Paused (settings sub-screen) ----
  if (gs.state === STATE.PAUSED && gs.settingsOpen) {
    if (inBtn(drawHud._soundBtn)) {
      gs.settings.soundOn = !gs.settings.soundOn;
      saveSettings(gs.settings);
      return;
    }
    if (inBtn(drawHud._invertBtn)) {
      gs.settings.invertY = !gs.settings.invertY;
      saveSettings(gs.settings);
      return;
    }
    if (drawHud._senBtns) {
      for (const sb of drawHud._senBtns) {
        if (inBtn(sb)) { gs.settings.sensitivity = sb.val; saveSettings(gs.settings); return; }
      }
    }
    if (inBtn(drawHud._settingsBackBtn)) {
      gs.settingsOpen = false;
      return;
    }
    return;
  }

  // ---- Paused (main pause menu) ----
  if (gs.state === STATE.PAUSED) {
    if (inBtn(drawHud._resumeBtn)) { gs.resume(); return; }
    if (inBtn(drawHud._settingsBtn)) { gs.settingsOpen = true; return; }
    if (inBtn(drawHud._quitBtn)) {
      gs.state = STATE.MENU;
      if (mpMode) mpLeave();
      mpMode = false;
      return;
    }
    return;
  }

  // ---- Game over ----
  if (gs.state === STATE.GAMEOVER && gs.gameOverTimer <= 0) {
    gs.state = STATE.MENU;
    if (mpMode) mpLeave();
    mpMode = false;
    return;
  }

  // ---- Playing / Takeoff: check pause button first, then joystick ----
  if (inBtn(drawHud._pauseBtn)) {
    gs.pause();
    return;
  }
  joystick.down(p.x, p.y);
});
overlayCanvas.addEventListener('pointermove', (e) => {
  const p = screenToCanvas(e.clientX, e.clientY);
  joystick.move(p.x, p.y);
});
overlayCanvas.addEventListener('pointerup', () => joystick.up());
overlayCanvas.addEventListener('pointercancel', () => joystick.up());

function resetGameObjects() {
  for (const e of enemies) scene.remove(e.mesh);
  enemies.length = 0;
  // Start on the runway: near the end of the strip, facing down the runway (-Z).
  const rsx = WORLD.AIRFIELD_X, rsz = WORLD.AIRFIELD_Z + 90;
  const runwayY = WORLD.GROUND_Y + terrainHeight(rsx, rsz) + 1.5;
  plane.position.x = rsx; plane.position.y = runwayY; plane.position.z = rsz;
  plane.pitch = 0; plane.roll = 0; plane.yaw = 0;
  plane.hp = PLAYER.HP; plane.alive = true; plane.damageFlash = 0;
  plane.dying = false; plane.justCrashed = false;
  plane._takeoffSpeed = 0;
  gs.reset();

  // Static targets: 3 tethered balloons at 400-700m, low altitude; 1 zeppelin
  // drifting at ~900m, above cruising altitude.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.random() * 0.8;
    const r = 400 + Math.random() * 300;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const y = 70 + Math.random() * 40;
    const balloon = new Balloon({ x, y, z });
    enemies.push(balloon);
    scene.add(balloon.mesh);
  }
  const za = Math.random() * Math.PI * 2;
  const zr = 800 + Math.random() * 300;
  const zep = new Zeppelin({
    x: Math.sin(za) * zr,
    y: 250 + Math.random() * 40,
    z: Math.cos(za) * zr,
  });
  enemies.push(zep);
  scene.add(zep.mesh);

  // Ground artillery emplacements (4-6 scattered in the play area).
  const artCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < artCount; i++) {
    const aa = Math.random() * Math.PI * 2;
    const ar = 250 + Math.random() * 900;
    const art = new Artillery({ x: Math.sin(aa) * ar, z: Math.cos(aa) * ar });
    enemies.push(art);
    scene.add(art.mesh);
  }

  // Health pickups scattered around the map (3 per game).
  for (const hp of healthPickups) scene.remove(hp.mesh);
  healthPickups.length = 0;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.random() * 1.2;
    const r = 300 + Math.random() * 600;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const y = 60 + Math.random() * 80;
    const hp = new HealthPickup({ x, y, z });
    healthPickups.push(hp);
    scene.add(hp.mesh);
  }

  // Weather variation for this run.
  weather.randomize();
}

// Apply plane orientation to camera
function syncCameraToPlane() {
  camera.position.set(plane.position.x, plane.position.y, plane.position.z);
  camera.rotation.y = plane.yaw;
  camera.rotation.x = plane.pitch;
  camera.rotation.z = -plane.roll;
  planeMesh.position.copy(camera.position);
  // Same +π offset as enemies so the mesh nose aligns with forward. Pitch and
  // roll are inverted because the π yaw flips the mesh's local X/Z axes.
  planeMesh.rotation.y = plane.yaw + Math.PI;
  planeMesh.rotation.x = -plane.pitch;
  planeMesh.rotation.z = plane.roll;
}

let prevPlayerHp = plane.hp;
let wasPlaying = false;

// ---- Multiplayer ----
let mpMode = false; // true when in a multiplayer session
let mpSnapshotTimer = 0;
let mpEnemySyncTimer = 0;
const mpRemoteMeshes = new Map(); // userId → THREE.Mesh (allied Fokker)
let mpNextColorIdx = 1; // 0=red (local), 1=blue, 2=green, 3=yellow

mpInit(); // wire PlaySDK multiplayer events if available

function mpStartGame(isHost) {
  mpMode = true;
  resetGameObjects();
  gs.startRun();
  if (isHost) {
    // Host sends the game seed so all clients see same terrain (already
    // deterministic via the noise functions — just need same weather).
    mpSend({ type: 'game-start', weather: weather.condition });
  }
}

mpSetMessageHandler((fromUserId, msg) => {
  if (msg.type === 'game-start' && !mpIsHost()) {
    // Non-host: start game with host's weather.
    resetGameObjects();
    gs.startRun();
    mpMode = true;
    if (msg.weather) weather.condition = msg.weather;
  }
  if (msg.type === 'damage-enemy' && mpIsHost()) {
    // Host applies damage from remote player.
    const e = enemies.find(en => en.id === msg.id);
    if (e && e.alive && !e.dying) e.hp -= msg.amount;
  }
  if (msg.type === 'enemy-sync' && !mpIsHost()) {
    // Non-host: update local enemy HP from host authority.
    for (const es of msg.enemies) {
      const e = enemies.find(en => en.id === es.id);
      if (e) {
        e.position.x = es.x; e.position.y = es.y; e.position.z = es.z;
        e.yaw = es.yaw; e.pitch = es.pitch; e.roll = es.roll;
        e.hp = es.hp;
        if (es.dying && !e.dying && e.alive) e.startDying();
        if (!es.alive && e.alive && !e.dying) {
          e.alive = false;
          e.justExploded = true;
        }
      }
    }
  }
});

mpSetDisconnectHandler(() => {
  mpMode = false;
  // Clean up remote meshes.
  for (const [, mesh] of mpRemoteMeshes) scene.remove(mesh);
  mpRemoteMeshes.clear();
});

function mpBroadcastPlaneState() {
  mpSend({
    type: 'plane-state',
    t: Date.now(),
    x: plane.position.x, y: plane.position.y, z: plane.position.z,
    vx: plane.forward.x * plane.speed,
    vy: plane.forward.y * plane.speed,
    vz: plane.forward.z * plane.speed,
    yaw: plane.yaw, pitch: plane.pitch, roll: plane.roll,
    hp: plane.hp, alive: plane.alive, dying: plane.dying,
    firing: !!(guns.flashTimer > 0),
  });
}

function mpBroadcastEnemySync() {
  mpSend({
    type: 'enemy-sync',
    enemies: enemies.map(e => ({
      id: e.id, x: e.position.x, y: e.position.y, z: e.position.z,
      yaw: e.yaw, pitch: e.pitch, roll: e.roll,
      hp: e.hp, alive: e.alive, dying: e.dying,
    })),
  });
}

function mpUpdateRemotePlayers() {
  const remotes = mpGetRemotes();
  for (const [userId, remote] of remotes) {
    const state = mpInterpolateRemote(userId);
    if (!state) continue;
    // Create mesh if new.
    if (!mpRemoteMeshes.has(userId)) {
      const m = buildFokker({ colorIndex: mpNextColorIdx++ % 4 });
      m.rotation.order = 'YXZ';
      scene.add(m);
      mpRemoteMeshes.set(userId, m);
    }
    const mesh = mpRemoteMeshes.get(userId);
    mesh.position.set(state.x, state.y, state.z);
    mesh.rotation.y = state.yaw + Math.PI;
    mesh.rotation.x = -state.pitch;
    mesh.rotation.z = state.roll;
    mesh.visible = state.alive || state.dying;
  }
}

const _waypointNDC = new THREE.Vector3();
function computeWaypoint(enemies, pl, cam) {
  let nearest = null;
  let bestD2 = Infinity;
  for (const e of enemies) {
    if (!e.alive || e.dying) continue;
    // Waypoint points to planes — balloons/zeppelin are easy to spot already.
    if (e.type && e.type !== 'plane') continue;
    const dx = e.position.x - pl.position.x;
    const dy = e.position.y - pl.position.y;
    const dz = e.position.z - pl.position.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2) { bestD2 = d2; nearest = e; }
  }
  if (!nearest) return null;
  const dx = nearest.position.x - pl.position.x;
  const dy = nearest.position.y - pl.position.y;
  const dz = nearest.position.z - pl.position.z;
  const front = dx * pl.forward.x + dy * pl.forward.y + dz * pl.forward.z > 0;
  _waypointNDC.set(nearest.position.x, nearest.position.y, nearest.position.z);
  _waypointNDC.project(cam);
  const sx = (_waypointNDC.x * 0.5 + 0.5) * CANVAS_W;
  const sy = (-_waypointNDC.y * 0.5 + 0.5) * CANVAS_H;
  // Use camera-local x axis (right) to pick a side when behind.
  // right = up × forward (left-handed convention matches the game's yaw).
  const rx = 1 * pl.forward.z;  // (0,1,0) × forward.xyz → (forward.z, 0, -forward.x)
  const rz = -pl.forward.x;
  const localRight = dx * rx + dz * rz; // >0 = enemy on player's right
  return {
    sx, sy, front,
    localRight,
    distance: Math.sqrt(bestD2),
  };
}

let last = performance.now();
function loop(t) {
  if (paused) return;
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  updateSmoke(smokePool, dt);
  updateFire(firePool, dt);
  enemyTracers.update(dt);

  const isPlaying = gs.state === STATE.PLAYING;
  const isTakeoff = gs.state === STATE.TAKEOFF;
  if ((isPlaying || isTakeoff) && !wasPlaying) startWind();
  if (!(isPlaying || isTakeoff) && wasPlaying) stopWind();
  wasPlaying = isPlaying || isTakeoff;

  // ---- Takeoff sequence: auto-accelerate down the runway, lift off, hand to PLAYING ----
  if (isTakeoff) {
    gs.takeoffTime += dt;
    // Accelerate along the runway.
    if (!plane._takeoffSpeed) plane._takeoffSpeed = 0;
    plane._takeoffSpeed = Math.min(PLAYER.SPEED, plane._takeoffSpeed + 12 * dt);
    // Roll forward on the ground.
    const groundY = WORLD.GROUND_Y + terrainHeight(plane.position.x, plane.position.z) + 1.5;
    plane.position.z -= plane._takeoffSpeed * dt;
    plane.position.y = groundY;
    // At ~70% takeoff speed, pitch up gently and lift off.
    if (plane._takeoffSpeed > PLAYER.SPEED * 0.7) {
      plane.pitch += 0.4 * dt;
      plane.position.y = groundY + (plane._takeoffSpeed - PLAYER.SPEED * 0.7) * 2;
    }
    // Once clearly airborne (20m above ground), transition to PLAYING.
    if (plane.position.y > groundY + 20) {
      gs.state = STATE.PLAYING;
      plane.position.y = groundY + 25;
    }
    syncCameraToPlane();
  }

  let gunState = null;
  if (isPlaying) {
    joystick.tick(dt);
    if (plane.dying) {
      plane.updateDying(dt);
    } else {
      const jv = joystick.value();
      // Apply settings: invert Y + sensitivity.
      const sens = gs.settings.sensitivity || 1.0;
      const iy = gs.settings.invertY ? -1 : 1;
      plane.update(dt, { x: jv.x * sens, y: jv.y * iy * sens });
      plane.yaw += weather.update(dt);
    }
    syncCameraToPlane();
    for (const e of enemies) e.update(dt, plane);
    // Spawn enemy tracers for every enemy that just fired. Miss rounds drift off
    // in the same direction so the player sees both hits and near-misses.
    const spread = ENEMY.TRACER_SPREAD_DEG * Math.PI / 180;
    for (const e of enemies) {
      if (!e.justFired) continue;
      // Origin: just ahead of the firer (plane nose or artillery tube).
      const ox = e.position.x + (e.forward ? e.forward.x : 0) * 2;
      const oy = e.position.y + (e.forward ? e.forward.y : 0) * 2 + (e.type === 'artillery' ? 2 : 0);
      const oz = e.position.z + (e.forward ? e.forward.z : 0) * 2;
      const extraSpread = e.lastShotHit ? spread * 0.5 : spread * (e.type === 'artillery' ? 4 : 2.5);
      enemyTracers.spawn({ x: ox, y: oy, z: oz }, plane.position, extraSpread);
    }
    spawner.removeDead(enemies);
    spawner.maybeSpawn(enemies, plane, gs.kills);
    // Ammo / reload gating — guns only fire if we have ammo.
    gs.updateReload(dt);
    const canFire = !gs.reloading && gs.ammo > 0;
    gunState = guns.update(dt, plane, enemies, canFire);
    if (gunState.firing) {
      gs.tryFire();
      playGunBurst();
    }
    if (plane.hp < prevPlayerHp) playHit();
    prevPlayerHp = plane.hp;
    gs.updateWave(dt);

    // Downed enemies begin a death spiral (stay alive for the animation);
    // they're cleaned up when they hit the ground and explode.
    for (const e of enemies) {
      if (e.alive && e.hp <= 0 && !e.dying) {
        e.startDying();
        gs.kills += e.killValue || 1;
        if (e.type === 'plane') gs.planeKills++;
        else if (e.type === 'balloon') gs.balloonKills++;
        else if (e.type === 'zeppelin') gs.zeppelinKills++;
        playKill();
        // Initial "catches fire" burst — scaled to size.
        const ignite = e.type === 'zeppelin' ? 28 : e.type === 'balloon' ? 14 : 4;
        const igniteSpread = e.type === 'zeppelin' ? 22 : e.type === 'balloon' ? 4 : 2;
        for (let i = 0; i < ignite; i++) {
          emitSmoke(smokePool,
            e.position.x + (Math.random() - 0.5) * igniteSpread,
            e.position.y + (Math.random() - 0.5) * igniteSpread,
            e.position.z + (Math.random() - 0.5) * igniteSpread,
            1.8);
          if (e.type === 'balloon' || e.type === 'zeppelin') {
            emitFire(firePool,
              e.position.x + (Math.random() - 0.5) * igniteSpread,
              e.position.y + (Math.random() - 0.5) * igniteSpread,
              e.position.z + (Math.random() - 0.5) * igniteSpread,
              0.85);
          }
        }
      }
      if (e.justExploded) {
        // Ground impact: big fireball + explosion sound + scorch. Scale to size.
        playExplosion();
        const boom = e.type === 'zeppelin' ? 70 : e.type === 'balloon' ? 40 : 30;
        const boomSpread = e.type === 'zeppelin' ? 32 : e.type === 'balloon' ? 20 : 16;
        const scorchSize = e.type === 'zeppelin' ? 3.0 : e.type === 'balloon' ? 1.6 : 1.0 + Math.random() * 0.4;
        for (let i = 0; i < boom; i++) {
          const ox = e.position.x + (Math.random() - 0.5) * boomSpread;
          const oy = e.position.y + Math.random() * 10;
          const oz = e.position.z + (Math.random() - 0.5) * boomSpread;
          emitSmoke(smokePool, ox, oy, oz, 2.2);
          if (i < boom * 0.6) emitFire(firePool, ox, oy, oz, 0.7);
        }
        const gy = WORLD.GROUND_Y + terrainHeight(e.position.x, e.position.z);
        placeScorch(scorchPool, e.position.x, gy, e.position.z, scorchSize);
      }
    }

    smokeTimer -= dt;
    if (smokeTimer <= 0) {
      smokeTimer = 0.05;
      for (const e of enemies) {
        if (e.dying) {
          // Fire scatter scaled to target size so big targets look properly
          // engulfed instead of having one tiny flame at centre.
          const jitter = e.type === 'zeppelin' ? 25 : e.type === 'balloon' ? 3.5 : 2;
          const fireCount = e.type === 'zeppelin' ? 8 : e.type === 'balloon' ? 5 : 2;
          const smokeCount = e.type === 'zeppelin' ? 3 : 2;
          for (let i = 0; i < smokeCount; i++) {
            emitSmoke(smokePool,
              e.position.x + (Math.random() - 0.5) * jitter,
              e.position.y + (Math.random() - 0.5) * jitter,
              e.position.z + (Math.random() - 0.5) * jitter,
              1.8);
          }
          for (let i = 0; i < fireCount; i++) {
            emitFire(firePool,
              e.position.x + (Math.random() - 0.5) * jitter,
              e.position.y + (Math.random() - 0.5) * jitter,
              e.position.z + (Math.random() - 0.5) * jitter,
              0.6);
          }
        } else if (e.alive) {
          // Damaged-but-alive: airships flame earlier than planes because
          // they're big hydrogen sacks; planes just start to smoke at <50%.
          const hpPct = e.hp / (e.maxHp || e.hp || 1);
          const isAirship = e.type === 'balloon' || e.type === 'zeppelin';
          const burnThresh = isAirship ? 0.6 : 0.5;
          if (hpPct < burnThresh) {
            const j = e.type === 'zeppelin' ? 18 : e.type === 'balloon' ? 2 : 1.5;
            emitSmoke(smokePool,
              e.position.x + (Math.random() - 0.5) * j,
              e.position.y + (Math.random() - 0.5) * j,
              e.position.z + (Math.random() - 0.5) * j,
              1.2);
            if (hpPct < (isAirship ? 0.5 : 0.3)) {
              emitFire(firePool,
                e.position.x + (Math.random() - 0.5) * j,
                e.position.y + (Math.random() - 0.5) * j,
                e.position.z + (Math.random() - 0.5) * j,
                0.45);
            }
          }
        }
      }
      if (plane.dying) {
        emitSmoke(smokePool, plane.position.x, plane.position.y, plane.position.z, 1.8);
        for (let i = 0; i < 3; i++) {
          emitFire(firePool,
            plane.position.x + (Math.random() - 0.5) * 3,
            plane.position.y + (Math.random() - 0.5) * 3,
            plane.position.z + (Math.random() - 0.5) * 3,
            0.55);
        }
      } else if (plane.alive) {
        // Engine exhaust contrail — faint wisp behind the player at all times.
        emitSmoke(smokePool,
          plane.position.x - plane.forward.x * 3,
          plane.position.y - plane.forward.y * 3,
          plane.position.z - plane.forward.z * 3,
          0.35);
        // Heavier smoke + fire when damaged.
        if (plane.hp < 30) {
          emitSmoke(smokePool,
            plane.position.x - plane.forward.x * 2,
            plane.position.y - plane.forward.y * 2,
            plane.position.z - plane.forward.z * 2,
            1.2);
          if (plane.hp < 15) {
            emitFire(firePool, plane.position.x, plane.position.y, plane.position.z, 0.4);
          }
        }
      }
    }

    // Terrain collision: hitting the ground while flying is an instant crash
    // (skip the dying spiral — we're already at ground level).
    if (plane.alive && !plane.dying) {
      const groundY = WORLD.GROUND_Y + terrainHeight(plane.position.x, plane.position.z);
      if (plane.position.y <= groundY + 3) {
        plane.position.y = groundY;
        plane.hp = 0;
        plane.alive = false;
        plane.justCrashed = true;
      }
    }
    // Player shot down (HP gone but not from terrain) → enter death spiral.
    if (plane.hp <= 0 && plane.alive) {
      plane.startDying();
      playKill();
      playDeathWhine();
    }
    // Continuous thick smoke trail from the dying plane.
    if (plane.dying) {
      emitSmoke(smokePool,
        plane.position.x - plane.forward.x * 2,
        plane.position.y - plane.forward.y * 2,
        plane.position.z - plane.forward.z * 2,
        1.6);
    }
    if (plane.justCrashed) {
      // Impact fireball for the player plane too + scorch.
      playExplosion();
      for (let i = 0; i < 40; i++) {
        const ox = plane.position.x + (Math.random() - 0.5) * 18;
        const oy = plane.position.y + Math.random() * 8;
        const oz = plane.position.z + (Math.random() - 0.5) * 18;
        emitSmoke(smokePool, ox, oy, oz, 2.4);
      }
      const gy = WORLD.GROUND_Y + terrainHeight(plane.position.x, plane.position.z);
      placeScorch(scorchPool, plane.position.x, gy, plane.position.z, 1.4);
      gs.die();
    }
    // Multiplayer: send snapshots + sync.
    if (mpMode) {
      mpSnapshotTimer -= dt * 1000;
      if (mpSnapshotTimer <= 0) {
        mpSnapshotTimer = 50; // 20 Hz
        mpBroadcastPlaneState();
        if (mpIsHost()) {
          mpBroadcastEnemySync();
        }
      }
      mpUpdateRemotePlayers();
    }

    // Health pickups: bob + spin, check collection.
    for (const hp of healthPickups) {
      hp.update(dt);
      if (hp.active && hp.checkPickup(plane.position)) {
        hp.collect();
        plane.hp = Math.min(plane.maxHp, plane.hp + hp.healAmount);
        // Green flash feedback.
        plane.damageFlash = Math.max(plane.damageFlash, 0.3);
        playKill(); // reuse the ascending tone as a "pickup" jingle
      }
    }

    // Flyby sound when any alive enemy passes close.
    for (const e of enemies) {
      if (!e.alive || e.type !== 'plane') continue;
      const dx = e.position.x - plane.position.x;
      const dy = e.position.y - plane.position.y;
      const dz = e.position.z - plane.position.z;
      const dist = Math.hypot(dx, dy, dz);
      // Trigger when within 60m — use a cooldown on the enemy so it doesn't
      // spam. Re-arm after the enemy moves beyond 120m.
      if (dist < 60 && !e._flybyPlayed) { playFlyby(); e._flybyPlayed = true; }
      if (dist > 120) e._flybyPlayed = false;
    }
  }

  if (gs.state === STATE.GAMEOVER) {
    gs.gameOverTimer = Math.max(0, gs.gameOverTimer - dt);
  }

  // Menu state: show rotating Fokker, position camera for a nice 3/4 view.
  if (gs.state === STATE.MENU) {
    menuFokker.visible = true;
    menuFokkerAngle += dt * 0.15;
    const mfX = WORLD.AIRFIELD_X, mfZ = WORLD.AIRFIELD_Z;
    const mfY = airfieldY + 3;
    menuFokker.position.set(mfX, mfY, mfZ);
    menuFokker.rotation.y = Math.PI;
    menuFokker.rotation.x = 0;
    menuFokker.rotation.z = -0.1;
    camera.position.set(
      mfX + Math.sin(menuFokkerAngle) * 14,
      mfY + 4.5,
      mfZ + Math.cos(menuFokkerAngle) * 14
    );
    camera.rotation.order = 'YXZ';
    camera.lookAt(mfX, mfY + 1, mfZ);
    // Spin prop blades.
    if (menuFokker.userData.propBlades) {
      menuFokker.userData.propBlades.rotation.z += 0.5;
    }
  } else {
    menuFokker.visible = false;
  }

  // Screen shake — offset camera briefly when taking damage.
  let shakeX = 0, shakeY = 0, shakeZ = 0;
  if (plane.damageFlash > 0.08) {
    const amp = plane.damageFlash * 1.8;
    shakeX = (Math.random() - 0.5) * amp;
    shakeY = (Math.random() - 0.5) * amp;
    shakeZ = (Math.random() - 0.5) * amp * 0.3;
    camera.position.x += shakeX;
    camera.position.y += shakeY;
    camera.position.z += shakeZ;
  }
  renderer.render(scene, camera);
  camera.position.x -= shakeX;
  camera.position.y -= shakeY;
  camera.position.z -= shakeZ;
  drawHud(octx, {
    locked: !!(gunState && gunState.target),
    damageFlash: plane.damageFlash,
    hp: plane.hp,
    kills: gs.kills,
    best: gs.best,
    gameOver: gs.state === STATE.GAMEOVER,
    menu: gs.state === STATE.MENU,
    paused: gs.state === STATE.PAUSED,
    settingsOpen: gs.settingsOpen,
    settings: gs.settings,
    mpAvailable: mpAvailable(),
    joystick: { active: joystick.active, ax: joystick.ax, ay: joystick.ay, x: joystick.x, y: joystick.y, radius: joystick.radius },
    player: plane,
    enemies,
    speed: plane.speed,
    altitude: plane.position.y,
    rpmJitter: Math.sin(t * 0.01) * 0.5 + Math.sin(t * 0.017) * 0.3,
    gunFlash: guns.flashTimer,
    waypoint: gs.state === STATE.PLAYING ? computeWaypoint(enemies, plane, camera) : null,
    allies: mpMode ? Array.from(mpGetRemotes().keys()).map(uid => mpInterpolateRemote(uid)).filter(Boolean) : [],
    pickups: healthPickups.filter(hp => hp.active).map(hp => hp.position),
    ammo: gs.ammo,
    maxAmmo: gs.maxAmmo,
    reloading: gs.reloading,
    wave: gs.wave,
    waveFlash: gs.waveFlash,
    rank: gs.rank,
    planeKills: gs.planeKills,
    balloonKills: gs.balloonKills,
    zeppelinKills: gs.zeppelinKills,
  });
  rafId = requestAnimationFrame(loop);
}
let rafId = requestAnimationFrame(loop);
let paused = false;

if (window.PlaySDK) {
  PlaySDK.onPause(() => {
    paused = true;
    cancelAnimationFrame(rafId);
    import('./audio.js').then(m => m.suspendAudio());
  });
  PlaySDK.onResume(() => {
    paused = false;
    import('./audio.js').then(m => m.resumeAudio());
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  });
}

if (window.PlaySDK && PlaySDK.screenshotMode) {
  resetGameObjects();
  gs.startRun();
  const e = new Enemy({
    x: plane.position.x + 30,
    y: plane.position.y + 5,
    z: plane.position.z - 200,
    mode: 'chaser',
  });
  enemies.push(e);
  scene.add(e.mesh);
}

console.log('WW1 Flight Sim running', VERSION);
