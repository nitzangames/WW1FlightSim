import { VERSION, CANVAS_W, CANVAS_H } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';
import { Joystick } from './input.js';

const gameCanvas = document.getElementById('game-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
gameCanvas.width = CANVAS_W;
gameCanvas.height = CANVAS_H;
overlayCanvas.width = CANVAS_W;
overlayCanvas.height = CANVAS_H;

const { renderer, scene, camera } = createRenderer(gameCanvas);
buildWorld(scene);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -100);

const joystick = new Joystick();

function screenToCanvas(clientX, clientY) {
  const rect = overlayCanvas.getBoundingClientRect();
  const sx = CANVAS_W / rect.width;
  const sy = CANVAS_H / rect.height;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

overlayCanvas.style.pointerEvents = 'auto';
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

const octx = overlayCanvas.getContext('2d');

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  joystick.tick(dt);

  renderer.render(scene, camera);

  octx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  octx.fillStyle = '#fff';
  octx.font = '20px sans-serif';
  octx.textAlign = 'left';
  octx.fillText(VERSION, 16, 32);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('WW1 Flight Sim running', VERSION);
