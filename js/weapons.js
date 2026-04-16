import { GUN } from './config.js';

const DEG = Math.PI / 180;

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
    // Target matches bullet speed: linear solve. Fall back to range/speed
    // when b≈0 (perpendicular motion) so we never return NaN.
    t = Math.abs(b) < 1e-6 ? Math.hypot(dx, dy, dz) / bulletSpeed : -c / b;
    if (!(t > 0)) t = Math.hypot(dx, dy, dz) / bulletSpeed;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) t = Math.hypot(dx, dy, dz) / bulletSpeed;
    else t = Math.max(0, (-b - Math.sqrt(disc)) / (2 * a));
    if (!(t > 0)) t = Math.max(0, (-b + Math.sqrt(disc)) / (2 * a));
  }
  return { x: target.x + vx * t, y: target.y + vy * t, z: target.z + vz * t, t };
}

export class Guns {
  constructor(scene, maxTracers = 60) {
    this.scene = scene;
    this.cooldown = 0;
    this.fireInterval = 60 / GUN.RPM; // seconds per round
    this.tracers = [];
    this.maxTracers = maxTracers;
    this.flashTimer = 0;
    this._tracerCounter = 0;

    // Bigger, longer tracers so the stream reads clearly against sky/terrain.
    const geom = new THREE.CylinderGeometry(0.12, 0.12, 5.0, 6);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe26a, fog: false });
    for (let i = 0; i < maxTracers; i++) {
      const m = new THREE.Mesh(geom, mat);
      m.visible = false;
      this.tracers.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
      scene.add(m);
    }
    this.bulletSpeed = 500; // m/s, visual
  }

  update(dt, player, enemies, canFire = true) {
    this.cooldown -= dt;
    this.flashTimer -= dt;

    // Find best target in cone (closest) — skip if out of ammo.
    let target = null;
    let bestDist2 = Infinity;
    if (!canFire) { /* out of ammo / reloading */ }
    else for (const e of enemies) {
      if (!e.alive || e.dying) continue;
      if (inCone(player.position, player.forward, e.position, { angle: GUN.CONE_DEG * DEG, range: GUN.RANGE })) {
        const d2 = dist2(player.position, e.position);
        if (d2 < bestDist2) { target = e; bestDist2 = d2; }
      }
    }

    // Fire
    let fired = false;
    while (target && this.cooldown <= 0) {
      this.cooldown += this.fireInterval;
      this.flashTimer = 0.05;
      fired = true;

      // Aim-lead hit test
      const enemyWithVel = {
        x: target.position.x, y: target.position.y, z: target.position.z,
        vx: target.forward.x * target.speed,
        vy: target.forward.y * target.speed,
        vz: target.forward.z * target.speed,
      };
      const lead = leadTarget(player.position, enemyWithVel, this.bulletSpeed);
      if (inCone(player.position, player.forward, lead, { angle: GUN.CONE_DEG * DEG, range: GUN.RANGE })) {
        target.hp -= GUN.DAMAGE_PER_ROUND;
      }

      this._tracerCounter++;
      if (this._tracerCounter % 3 === 0) this.spawnTracer(player);
    }
    if (!target) this.cooldown = Math.max(0, this.cooldown);

    // Update tracers
    for (const t of this.tracers) {
      if (!t.mesh.visible) continue;
      t.mesh.position.x += t.vx * dt;
      t.mesh.position.y += t.vy * dt;
      t.mesh.position.z += t.vz * dt;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false;
    }

    return { firing: fired, target };
  }

  spawnTracer(player) {
    const slot = this.tracers.find(t => !t.mesh.visible);
    if (!slot) return;
    slot.mesh.visible = true;
    slot.mesh.position.set(player.position.x, player.position.y, player.position.z);
    slot.mesh.lookAt(
      player.position.x + player.forward.x,
      player.position.y + player.forward.y,
      player.position.z + player.forward.z
    );
    slot.vx = player.forward.x * this.bulletSpeed;
    slot.vy = player.forward.y * this.bulletSpeed;
    slot.vz = player.forward.z * this.bulletSpeed;
    slot.life = 1.0;
  }
}

// Enemy tracer pool: red-orange rounds fired toward the player.
// Visual only — damage is applied directly in Enemy.update.
export class EnemyTracers {
  constructor(scene, maxTracers = 80) {
    this.tracers = [];
    this.bulletSpeed = 340; // slower than player rounds so they're more visible passing by

    const geom = new THREE.CylinderGeometry(0.14, 0.14, 4.5, 6);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff5a2e, fog: false });
    for (let i = 0; i < maxTracers; i++) {
      const m = new THREE.Mesh(geom, mat);
      m.visible = false;
      this.tracers.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
      scene.add(m);
    }
  }

  // Spawn a tracer from `origin` aiming at `targetPos` with `spreadRad` of random offset.
  spawn(origin, targetPos, spreadRad = 0) {
    const slot = this.tracers.find(t => !t.mesh.visible);
    if (!slot) return;
    let dx = targetPos.x - origin.x;
    let dy = targetPos.y - origin.y;
    let dz = targetPos.z - origin.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    // Apply spread: small random perpendicular nudge
    if (spreadRad > 0) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.tan(Math.random() * spreadRad);
      // pick an arbitrary perpendicular basis (up-ish)
      const up = Math.abs(dy) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
      // right = up × dir
      const rx = up.y * dz - up.z * dy;
      const ry = up.z * dx - up.x * dz;
      const rz = up.x * dy - up.y * dx;
      const rm = Math.hypot(rx, ry, rz) || 1;
      const rnx = rx / rm, rny = ry / rm, rnz = rz / rm;
      // upn = dir × right
      const unx = dy * rnz - dz * rny;
      const uny = dz * rnx - dx * rnz;
      const unz = dx * rny - dy * rnx;
      dx += r * (Math.cos(a) * rnx + Math.sin(a) * unx);
      dy += r * (Math.cos(a) * rny + Math.sin(a) * uny);
      dz += r * (Math.cos(a) * rnz + Math.sin(a) * unz);
      const m2 = Math.hypot(dx, dy, dz) || 1;
      dx /= m2; dy /= m2; dz /= m2;
    }
    slot.mesh.visible = true;
    slot.mesh.position.set(origin.x, origin.y, origin.z);
    slot.mesh.lookAt(origin.x + dx, origin.y + dy, origin.z + dz);
    slot.vx = dx * this.bulletSpeed;
    slot.vy = dy * this.bulletSpeed;
    slot.vz = dz * this.bulletSpeed;
    slot.life = 1.4; // long enough to pass the player visibly
  }

  update(dt) {
    for (const t of this.tracers) {
      if (!t.mesh.visible) continue;
      t.mesh.position.x += t.vx * dt;
      t.mesh.position.y += t.vy * dt;
      t.mesh.position.z += t.vz * dt;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false;
    }
  }
}

function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
