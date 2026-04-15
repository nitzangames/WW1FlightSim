import { VERSION, CANVAS_W, CANVAS_H } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';
import { Joystick } from './input.js';
import { Plane } from './plane.js';
import { buildFokker, buildCockpit, createSmokePool, emitSmoke, updateSmoke } from './models.js';
import { drawHud } from './hud.js';
import { Spawner } from './enemy-spawner.js';
import { Guns } from './weapons.js';
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

const smokePool = createSmokePool(scene);
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
  planeMesh.rotation.y = plane.yaw;
  planeMesh.rotation.x = plane.pitch;
  planeMesh.rotation.z = -plane.roll;
}

let prevPlayerHp = plane.hp;
let wasPlaying = false;

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  updateSmoke(smokePool, dt);

  const isPlaying = gs.state === STATE.PLAYING;
  if (isPlaying && !wasPlaying) startEngine();
  if (!isPlaying && wasPlaying) stopEngine();
  wasPlaying = isPlaying;

  let gunState = null;
  if (isPlaying) {
    joystick.tick(dt);
    plane.update(dt, joystick.value());
    syncCameraToPlane();
    for (const e of enemies) e.update(dt, plane);
    spawner.removeDead(enemies);
    spawner.maybeSpawn(enemies, plane, gs.kills);
    gunState = guns.update(dt, plane, enemies);
    if (gunState.firing) playGunBurst();
    if (plane.hp < prevPlayerHp) playHit();
    prevPlayerHp = plane.hp;

    if (cockpit.userData.flash) {
      cockpit.userData.flash.material.opacity = Math.max(0, guns.flashTimer * 12);
    }

    for (const e of enemies) {
      if (e.alive && e.hp <= 0) {
        e.alive = false;
        gs.kills++;
        playKill();
        for (let i = 0; i < 10; i++) emitSmoke(smokePool, e.position.x, e.position.y, e.position.z, 1.2);
      }
    }

    smokeTimer -= dt;
    if (smokeTimer <= 0) {
      smokeTimer = 0.05;
      for (const e of enemies) {
        if (e.alive && e.hp < 30) {
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

    if (plane.hp <= 0 && plane.alive) {
      plane.alive = false;
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
  });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('WW1 Flight Sim running', VERSION);
