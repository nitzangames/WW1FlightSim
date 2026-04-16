import { VERSION, CANVAS_W, CANVAS_H } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';
import { Joystick } from './input.js';
import { Plane } from './plane.js';
import { buildFokker, buildCockpit, createSmokePool, emitSmoke, updateSmoke, createScorchPool, placeScorch, createFirePool, emitFire, updateFire } from './models.js';
import { terrainHeight } from './world.js';
import { drawHud } from './hud.js';
import { Spawner } from './enemy-spawner.js';
import { Enemy } from './enemy.js';
import { Guns, EnemyTracers } from './weapons.js';
import { ENEMY, WORLD } from './config.js';
import { Balloon, Zeppelin } from './targets.js';
import { GameState, STATE } from './game.js';
import { initAudio, startEngine, stopEngine, setEnginePitch, playGunBurst, playHit, playKill } from './audio.js';

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
buildWorld(scene);

// Player plane and its mesh
const plane = new Plane();
plane.position.y = 200;
const planeMesh = buildFokker();
planeMesh.visible = false; // hidden from cockpit — we're inside it
planeMesh.rotation.order = 'YXZ';
scene.add(planeMesh);

const enemies = [];
const spawner = new Spawner(scene);
const guns = new Guns(scene);
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
  if (gs.state === STATE.MENU) {
    resetGameObjects();
    gs.startRun();
  } else if (gs.state === STATE.GAMEOVER && gs.gameOverTimer <= 0) {
    gs.state = STATE.MENU;
  }
  const p = screenToCanvas(e.clientX, e.clientY);
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
  plane.position.x = 0; plane.position.y = 200; plane.position.z = 0;
  plane.pitch = 0; plane.roll = 0; plane.yaw = 0;
  plane.hp = 100; plane.alive = true; plane.damageFlash = 0;
  plane.dying = false; plane.justCrashed = false;
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
  if (isPlaying && !wasPlaying) startEngine();
  if (!isPlaying && wasPlaying) stopEngine();
  wasPlaying = isPlaying;

  let gunState = null;
  if (isPlaying) {
    joystick.tick(dt);
    if (plane.dying) {
      plane.updateDying(dt);
    } else {
      plane.update(dt, joystick.value());
    }
    syncCameraToPlane();
    for (const e of enemies) e.update(dt, plane);
    // Spawn enemy tracers for every enemy that just fired. Miss rounds drift off
    // in the same direction so the player sees both hits and near-misses.
    const spread = ENEMY.TRACER_SPREAD_DEG * Math.PI / 180;
    for (const e of enemies) {
      if (!e.justFired) continue;
      // Origin: just in front of enemy's nose
      const ox = e.position.x + e.forward.x * 2;
      const oy = e.position.y + e.forward.y * 2;
      const oz = e.position.z + e.forward.z * 2;
      // Hit rounds aim closer to the player; misses get extra spread.
      const extraSpread = e.lastShotHit ? spread * 0.5 : spread * 2.5;
      enemyTracers.spawn({ x: ox, y: oy, z: oz }, plane.position, extraSpread);
    }
    spawner.removeDead(enemies);
    spawner.maybeSpawn(enemies, plane, gs.kills);
    gunState = guns.update(dt, plane, enemies);
    if (gunState.firing) playGunBurst();
    if (plane.hp < prevPlayerHp) playHit();
    prevPlayerHp = plane.hp;

    // Downed enemies begin a death spiral (stay alive for the animation);
    // they're cleaned up when they hit the ground and explode.
    for (const e of enemies) {
      if (e.alive && e.hp <= 0 && !e.dying) {
        e.startDying();
        gs.kills += e.killValue || 1;
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
        playKill();
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
      } else if (plane.hp < 30 && plane.alive) {
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
    setEnginePitch(80 + Math.abs(plane._targetPitchRate) * 80);
  }

  if (gs.state === STATE.GAMEOVER) {
    gs.gameOverTimer = Math.max(0, gs.gameOverTimer - dt);
  }

  renderer.render(scene, camera);
  drawHud(octx, {
    locked: !!(gunState && gunState.target),
    damageFlash: plane.damageFlash,
    hp: plane.hp,
    kills: gs.kills,
    best: gs.best,
    gameOver: gs.state === STATE.GAMEOVER,
    menu: gs.state === STATE.MENU,
    joystick: { active: joystick.active, ax: joystick.ax, ay: joystick.ay, x: joystick.x, y: joystick.y, radius: joystick.radius },
    player: plane,
    enemies,
    speed: plane.speed,
    altitude: plane.position.y,
    rpmJitter: Math.sin(t * 0.01) * 0.5 + Math.sin(t * 0.017) * 0.3,
    gunFlash: guns.flashTimer,
    waypoint: gs.state === STATE.PLAYING ? computeWaypoint(enemies, plane, camera) : null,
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
