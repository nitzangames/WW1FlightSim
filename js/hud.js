import { CANVAS_W, CANVAS_H, VERSION, PLAYER } from './config.js';
import { drawMinimap } from './minimap.js';

export function drawHud(ctx, state) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Damage vignette
  if (state.damageFlash > 0) {
    const g = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.2,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.75
    );
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, `rgba(180,0,0,${state.damageFlash.toFixed(2)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Crosshair
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
  ctx.strokeStyle = state.locked ? '#ffd65a' : '#ffffffaa';
  ctx.lineWidth = state.locked ? 4 : 2;
  ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy); ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy + 16);
  ctx.stroke();

  // Score top-left
  ctx.fillStyle = '#ffffffdd';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`KILLS ${state.kills}`, 32, 64);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#ffffff99';
  ctx.fillText(`BEST ${state.best}`, 32, 100);

  // Health bar bottom-left
  const hpW = 300, hpH = 24, hpX = 32, hpY = CANVAS_H - 64;
  const pct = Math.max(0, state.hp / PLAYER.HP);
  ctx.fillStyle = '#000000aa';
  ctx.fillRect(hpX - 2, hpY - 2, hpW + 4, hpH + 4);
  ctx.fillStyle = '#c21515';
  ctx.fillRect(hpX, hpY, hpW * pct, hpH);
  ctx.fillStyle = '#ffffffdd';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.max(0, Math.round(state.hp))} HP`, hpX, hpY - 6);

  // Joystick visual
  if (state.joystick && state.joystick.active) {
    const { ax, ay, x, y, radius } = state.joystick;
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath(); ctx.arc(ax + x * radius, ay + y * radius, 28, 0, Math.PI * 2); ctx.fill();
  }

  // Minimap
  if (state.player) {
    drawMinimap(ctx, state.player, state.enemies, {
      cx: CANVAS_W - 200, cy: 200, radius: 180,
    });

    // Return-to-battle text
    const d = Math.hypot(state.player.position.x, state.player.position.z);
    if (d > 1800) {
      ctx.fillStyle = '#ffee88';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RETURN TO BATTLE', CANVAS_W / 2, 260);
    }
  }

  if (state.player) {
    ctx.fillStyle = '#ffffff77';
    ctx.font = '22px monospace';
    ctx.textAlign = 'right';
    const altM = Math.max(0, Math.round(state.player.position.y));
    const spd = state.player.speed || 0;
    ctx.fillText(`ALT ${altM}m`, CANVAS_W - 32, CANVAS_H - 90);
    ctx.fillText(`SPD ${spd}m/s`, CANVAS_W - 32, CANVAS_H - 60);
  }

  // Game over
  if (state.gameOver) {
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffeded';
    ctx.textAlign = 'center';
    ctx.font = 'bold 96px serif';
    ctx.fillText('SHOT DOWN', CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#ffffffdd';
    ctx.fillText(`KILLS ${state.kills}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
    ctx.fillStyle = '#ffffff99';
    ctx.font = '32px sans-serif';
    ctx.fillText(`BEST ${state.best}`, CANVAS_W / 2, CANVAS_H / 2 + 70);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '28px sans-serif';
    ctx.fillText('TAP TO FLY AGAIN', CANVAS_W / 2, CANVAS_H / 2 + 160);
  }

  if (state.menu) {
    ctx.fillStyle = '#000000dd';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffd65a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 110px serif';
    ctx.fillText('WW1', CANVAS_W / 2, CANVAS_H / 2 - 180);
    ctx.font = 'bold 88px serif';
    ctx.fillStyle = '#ffeded';
    ctx.fillText('FLIGHT SIM', CANVAS_W / 2, CANVAS_H / 2 - 80);
    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#ffffffcc';
    ctx.fillText('TAP TO FLY', CANVAS_W / 2, CANVAS_H / 2 + 60);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff99';
    ctx.fillText(`BEST ${state.best}`, CANVAS_W / 2, CANVAS_H / 2 + 140);
  }

  // Version bottom-center
  ctx.fillStyle = '#ffffff55';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(VERSION, CANVAS_W / 2, CANVAS_H - 14);
  ctx.restore();
}
