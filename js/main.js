import { VERSION, CANVAS_W, CANVAS_H } from './config.js';

const gameCanvas = document.getElementById('game-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
gameCanvas.width = CANVAS_W;
gameCanvas.height = CANVAS_H;
overlayCanvas.width = CANVAS_W;
overlayCanvas.height = CANVAS_H;

const octx = overlayCanvas.getContext('2d');

function drawBoot() {
  octx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  octx.fillStyle = '#fff';
  octx.font = '36px sans-serif';
  octx.textAlign = 'center';
  octx.fillText('WW1 FLIGHT SIM ' + VERSION, CANVAS_W / 2, CANVAS_H / 2);
}

drawBoot();
console.log('WW1 Flight Sim boot', VERSION);
