export function inCone(self, forward, enemy, { angle, range }) {
  const dx = enemy.x - self.x;
  const dy = enemy.y - self.y;
  const dz = enemy.z - self.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > range || dist < 0.01) return false;
  const fmag = Math.hypot(forward.x, forward.y, forward.z) || 1;
  const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / (dist * fmag);
  if (dot <= 0) return false;
  const ang = Math.acos(Math.min(1, Math.max(-1, dot)));
  return ang <= angle;
}

export function leadTarget(shooter, target, bulletSpeed) {
  const dx = target.x - shooter.x;
  const dy = target.y - shooter.y;
  const dz = target.z - shooter.z;
  const vx = target.vx || 0, vy = target.vy || 0, vz = target.vz || 0;
  const a = vx * vx + vy * vy + vz * vz - bulletSpeed * bulletSpeed;
  const b = 2 * (dx * vx + dy * vy + dz * vz);
  const c = dx * dx + dy * dy + dz * dz;
  let t;
  if (Math.abs(a) < 1e-6) {
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) t = Math.hypot(dx, dy, dz) / bulletSpeed;
    else t = Math.max(0, (-b - Math.sqrt(disc)) / (2 * a));
    if (!(t > 0)) t = Math.max(0, (-b + Math.sqrt(disc)) / (2 * a));
  }
  return { x: target.x + vx * t, y: target.y + vy * t, z: target.z + vz * t, t };
}
