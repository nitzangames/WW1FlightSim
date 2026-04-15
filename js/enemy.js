import { ENEMY, WORLD } from './config.js';
import { buildBiplane } from './models.js';
import { terrainHeight } from './world.js';

export class Enemy {
  constructor({ x, y, z, mode = 'chaser', variant = 'a' }) {
    this.position = { x, y, z };
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.variant = variant;
    const hpMult = variant === 'ace' ? 1.7 : 1.0;
    const speedMult = variant === 'ace' ? 1.1 : 1.0;
    this.hp = ENEMY.HP * hpMult;
    this.speed = ENEMY.SPEED * speedMult;
    this.mode = mode;
    this.alive = true;
    this.forward = { x: 0, y: 0, z: -1 };
    this.mesh = buildBiplane({ variant });
    if (variant === 'ace') this.mesh.scale.setScalar(1.25);
    this.mesh.rotation.order = 'YXZ';
    this.firing = false;
    this.fireTimer = 0;
    this.justFired = false;
    this.lastShotHit = false;
    // Death spiral state.
    this.dying = false;
    this.dyingTime = 0;
    this.justExploded = false; // set true for one frame on ground impact
  }

  startDying() {
    this.dying = true;
    this.dyingTime = 0;
  }

  updateDying(dt) {
    this.dyingTime += dt;
    // Nose-down spiral: steep pitch, fast yaw, hard roll.
    this.yaw += 3.2 * dt;
    this.pitch = Math.max(-1.25, this.pitch - 1.4 * dt);
    this.roll += 5.0 * dt;
    if (this.roll > Math.PI) this.roll -= Math.PI * 2;

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const fx = -sy * cp;
    const fy = sp;
    const fz = -cy * cp;

    // Slower horizontal drift + gravity-like vertical drop on top of forward.
    const fallSpeed = this.speed * 0.6;
    this.position.x += fx * fallSpeed * dt;
    this.position.y += fy * fallSpeed * dt - 40 * dt;
    this.position.z += fz * fallSpeed * dt;
    this.forward.x = fx; this.forward.y = fy; this.forward.z = fz;

    // Ground impact — explode when the mesh reaches the terrain surface.
    const groundY = WORLD.GROUND_Y + terrainHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY + 2) {
      this.position.y = groundY;
      this.justExploded = true;
      this.alive = false;
      this.dying = false;
    }

    this.syncMesh();
  }

  update(dt, player) {
    this.justFired = false;
    this.lastShotHit = false;
    this.justExploded = false;
    if (this.dying) {
      this.updateDying(dt);
      return;
    }
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

    // Fire at player if in-cone + in range.
    // Discrete shots: decrement fireTimer each frame while firing; every tick
    // it hits zero we spawn one bullet event (tracer + possible damage).
    const px = player.position.x - this.position.x;
    const py = player.position.y - this.position.y;
    const pz = player.position.z - this.position.z;
    const dToPlayer = Math.hypot(px, py, pz);
    if (dToPlayer > 0.01) {
      const dot = (px * this.forward.x + py * this.forward.y + pz * this.forward.z) / dToPlayer;
      const ang = Math.acos(Math.min(1, Math.max(-1, dot)));
      const FIRE_CONE = ENEMY.FIRE_CONE_DEG * Math.PI / 180;
      this.firing = (dToPlayer < ENEMY.FIRE_RANGE && ang < FIRE_CONE && dot > 0);
      if (this.firing) {
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = ENEMY.FIRE_INTERVAL;
          this.justFired = true;
          if (player.alive && Math.random() < ENEMY.HIT_CHANCE) {
            player.hp -= ENEMY.DAMAGE_PER_HIT;
            player.damageFlash = Math.min(1, (player.damageFlash || 0) + 0.35);
            this.lastShotHit = true;
          }
        }
      } else {
        this.fireTimer = ENEMY.FIRE_INTERVAL * 0.5; // small delay before first shot on re-acquire
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
    // Chaser: aim at a lead point ~60m ahead of the player so we close
    // faster than a pure tail-chase.
    return {
      x: player.position.x + player.forward.x * 60,
      y: player.position.y + player.forward.y * 60,
      z: player.position.z + player.forward.z * 60,
    };
  }

  syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    // Mesh is built with the propeller/nose at +Z; the game's forward vector
    // points toward -Z at yaw=0. Rotate the mesh 180° so the nose faces
    // along the direction of flight.
    this.mesh.rotation.y = this.yaw + Math.PI;
    this.mesh.rotation.x = this.pitch;
    this.mesh.rotation.z = -this.roll;
  }
}
