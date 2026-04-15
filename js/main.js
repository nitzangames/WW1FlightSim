import { VERSION, CANVAS_W, CANVAS_H } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';
import { Joystick } from './input.js';
import { Plane } from './plane.js';
import { buildFokker, buildCockpit, createSmokePool, emitSmoke, updateSmoke, createScorchPool, placeScorch } from './models.js';
import { terrainHeight } from './world.js';
import { drawHud } from './hud.js';
import { Spawner } from './enemy-spawner.js';
import { Enemy } from './enemy.js';
import { Guns, EnemyTracers } from './weapons.js';
import { ENEMY, WORLD } from './config.js';
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
  gs.reset();
}

// Apply plane orientation to camera
function syncCameraToPlane() {
  camera.position.set(plane.position.x, plane.position.y, plane.position.z);
  camera.rotation.y = plane.yaw;
  camera.rotation.x = plane.pitch;
  camera.rotation.z = -plane.roll;
  planeMesh.position.copy(camera.position);
  // Same +π offset as enemies so the mesh nose aligns with forward.
  planeMesh.rotation.y = plane.yaw + Math.PI;
  planeMesh.rotation.x = plane.pitch;
  planeMesh.rotation.z = -plane.roll;
}

let prevPlayerHp = plane.hp;
let wasPlaying = false;

let last = performance.now();
function loop(t) {
  if (paused) return;
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  updateSmoke(smokePool, dt);
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
        gs.kills++;
        playKill();
        // Initial trail burst as the plane "catches fire"
        for (let i = 0; i < 4; i++) {
          emitSmoke(smokePool, e.position.x, e.position.y, e.position.z, 1.4);
        }
      }
      if (e.justExploded) {
        // Ground impact: big fireball of smoke + explosion sound + scorch mark.
        playKill();
        for (let i = 0; i < 30; i++) {
          const ox = e.position.x + (Math.random() - 0.5) * 16;
          const oy = e.position.y + Math.random() * 6;
          const oz = e.position.z + (Math.random() - 0.5) * 16;
          emitSmoke(smokePool, ox, oy, oz, 2.2);
        }
        const gy = WORLD.GROUND_Y + terrainHeight(e.position.x, e.position.z);
        placeScorch(scorchPool, e.position.x, gy, e.position.z, 1.0 + Math.random() * 0.4);
      }
    }

    smokeTimer -= dt;
    if (smokeTimer <= 0) {
      smokeTimer = 0.05;
      for (const e of enemies) {
        // Thick smoke while dying, lighter trail when damaged but still alive.
        if (e.dying) {
          emitSmoke(smokePool,
            e.position.x - e.forward.x * 1.5,
            e.position.y - e.forward.y * 1.5,
            e.position.z - e.forward.z * 1.5,
            1.6);
        } else if (e.alive && e.hp < 30) {
          emitSmoke(smokePool,
            e.position.x - e.forward.x * 1.5,
            e.position.y - e.forward.y * 1.5,
            e.position.z - e.forward.z * 1.5,
            1.0);
        }
      }
      if (plane.hp < 30 && plane.alive) {
        emitSmoke(smokePool,
          plane.position.x - plane.forward.x * 2,
          plane.position.y - plane.forward.y * 2,
          plane.position.z - plane.forward.z * 2,
          1.2);
      }
    }

    // Player downed → enter death spiral before the game-over screen.
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
