import { buildBalloon, buildZeppelin, buildArtillery } from './models.js';
import { WORLD } from './config.js';
import { terrainHeight } from './world.js';

// Balloons and zeppelins duck-type Enemy so guns.update and main.js handle them
// uniformly. Key fields: type, killValue, position, forward, yaw/pitch/roll,
// hp, alive, dying, justExploded, firing, justFired, mesh, update(), startDying().

export class Balloon {
  constructor({ x, y, z }) {
    this.type = 'balloon';
    this.killValue = 1;
    this.position = { x, y, z };
    this.forward = { x: 0, y: 0, z: -1 };
    this.yaw = Math.random() * Math.PI * 2;
    this.pitch = 0;
    this.roll = 0;
    this.hp = 40;
    this.maxHp = 40;
    this.speed = 0;
    this.alive = true;
    this.dying = false;
    this.dyingTime = 0;
    this.justExploded = false;
    this.firing = false;
    this.justFired = false;
    this.lastShotHit = false;
    this.mode = 'balloon';
    this.variant = 'balloon';
    this.mesh = buildBalloon();
    this.mesh.rotation.order = 'YXZ';
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = this.yaw;
    this._tether = this.mesh.userData.tether;
    this.swayT = Math.random() * Math.PI * 2;
    this.fallVy = 0;
  }

  startDying() {
    this.dying = true;
    this.dyingTime = 0;
    // alive stays TRUE so the spawner doesn't remove the mesh during the fall.
    // It flips to false only on ground impact.
    this.fallVy = -4;
    if (this._tether) this._tether.visible = false;
  }

  update(dt, _player) {
    this.justFired = false;
    this.justExploded = false;
    if (this.dying) {
      this.dyingTime += dt;
      this.fallVy -= 28 * dt;
      this.position.y += this.fallVy * dt;
      this.yaw += 1.6 * dt;
      this.pitch -= 0.7 * dt;
      this.roll += 2.4 * dt;
      const groundY = WORLD.GROUND_Y + terrainHeight(this.position.x, this.position.z);
      if (this.position.y <= groundY + 1) {
        this.position.y = groundY;
        this.justExploded = true;
        this.alive = false;
        this.dying = false;
      }
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      this.mesh.rotation.y = this.yaw;
      this.mesh.rotation.x = this.pitch;
      this.mesh.rotation.z = this.roll;
    } else {
      this.swayT += dt * 0.6;
      this.mesh.position.x = this.position.x;
      this.mesh.position.z = this.position.z;
      this.mesh.position.y = this.position.y + Math.sin(this.swayT) * 0.6;
    }
  }
}

export class Zeppelin {
  constructor({ x, y, z }) {
    this.type = 'zeppelin';
    this.killValue = 5;
    this.position = { x, y, z };
    this.yaw = Math.random() * Math.PI * 2;
    this.pitch = 0;
    this.roll = 0;
    this.forward = { x: -Math.sin(this.yaw), y: 0, z: -Math.cos(this.yaw) };
    this.hp = 250;
    this.maxHp = 250;
    this.speed = 6; // very slow patrol
    this.alive = true;
    this.dying = false;
    this.dyingTime = 0;
    this.justExploded = false;
    this.firing = false;
    this.justFired = false;
    this.lastShotHit = false;
    this.mode = 'zeppelin';
    this.variant = 'zeppelin';
    this.mesh = buildZeppelin();
    this.mesh.rotation.order = 'YXZ';
  }

  startDying() {
    this.dying = true;
    this.dyingTime = 0;
    // alive stays TRUE during the fall — flipped on ground impact.
    // Preserve horizontal drift so it arcs forward while sinking.
    this.fallVx = this.forward.x * this.speed;
    this.fallVy = 0;
    this.fallVz = this.forward.z * this.speed;
  }

  update(dt, _player) {
    this.justFired = false;
    this.justExploded = false;

    if (this.dying) {
      this.dyingTime += dt;
      // Gravity pulls down; gentle drag bleeds off horizontal drift.
      this.fallVy -= 12 * dt;
      const drag = Math.exp(-0.12 * dt);
      this.fallVx *= drag;
      this.fallVz *= drag;
      this.position.x += this.fallVx * dt;
      this.position.y += this.fallVy * dt;
      this.position.z += this.fallVz * dt;
      // Nose tilts progressively toward the ground — dramatic 35° max.
      this.pitch = Math.max(-0.6, this.pitch - 0.1 * dt);
      this.roll += 0.15 * dt;
      this.yaw += 0.22 * dt;
      const vmag = Math.hypot(this.fallVx, this.fallVy, this.fallVz) || 1;
      this.forward.x = this.fallVx / vmag;
      this.forward.y = this.fallVy / vmag;
      this.forward.z = this.fallVz / vmag;
      const groundY = WORLD.GROUND_Y + terrainHeight(this.position.x, this.position.z);
      if (this.position.y <= groundY + 6) {
        this.position.y = groundY;
        this.justExploded = true;
        this.alive = false;
        this.dying = false;
      }
    } else {
      // Slow linear drift
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      this.position.x += fx * this.speed * dt;
      this.position.z += fz * this.speed * dt;
      this.forward.x = fx; this.forward.z = fz;
      // Turn back toward origin if drifting too far
      const r = Math.hypot(this.position.x, this.position.z);
      if (r > 1400) {
        const toCenter = Math.atan2(-this.position.x, -this.position.z);
        let delta = toCenter - this.yaw;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        this.yaw += Math.sign(delta) * Math.min(Math.abs(delta), 0.12 * dt);
      }
    }

    // Sync mesh — same +π yaw offset as planes so the nose faces forward,
    // and negated pitch/roll to compensate for the flipped local axes.
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw + Math.PI;
    this.mesh.rotation.x = -this.pitch;
    this.mesh.rotation.z = this.roll;
  }
}

// Ground artillery: stationary gun emplacement. Fires slow shells at the
// player when within range. Low HP — one good strafing run kills it.
export class Artillery {
  constructor({ x, z }) {
    this.type = 'artillery';
    this.killValue = 1;
    const y = WORLD.GROUND_Y + terrainHeight(x, z) + 0.5;
    this.position = { x, y, z };
    this.forward = { x: 0, y: 0, z: -1 };
    this.yaw = Math.random() * Math.PI * 2;
    this.pitch = 0;
    this.roll = 0;
    this.hp = 25;
    this.maxHp = 25;
    this.speed = 0;
    this.alive = true;
    this.dying = false;
    this.dyingTime = 0;
    this.justExploded = false;
    this.firing = false;
    this.justFired = false;
    this.lastShotHit = false;
    this.mode = 'artillery';
    this.variant = 'artillery';
    this.fireTimer = 1 + Math.random() * 2;
    this.mesh = buildArtillery();
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = this.yaw;
  }

  startDying() {
    this.dying = true;
    this.dyingTime = 0;
  }

  update(dt, player) {
    this.justFired = false;
    this.justExploded = false;
    if (this.dying) {
      this.dyingTime += dt;
      if (this.dyingTime > 0.3) {
        this.justExploded = true;
        this.alive = false;
        this.dying = false;
      }
      return;
    }
    // Fire at player if within range (~500m) and above ground (not behind terrain)
    const dx = player.position.x - this.position.x;
    const dy = player.position.y - this.position.y;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dy, dz);
    this.firing = dist < 500 && dy > 10; // only if player is above
    if (this.firing) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = 1.5 + Math.random() * 1.5; // slow rate
        this.justFired = true;
        // ~35% hit chance
        if (player.alive && Math.random() < 0.35) {
          player.hp -= 2.5;
          player.damageFlash = Math.min(1, (player.damageFlash || 0) + 0.4);
          this.lastShotHit = true;
        }
      }
      // Aim toward player
      this.yaw = Math.atan2(-dx, -dz);
      this.mesh.rotation.y = this.yaw;
    }
  }
}

