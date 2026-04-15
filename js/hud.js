import { CANVAS_W, CANVAS_H, VERSION, PLAYER } from './config.js';
import { drawMinimap } from './minimap.js';

// ---------- cockpit drawing helpers ----------

function woodPanel(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#7a5128');
  g.addColorStop(0.5, '#5f3e1f');
  g.addColorStop(1, '#3e2814');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // wood grain
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 10; i++) {
    const yy = y + ((i + 0.5) / 10) * h;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.bezierCurveTo(x + w * 0.33, yy + 4, x + w * 0.66, yy - 4, x + w, yy);
    ctx.stroke();
  }
  // brass nail heads
  ctx.fillStyle = '#b38b3a';
  for (let i = 0; i < 12; i++) {
    const px = x + 20 + (i * (w - 40) / 11);
    ctx.beginPath(); ctx.arc(px, y + 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px, y + h - 18, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawGauge(ctx, cx, cy, r, label, value, max = 200, needleColor = '#ffe580') {
  // Brass ring
  ctx.fillStyle = '#b38b3a';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Inner brass rim
  ctx.fillStyle = '#8f6e26';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2); ctx.fill();
  // Black dial face
  ctx.fillStyle = '#141414';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.fill();
  // Tick marks
  ctx.strokeStyle = '#f0e0a0';
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI * 1.25 + (Math.PI * 1.5) * (i / 10);
    const r1 = r * 0.68, r2 = r * 0.82;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  // Needle
  const t = Math.max(0, Math.min(1, value / max));
  const na = -Math.PI * 1.25 + Math.PI * 1.5 * t;
  ctx.strokeStyle = needleColor;
  ctx.lineWidth = Math.max(3, r * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * r * 0.72, cy + Math.sin(na) * r * 0.72);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Hub
  ctx.fillStyle = '#eee';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.06, 0, Math.PI * 2); ctx.fill();
  // Label
  ctx.fillStyle = '#e7d7a8';
  ctx.font = `bold ${Math.round(r * 0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + r + r * 0.38);
}

function gunBreech(ctx, cx, cy, r, flash = 0) {
  // Outer steel housing
  ctx.fillStyle = '#2a2e36';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Rim highlight
  ctx.strokeStyle = '#5a606a';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath(); ctx.arc(cx, cy, r - r * 0.06, 0, Math.PI * 2); ctx.stroke();
  // Bore
  ctx.fillStyle = '#050507';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
  // Muzzle flash (yellow glow when firing)
  if (flash > 0) {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
    glow.addColorStop(0, `rgba(255,230,90,${Math.min(1, flash * 12).toFixed(2)})`);
    glow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

function drawWaypoint(ctx, wp) {
  const W = CANVAS_W, H = CANVAS_H;
  const margin = 90;
  const cx = W / 2, cy = H / 2;
  const onScreen = wp.front && wp.sx >= margin && wp.sx <= W - margin && wp.sy >= margin && wp.sy <= H - margin;

  ctx.save();
  ctx.strokeStyle = '#ffd65a';
  ctx.fillStyle = '#ffd65a';
  ctx.lineWidth = 4;

  if (onScreen) {
    // Target bracket at the projected position.
    const s = 44;
    const x = wp.sx, y = wp.sy;
    ctx.beginPath();
    // Four corner brackets
    const L = 18;
    ctx.moveTo(x - s, y - s + L); ctx.lineTo(x - s, y - s); ctx.lineTo(x - s + L, y - s);
    ctx.moveTo(x + s - L, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y - s + L);
    ctx.moveTo(x + s, y + s - L); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s - L, y + s);
    ctx.moveTo(x - s + L, y + s); ctx.lineTo(x - s, y + s); ctx.lineTo(x - s, y + s - L);
    ctx.stroke();
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(wp.distance)}m`, x, y + s + 34);
  } else {
    // Edge arrow pointing toward the target. For behind-camera enemies pick a
    // direction based on which side of the plane they're on.
    let dx, dy;
    if (wp.front) {
      dx = wp.sx - cx;
      dy = wp.sy - cy;
    } else {
      // Put the arrow at bottom edge, offset left/right by localRight sign.
      dx = (wp.localRight >= 0 ? 1 : -1) * (W * 0.35);
      dy = H * 0.38;
    }
    const mag = Math.hypot(dx, dy) || 1;
    const r = Math.min(W, H) * 0.38;
    const ax = cx + (dx / mag) * r;
    const ay = cy + (dy / mag) * r;
    const ang = Math.atan2(dy, dx);
    // Triangle arrow
    const size = 36;
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.7);
    ctx.lineTo(-size * 0.2, 0);
    ctx.lineTo(-size * 0.6, size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-ang);
    ctx.translate(-ax, -ay);
    // Distance label inside the arrow direction
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    const lx = cx + (dx / mag) * (r - 56);
    const ly = cy + (dy / mag) * (r - 56);
    ctx.fillText(`${Math.round(wp.distance)}m`, lx, ly);
  }
  ctx.restore();
}

function drawCockpit(ctx, state) {
  const W = CANVAS_W, H = CANVAS_H;
  const dashH = H * 0.32;
  const dashY = H - dashH;

  // Wooden panel
  woodPanel(ctx, 0, dashY, W, dashH);

  // Leather top trim
  ctx.fillStyle = '#2e1d10';
  ctx.fillRect(0, dashY, W, 28);
  ctx.strokeStyle = '#d7b470';
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, dashY + 14); ctx.lineTo(W, dashY + 14); ctx.stroke();
  ctx.setLineDash([]);

  // 3 gauges — ASI (left, small), ALT (center, big), RPM (right, small)
  const gaugeY = dashY + dashH * 0.45;
  const asi = Math.max(0, Math.min(200, (state.speed || 0) * 1.5));
  const alt = Math.max(0, Math.min(200, (state.altitude || 0) * 0.5));
  const rpm = 120 + (state.rpmJitter || 0) * 20;
  drawGauge(ctx, W * 0.18, gaugeY, 90, 'ASI', asi);
  drawGauge(ctx, W * 0.5,  gaugeY, 115, 'ALT', alt);
  drawGauge(ctx, W * 0.82, gaugeY, 90, 'RPM', rpm);

  // HP bar inset
  const hpW = W * 0.7, hpH = 24, hpX = (W - hpW) / 2, hpY = dashY + dashH * 0.84;
  const pct = Math.max(0, (state.hp || 0) / PLAYER.HP);
  ctx.fillStyle = '#000000cc';
  ctx.fillRect(hpX - 3, hpY - 3, hpW + 6, hpH + 6);
  ctx.fillStyle = '#c21515';
  ctx.fillRect(hpX, hpY, hpW * pct, hpH);
  ctx.fillStyle = '#ffffffdd';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.max(0, Math.round(state.hp || 0))} / ${PLAYER.HP} HP`, W / 2, hpY + hpH + 22);

  // Twin gun breeches (end-on) sitting just above the dashboard
  const flash = state.gunFlash || 0;
  gunBreech(ctx, W / 2 - 110, dashY - 14, 42, flash);
  gunBreech(ctx, W / 2 + 110, dashY - 14, 42, flash);
}

// ---------- main HUD ----------

export function drawHud(ctx, state) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Damage vignette — more aggressive. Strong red ring AND a brief full-screen
  // red tint when flash is high (hit within the last ~100ms).
  if (state.damageFlash > 0) {
    const f = Math.max(0, Math.min(1, state.damageFlash));
    const g = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.05,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.72
    );
    g.addColorStop(0, `rgba(255,40,40,${(f * 0.15).toFixed(2)})`);
    g.addColorStop(0.55, `rgba(220,20,20,${(f * 0.55).toFixed(2)})`);
    g.addColorStop(1, `rgba(140,0,0,${f.toFixed(2)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Extra full-screen red tint on fresh hits
    if (f > 0.7) {
      ctx.fillStyle = `rgba(255,30,30,${((f - 0.7) * 0.6).toFixed(2)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
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

  // Waypoint indicator for the nearest enemy
  if (state.waypoint && !state.menu && !state.gameOver) {
    drawWaypoint(ctx, state.waypoint);
  }

  // Cockpit frame (covers lower ~32% of screen when PLAYING/GAMEOVER)
  if (state.player && !state.menu) {
    drawCockpit(ctx, state);
  }

  // Score top-left
  ctx.fillStyle = '#ffffffdd';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`KILLS ${state.kills}`, 32, 64);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#ffffff99';
  ctx.fillText(`BEST ${state.best}`, 32, 100);

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

    const d = Math.hypot(state.player.position.x, state.player.position.z);
    if (d > 1800) {
      ctx.fillStyle = '#ffee88';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RETURN TO BATTLE', CANVAS_W / 2, 260);
    }
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

  // Menu
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

  // Version
  ctx.fillStyle = '#ffffff55';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(VERSION, CANVAS_W / 2, CANVAS_H - 14);
  ctx.restore();
}
