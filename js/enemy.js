import { ENEMY, WORLD } from './config.js';
import { buildBiplane } from './models.js';
import { terrainHeight } from './world.js';

export class Enemy {
  constructor({ x, y, z, mode = 'chaser', variant = 'a' }) {
    this.type = 'plane';
    this.killValue = 1;
    this.position = { x, y, z };
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.variant = variant;
    const hpMult = variant === 'ace' ? 1.7 : 1.0;
    const speedMult = variant === 'ace' ? 1.1 : 1.0;
    this.hp = ENEMY.HP * hpMult;
    this.maxHp = this.hp;
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
    // Preserve momentum at moment of death — the plane coasts ballistically
    // while visually spinning out of control.
    this.fallVx = this.forward.x * this.speed;
    this.fallVy = this.forward.y * this.speed;
    this.fallVz = this.forward.z * this.speed;
  }

  updateDying(dt) {
    this.dyingTime += dt;
    // Visual spin — decoupled from the trajectory.
    this.yaw += 3.2 * dt;
    this.pitch = Math.max(-1.25, this.pitch - 1.4 * dt);
    this.roll += 5.0 * dt;
    if (this.roll > Math.PI) this.roll -= Math.PI * 2;

    // Ballistic motion: gravity + gentle horizontal drag.
    this.fallVy -= 55 * dt;
    const drag = Math.exp(-0.35 * dt);
    this.fallVx *= drag;
    this.fallVz *= drag;
    this.position.x += this.fallVx * dt;
    this.position.y += this.fallVy * dt;
    this.position.z += this.fallVz * dt;

    // Align forward with motion so the smoke trail looks natural.
    const vmag = Math.hypot(this.fallVx, this.fallVy, this.fallVz) || 1;
    this.forward.x = this.fallVx / vmag;
    this.forward.y = this.fallVy / vmag;
    this.forward.z = this.fallVz / vmag;

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
    const dx = player.position.x - this.position.x;
    const dy = player.position.y - this.position.y;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dy, dz);

    // Break off when too close to avoid ramming — climb hard and veer
    // to one side, then re-engage after gaining distance.
    if (dist < 55) {
      const side = (this.position.x * 7 + this.position.z * 13) % 2 < 1 ? 1 : -1;
      return {
        x: this.position.x + this.forward.x * 120 + side * 70,
        y: this.position.y + 80,
        z: this.position.z + this.forward.z * 120,
      };
    }

    if (this.mode === 'jouster') {
      return {
        x: player.position.x + player.forward.x * 200,
        y: player.position.y + player.forward.y * 200,
        z: player.position.z + player.forward.z * 200,
      };
    }
    // Chaser: aim at a lead point ~60m ahead of the player.
    return {
      x: player.position.x + player.forward.x * 60,
      y: player.position.y + player.forward.y * 60,
      z: player.position.z + player.forward.z * 60,
    };
  }

  syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    // Mesh is built with the propeller/nose at +Z; the game's forward vector
    // points toward -Z at yaw=0. Rotate the mesh 180° so the nose faces along
    // the direction of flight. That π yaw offset also flips the mesh's local
    // X and Z axes, so pitch and roll must be applied with inverted signs or
    // the mesh ends up pointing opposite to the physics during dives/banks.
    this.mesh.rotation.y = this.yaw + Math.PI;
    this.mesh.rotation.x = -this.pitch;
    this.mesh.rotation.z = this.roll;
  }
}
