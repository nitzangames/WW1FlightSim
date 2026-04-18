import { WORLD } from './config.js';

// Transform world offset to radar-local: x right (+), y down (+). Radar "up" = player forward.
// Player forward in world: (-sin(yaw), 0, -cos(yaw)); right: (cos(yaw), 0, -sin(yaw)).
// radar.x = right projection; radar.y = -forward projection (canvas y flips).
export function worldToRadar(player, enemy, radius, range) {
  const dx = enemy.x - player.position.x;
  const dz = enemy.z - player.position.z;
  const cy = Math.cos(player.yaw);
  const sy = Math.sin(player.yaw);
  const rx = dx * cy - dz * sy;
  const ry = dx * sy + dz * cy;
  const scale = radius / range;
  let x = rx * scale;
  let y = ry * scale;
  const mag = Math.hypot(x, y);
  if (mag > radius) {
    x = x * radius / mag;
    y = y * radius / mag;
  }
  return { x, y };
}

export function drawMinimap(ctx, player, enemies, { cx, cy, radius, allies, pickups, checkpoints, nextCheckpoint }) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#00000099';
  ctx.fill();
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Player icon — triangle pointing up
  ctx.fillStyle = '#cfe6ff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx - 7, cy + 7);
  ctx.lineTo(cx + 7, cy + 7);
  ctx.closePath();
  ctx.fill();

  // Enemy dots — ace gets a gold marker, others red.
  for (const e of enemies) {
    if (!e.alive) continue;
    const p = worldToRadar(player, e.position, radius, 2000);
    const altDelta = e.position.y - player.position.y;
    const altScale = Math.max(0.5, Math.min(1.4, 1 - altDelta / 400));
    const isAce = e.variant === 'ace';
    ctx.fillStyle = isAce ? '#ffd65a' : '#ff4a4a';
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, (isAce ? 9 : 6) * altScale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Allied players (co-op) — blue triangles pointing in their heading.
  if (allies) {
    for (const a of allies) {
      const ap = worldToRadar(player, { x: a.x, z: a.z }, radius, 2000);
      ctx.fillStyle = '#4a8aff';
      ctx.save();
      ctx.translate(cx + ap.x, cy + ap.y);
      // Rotate triangle to face ally's heading relative to player.
      const relYaw = (a.yaw || 0) - player.yaw;
      ctx.rotate(relYaw);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-5, 5);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Checkpoints — cyan diamonds, next one brighter.
  if (checkpoints) {
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      if (cp.passed) continue;
      const pp = worldToRadar(player, cp, radius, 2000);
      const isNext = i === (nextCheckpoint || 0);
      ctx.fillStyle = isNext ? '#40ffee' : '#40ffee55';
      ctx.save();
      ctx.translate(cx + pp.x, cy + pp.y);
      ctx.rotate(Math.PI / 4);
      const sz = isNext ? 8 : 5;
      ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
      ctx.restore();
    }
  }

  // Health pickups — green crosses on the radar.
  if (pickups) {
    for (const pk of pickups) {
      const pp = worldToRadar(player, pk, radius, 2000);
      ctx.strokeStyle = '#40ee50';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + pp.x - 5, cy + pp.y); ctx.lineTo(cx + pp.x + 5, cy + pp.y);
      ctx.moveTo(cx + pp.x, cy + pp.y - 5); ctx.lineTo(cx + pp.x, cy + pp.y + 5);
      ctx.stroke();
    }
  }

  // Edge arrow if past soft return
  const distXZ = Math.hypot(player.position.x, player.position.z);
  if (distXZ > WORLD.RETURN_SOFT) {
    const originLocal = worldToRadar(player, { x: 0, y: 0, z: 0 }, radius, 2000);
    const mag = Math.hypot(originLocal.x, originLocal.y) || 1;
    const ax = (originLocal.x / mag) * (radius - 8);
    const ay = (originLocal.y / mag) * (radius - 8);
    ctx.fillStyle = '#ffee88';
    ctx.beginPath();
    ctx.arc(cx + ax, cy + ay, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
