import { ENEMY } from './config.js';
import { buildBiplane } from './models.js';

export class Enemy {
  constructor({ x, y, z, mode = 'chaser' }) {
    this.position = { x, y, z };
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.hp = ENEMY.HP;
    this.speed = ENEMY.SPEED;
    this.mode = mode;
    this.alive = true;
    this.forward = { x: 0, y: 0, z: -1 };
    this.mesh = buildBiplane();
    this.mesh.rotation.order = 'YXZ';
  }

  update(dt, player) {
    // Compute desired heading
    const targetPoint = this.computeTargetPoint(player);
    const dx = targetPoint.x - this.position.x;
    const dy = targetPoint.y - this.position.y;
    const dz = targetPoint.z - this.position.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / dist, ny = dy / dist, nz = dz / dist;

    const desiredYaw = Math.atan2(-nx, -nz);
    const desiredPitch = Math.asin(Math.max(-1, Math.min(1, ny)));

    // Limit turn rate
    const turnCap = ENEMY.TURN_CAP;
    let dYaw = desiredYaw - this.yaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    this.yaw += Math.sign(dYaw) * Math.min(Math.abs(dYaw), turnCap * dt);
    let dPitch = desiredPitch - this.pitch;
    this.pitch += Math.sign(dPitch) * Math.min(Math.abs(dPitch), turnCap * 0.7 * dt);
    // Bank visually into turns
    this.roll += (dYaw * 1.5 - this.roll) * 0.08;
    this.roll = Math.max(-1.0, Math.min(1.0, this.roll));

    // Forward integration
    const fx = -Math.sin(this.yaw) * Math.cos(this.pitch);
    const fy = Math.sin(this.pitch);
    const fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    this.position.x += fx * this.speed * dt;
    this.position.y += fy * this.speed * dt;
    this.position.z += fz * this.speed * dt;
    this.forward.x = fx;
    this.forward.y = fy;
    this.forward.z = fz;

    // Fire at player if in-cone + in range
    const px = player.position.x - this.position.x;
    const py = player.position.y - this.position.y;
    const pz = player.position.z - this.position.z;
    const dToPlayer = Math.hypot(px, py, pz);
    if (dToPlayer > 0.01) {
      const dot = (px * this.forward.x + py * this.forward.y + pz * this.forward.z) / dToPlayer;
      const ang = Math.acos(Math.min(1, Math.max(-1, dot)));
      const FIRE_CONE = ENEMY.FIRE_CONE_DEG * Math.PI / 180;
      this.firing = (dToPlayer < ENEMY.FIRE_RANGE && ang < FIRE_CONE && dot > 0);
      if (this.firing && player.alive) {
        player.hp -= ENEMY.DPS * dt;
        player.damageFlash = Math.min(1, (player.damageFlash || 0) + ENEMY.DPS * dt / 20);
      }
    } else {
      this.firing = false;
    }

    this.syncMesh();
  }

  computeTargetPoint(player) {
    if (this.mode === 'jouster') {
      // Aim for a point 200m ahead of player's nose
      return {
        x: player.position.x + player.forward.x * 200,
        y: player.position.y + player.forward.y * 200,
        z: player.position.z + player.forward.z * 200,
      };
    }
    // Chaser: aim at player's current position
    return { ...player.position };
  }

  syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw;
    this.mesh.rotation.x = this.pitch;
    this.mesh.rotation.z = -this.roll;
  }
}
