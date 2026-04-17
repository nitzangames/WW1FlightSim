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
  // Shorter dashboard — 24% instead of 32% so more sky is visible.
  const dashH = H * 0.24;
  const dashY = H - dashH;

  // Wooden panel
  woodPanel(ctx, 0, dashY, W, dashH);

  // Leather top trim
  ctx.fillStyle = '#2e1d10';
  ctx.fillRect(0, dashY, W, 22);
  ctx.strokeStyle = '#d7b470';
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, dashY + 11); ctx.lineTo(W, dashY + 11); ctx.stroke();
  ctx.setLineDash([]);

  // 3 gauges — HP (left), ALT (center, bigger), RPM (right)
  // Gauges scaled down slightly to fit the shorter panel.
  const gaugeY = dashY + dashH * 0.52;
  const hpGauge = Math.max(0, Math.min(200, ((state.hp || 0) / PLAYER.HP) * 200));
  const alt = Math.max(0, Math.min(200, (state.altitude || 0) * 0.5));
  const rpm = 120 + (state.rpmJitter || 0) * 20;
  const hpColor = hpGauge > 100 ? '#ffe580' : hpGauge > 40 ? '#ff9944' : '#ff3333';
  drawGauge(ctx, W * 0.18, gaugeY, 72, 'HP', hpGauge, 200, hpColor);
  drawGauge(ctx, W * 0.5,  gaugeY, 92, 'ALT', alt);
  drawGauge(ctx, W * 0.82, gaugeY, 72, 'RPM', rpm);

  // Twin gun breeches (end-on) sitting just above the dashboard
  const flash = state.gunFlash || 0;
  gunBreech(ctx, W / 2 - 100, dashY - 12, 36, flash);
  gunBreech(ctx, W / 2 + 100, dashY - 12, 36, flash);
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

  // Cockpit frame (visible during takeoff, playing, and gameover)
  if (state.player && !state.menu) {
    drawCockpit(ctx, state);
  }

  // Score top-left + ammo bar
  ctx.fillStyle = '#ffffffdd';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${state.kills}`, 32, 64);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#ffffff99';
  ctx.fillText(`BEST ${state.best}`, 32, 100);

  // Ammo bar under kills display (only during play)
  if (!state.menu && !state.gameOver && state.ammo !== undefined) {
    const ammoW = 180, ammoH = 12, ammoX = 32, ammoY = 114;
    const ammoPct = Math.max(0, state.ammo / (state.maxAmmo || 200));
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(ammoX - 1, ammoY - 1, ammoW + 2, ammoH + 2);
    ctx.fillStyle = state.reloading ? '#888844' : ammoPct < 0.2 ? '#ff4444' : '#dda844';
    ctx.fillRect(ammoX, ammoY, ammoW * ammoPct, ammoH);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.reloading ? 'RELOADING...' : `AMMO ${state.ammo}`, ammoX, ammoY + ammoH + 16);
  }

  // Wave announcement flash (top-center)
  if (state.waveFlash > 0 && !state.menu && !state.gameOver) {
    const alpha = Math.min(1, state.waveFlash * 1.5);
    ctx.fillStyle = `rgba(255,214,90,${alpha.toFixed(2)})`;
    ctx.font = 'bold 72px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${state.wave}`, CANVAS_W / 2, CANVAS_H * 0.18);
  }

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
      allies: state.allies,
      pickups: state.pickups,
    });

    const d = Math.hypot(state.player.position.x, state.player.position.z);
    if (d > 1800) {
      ctx.fillStyle = '#ffee88';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RETURN TO BATTLE', CANVAS_W / 2, 260);
    }
  }

  // Game over — score breakdown + rank
  if (state.gameOver) {
    ctx.fillStyle = '#000000cc';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const mx = CANVAS_W / 2;
    let y = CANVAS_H * 0.22;

    ctx.fillStyle = '#ffeded';
    ctx.textAlign = 'center';
    ctx.font = 'bold 96px serif';
    ctx.fillText('SHOT DOWN', mx, y);
    y += 80;

    // Rank title
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 52px serif';
    ctx.fillText(state.rank || 'Cadet', mx, y);
    y += 70;

    // Score breakdown
    ctx.fillStyle = '#ffffffdd';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`SCORE: ${state.kills}`, mx, y);
    y += 55;

    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#ffffffaa';
    if (state.planeKills > 0) {
      ctx.fillText(`Planes: ${state.planeKills} × 2 = ${state.planeKills * 2}`, mx, y); y += 34;
    }
    if (state.balloonKills > 0) {
      ctx.fillText(`Balloons: ${state.balloonKills} × 1 = ${state.balloonKills}`, mx, y); y += 34;
    }
    if (state.zeppelinKills > 0) {
      ctx.fillText(`Zeppelins: ${state.zeppelinKills} × 5 = ${state.zeppelinKills * 5}`, mx, y); y += 34;
    }
    y += 16;

    ctx.fillStyle = '#ffffff88';
    ctx.font = '28px sans-serif';
    ctx.fillText(`BEST ${state.best}`, mx, y);
    y += 50;

    // Leaderboard rank from last submission.
    const lb = state.leaderboard;
    if (lb && lb.lastSubmit && lb.lastSubmit.rank) {
      ctx.fillStyle = '#ffd65a';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(`RANK #${lb.lastSubmit.rank} of ${lb.lastSubmit.total}`, mx, y);
      y += 44;

      // Nearby entries.
      const board = lb.lastSubmit.board;
      const entries = lb[board] ? lb[board].entries : [];
      if (entries.length > 0) {
        ctx.font = '22px sans-serif';
        for (const e of entries) {
          ctx.fillStyle = e.isMe ? '#ffd65a' : '#ffffffaa';
          const name = (e.metadata && e.metadata.name) || 'Pilot';
          ctx.fillText(`#${e.rank} ${name} — ${e.value} kills`, mx, y);
          y += 28;
        }
      }
    }
    y += 30;

    ctx.fillStyle = '#ffffffcc';
    ctx.font = '30px sans-serif';
    ctx.fillText('TAP TO FLY AGAIN', mx, y);
  }

  // Menu — vintage poster style with 3D Fokker visible through a parchment overlay.
  if (state.menu) {
    const mx = CANVAS_W / 2;

    // Semi-transparent parchment overlay — lets the 3D scene bleed through.
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, 'rgba(190,170,140,0.82)');
    bg.addColorStop(0.45, 'rgba(180,158,120,0.60)');
    bg.addColorStop(0.7, 'rgba(170,148,110,0.75)');
    bg.addColorStop(1, 'rgba(150,128,90,0.88)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Aged noise dots.
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#4a3a1a' : '#f0e8d0';
      ctx.fillRect(Math.random() * CANVAS_W, Math.random() * CANVAS_H, 4, 4);
    }
    ctx.globalAlpha = 1;

    // Decorative double border.
    ctx.strokeStyle = '#5a3a1a88';
    ctx.lineWidth = 5;
    ctx.strokeRect(40, 40, CANVAS_W - 80, CANVAS_H - 80);
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, CANVAS_W - 104, CANVAS_H - 104);

    // Iron cross emblem at top.
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(mx - 50, 100, 100, 22);
    ctx.fillRect(mx - 11, 70, 22, 85);

    // Title.
    ctx.fillStyle = '#2a1a0a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 140px serif';
    ctx.fillText('WW1', mx, 280);
    ctx.font = 'bold 90px serif';
    ctx.fillText('FLIGHT SIM', mx, 390);

    // Subtitle.
    ctx.font = 'italic 28px serif';
    ctx.fillStyle = '#5a4a2a';
    ctx.fillText('The Great War in the Skies', mx, 440);

    // Brass-styled buttons.
    const btnW = 520, btnH = 100;
    const soloY = CANVAS_H * 0.58;

    // Solo button (brass fill).
    ctx.fillStyle = '#8a6a30';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2, soloY, btnW, btnH, 12); ctx.fill();
    ctx.fillStyle = '#5a4020';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2 + 3, soloY + 3, btnW - 6, btnH - 6, 10); ctx.fill();
    ctx.fillStyle = '#f0e0b0';
    ctx.font = 'bold 44px serif';
    ctx.fillText('SOLO FLIGHT', mx, soloY + 64);
    drawHud._soloBtn = { x: mx - btnW / 2, y: soloY, w: btnW, h: btnH };

    // Multiplayer button.
    const mpY = soloY + btnH + 30;
    ctx.fillStyle = '#8a6a30';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2, mpY, btnW, btnH, 12); ctx.fill();
    ctx.fillStyle = state.mpAvailable ? '#3a4a6a' : '#4a3a22';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2 + 3, mpY + 3, btnW - 6, btnH - 6, 10); ctx.fill();
    ctx.fillStyle = '#f0e0b0';
    ctx.font = 'bold 44px serif';
    ctx.fillText('CO-OP', mx, mpY + 64);
    drawHud._mpBtn = { x: mx - btnW / 2, y: mpY, w: btnW, h: btnH };

    // Best score + leaderboard ranks.
    ctx.fillStyle = '#5a4a2a';
    ctx.font = '26px serif';
    let infoY = mpY + btnH + 50;
    ctx.fillText(`BEST: ${state.best}`, mx, infoY);
    infoY += 36;

    const lb = state.leaderboard;
    if (lb) {
      ctx.font = '22px sans-serif';
      if (lb.solo.rank) {
        ctx.fillStyle = '#5a4a2a';
        ctx.fillText(`Solo: ${lb.solo.best} kills — Rank #${lb.solo.rank}/${lb.solo.total}`, mx, infoY);
        infoY += 30;
      }
      if (lb.coop.rank) {
        ctx.fillStyle = '#5a4a2a';
        ctx.fillText(`Co-op: ${lb.coop.best} kills — Rank #${lb.coop.rank}/${lb.coop.total}`, mx, infoY);
        infoY += 30;
      }
    }
  }

  // Tutorial popup — shown once during first takeoff.
  if (state.showTutorial) {
    const mx = CANVAS_W / 2;
    const boxW = CANVAS_W * 0.82, boxH = 520;
    const boxX = mx - boxW / 2, boxY = CANVAS_H * 0.18;

    // Dark rounded panel
    ctx.fillStyle = 'rgba(20,15,10,0.88)';
    ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 20); ctx.fill();
    ctx.strokeStyle = '#8a6a30';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 20); ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 48px serif';
    ctx.fillText('HOW TO FLY', mx, boxY + 70);

    ctx.fillStyle = '#ffffffdd';
    ctx.font = '30px sans-serif';
    let ty = boxY + 130;
    ctx.fillText('Touch & drag anywhere', mx, ty); ty += 44;
    ctx.fillText('to steer your plane', mx, ty); ty += 70;

    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('Guns fire automatically', mx, ty); ty += 40;
    ctx.fillStyle = '#ffffffbb';
    ctx.font = '26px sans-serif';
    ctx.fillText('when an enemy is in your', mx, ty); ty += 34;
    ctx.fillText('crosshair', mx, ty); ty += 70;

    ctx.fillStyle = '#ffffff66';
    ctx.font = '24px sans-serif';
    ctx.fillText('TAP TO DISMISS', mx, ty);
  }

  // Pause button — small icon top-left (below kills/ammo) during play.
  if (!state.menu && !state.gameOver && !state.paused) {
    const pbX = 32, pbY = 152, pbS = 42;
    ctx.fillStyle = '#00000055';
    ctx.beginPath(); ctx.roundRect(pbX, pbY, pbS, pbS, 8); ctx.fill();
    ctx.fillStyle = '#ffffffbb';
    ctx.fillRect(pbX + 12, pbY + 10, 7, 22);
    ctx.fillRect(pbX + 23, pbY + 10, 7, 22);
    drawHud._pauseBtn = { x: pbX, y: pbY, w: pbS, h: pbS };
  } else {
    drawHud._pauseBtn = null;
  }

  // Pause overlay.
  if (state.paused && !state.settingsOpen) {
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const mx = CANVAS_W / 2;

    ctx.fillStyle = '#ffd65a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 80px serif';
    ctx.fillText('PAUSED', mx, CANVAS_H * 0.3);

    const btnW = 480, btnH = 90;
    // Resume
    const rY = CANVAS_H * 0.42;
    ctx.fillStyle = '#4a8a2a';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2, rY, btnW, btnH, 14); ctx.fill();
    ctx.fillStyle = '#ffffffee';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('RESUME', mx, rY + 58);
    drawHud._resumeBtn = { x: mx - btnW / 2, y: rY, w: btnW, h: btnH };

    // Settings
    const sY = rY + btnH + 24;
    ctx.fillStyle = '#4a4a5a';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2, sY, btnW, btnH, 14); ctx.fill();
    ctx.fillStyle = '#ffffffee';
    ctx.fillText('SETTINGS', mx, sY + 58);
    drawHud._settingsBtn = { x: mx - btnW / 2, y: sY, w: btnW, h: btnH };

    // Quit
    const qY = sY + btnH + 24;
    ctx.fillStyle = '#8a2a2a';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2, qY, btnW, btnH, 14); ctx.fill();
    ctx.fillStyle = '#ffffffee';
    ctx.fillText('QUIT TO MENU', mx, qY + 58);
    drawHud._quitBtn = { x: mx - btnW / 2, y: qY, w: btnW, h: btnH };
  } else {
    drawHud._resumeBtn = null;
    drawHud._settingsBtn = null;
    drawHud._quitBtn = null;
  }

  // Settings screen.
  if (state.paused && state.settingsOpen) {
    ctx.fillStyle = '#000000cc';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const mx = CANVAS_W / 2;

    ctx.fillStyle = '#ffd65a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px serif';
    ctx.fillText('SETTINGS', mx, CANVAS_H * 0.2);

    const rowH = 100, startY = CANVAS_H * 0.3;
    const settings = state.settings || {};

    // Sound toggle
    ctx.fillStyle = '#ffffffdd';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sound', 100, startY + 45);
    const sndX = CANVAS_W - 240, sndW = 160, sndH = 60;
    ctx.fillStyle = settings.soundOn ? '#4a8a2a' : '#5a2a2a';
    ctx.beginPath(); ctx.roundRect(sndX, startY + 12, sndW, sndH, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(settings.soundOn ? 'ON' : 'OFF', sndX + sndW / 2, startY + 50);
    drawHud._soundBtn = { x: sndX, y: startY + 12, w: sndW, h: sndH };

    // Invert Y toggle
    const iyY = startY + rowH;
    ctx.fillStyle = '#ffffffdd';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Invert Y', 100, iyY + 45);
    ctx.fillStyle = settings.invertY ? '#4a8a2a' : '#5a2a2a';
    ctx.beginPath(); ctx.roundRect(sndX, iyY + 12, sndW, sndH, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(settings.invertY ? 'ON' : 'OFF', sndX + sndW / 2, iyY + 50);
    drawHud._invertBtn = { x: sndX, y: iyY + 12, w: sndW, h: sndH };

    // Sensitivity (3-step)
    const senY = startY + rowH * 2;
    ctx.fillStyle = '#ffffffdd';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sensitivity', 100, senY + 45);
    const senLabels = ['LOW', 'MED', 'HIGH'];
    const senVals = [0.6, 1.0, 1.5];
    const senIdx = senVals.indexOf(settings.sensitivity) >= 0 ? senVals.indexOf(settings.sensitivity) : 1;
    const senBtnW = 140;
    drawHud._senBtns = [];
    for (let i = 0; i < 3; i++) {
      const bx = 100 + i * (senBtnW + 16);
      const active = i === senIdx;
      ctx.fillStyle = active ? '#4a6a8a' : '#3a3a4a';
      ctx.beginPath(); ctx.roundRect(bx, senY + rowH - 10, senBtnW, sndH, 10); ctx.fill();
      ctx.fillStyle = active ? '#fff' : '#aaa';
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(senLabels[i], bx + senBtnW / 2, senY + rowH + 28);
      drawHud._senBtns.push({ x: bx, y: senY + rowH - 10, w: senBtnW, h: sndH, val: senVals[i] });
    }

    // Back button
    const backY = CANVAS_H * 0.78;
    const btnW = 400, btnH = 85;
    ctx.fillStyle = '#5a5a6a';
    ctx.beginPath(); ctx.roundRect(mx - btnW / 2, backY, btnW, btnH, 14); ctx.fill();
    ctx.fillStyle = '#ffffffee';
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('BACK', mx, backY + 55);
    drawHud._settingsBackBtn = { x: mx - btnW / 2, y: backY, w: btnW, h: btnH };
  } else {
    drawHud._soundBtn = null;
    drawHud._invertBtn = null;
    drawHud._senBtns = null;
    drawHud._settingsBackBtn = null;
  }

  // Version
  ctx.fillStyle = '#ffffff55';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(VERSION, CANVAS_W / 2, CANVAS_H - 14);
  ctx.restore();
}
