import { VERSION, CANVAS_W, CANVAS_H } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';
import { Joystick } from './input.js';
import { Plane } from './plane.js';
import { buildFokker, buildCockpit } from './models.js';
import { Enemy } from './enemy.js';
import { drawHud } from './hud.js';

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

// Test enemies
const enemies = [];
function spawnEnemy(mode, bearing, dist, altOffset) {
  const x = plane.position.x + Math.sin(bearing) * dist;
  const z = plane.position.z + Math.cos(bearing) * dist;
  const y = plane.position.y + altOffset;
  const e = new Enemy({ x, y, z, mode });
  e.yaw = bearing + Math.PI; // face roughly toward origin
  enemies.push(e);
  scene.add(e.mesh);
  return e;
}
spawnEnemy('chaser', 0.3, 500, 20);
spawnEnemy('jouster', -0.6, 600, -10);

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
  const p = screenToCanvas(e.clientX, e.clientY);
  joystick.down(p.x, p.y);
});
overlayCanvas.addEventListener('pointermove', (e) => {
  const p = screenToCanvas(e.clientX, e.clientY);
  joystick.move(p.x, p.y);
});
overlayCanvas.addEventListener('pointerup', () => joystick.up());
overlayCanvas.addEventListener('pointercancel', () => joystick.up());

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

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  joystick.tick(dt);
  plane.update(dt, joystick.value());
  syncCameraToPlane();
  for (const e of enemies) e.update(dt, plane);

  renderer.render(scene, camera);

  drawHud(octx, {
    locked: false,
    joystick: {
      active: joystick.active,
      ax: joystick.ax,
      ay: joystick.ay,
      x: joystick.x,
      y: joystick.y,
      radius: joystick.radius,
    },
  });

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('WW1 Flight Sim running', VERSION);
