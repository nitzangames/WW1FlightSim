import { PLAYER, WORLD } from './config.js';
import { terrainHeight } from './world.js';

export class Plane {
  constructor({ speed = PLAYER.SPEED, pitchRateMax = PLAYER.PITCH_RATE_MAX,
                rollMax = PLAYER.ROLL_ANGLE_MAX, turnGain = PLAYER.TURN_GAIN,
                smooth = PLAYER.SMOOTH } = {}) {
    this.speed = speed;
    this.pitchRateMax = pitchRateMax;
    this.rollMax = rollMax;
    this.turnGain = turnGain;
    this.smooth = smooth;

    this.position = { x: 0, y: 0, z: 0 };
    this.forward = { x: 0, y: 0, z: -1 };
    this.pitch = 0;   // +up
    this.roll = 0;    // +right bank
    this.yaw = 0;     // +left turn (right-hand rule)

    this._targetPitchRate = 0;
    this._targetRoll = 0;

    this.hp = PLAYER.HP;
    this.maxHp = PLAYER.HP;
    this.alive = true;
    this.damageFlash = 0;
    // Death spiral state (mirrors Enemy behavior).
    this.dying = false;
    this.dyingTime = 0;
    this.justCrashed = false; // one-frame pulse on ground impact
  }

  startDying() {
    this.dying = true;
    this.dyingTime = 0;
    this.alive = false;
    // Preserve forward momentum at the moment of death so the plane arcs
    // ballistically rather than losing all horizontal speed.
    this.fallVx = this.forward.x * this.speed;
    this.fallVy = this.forward.y * this.speed;
    this.fallVz = this.forward.z * this.speed;
  }

  updateDying(dt) {
    this.dyingTime += dt;
    this.justCrashed = false;
    // Visual-only spin.
    this.yaw += 2.3 * dt;
    this.pitch = Math.max(-1.15, this.pitch - 0.9 * dt);
    this.roll += 3.0 * dt;
    if (this.roll > Math.PI) this.roll -= Math.PI * 2;

    // Ballistic fall: gravity + a little horizontal drag.
    this.fallVy -= 48 * dt;
    const drag = Math.exp(-0.3 * dt);
    this.fallVx *= drag;
    this.fallVz *= drag;
    this.position.x += this.fallVx * dt;
    this.position.y += this.fallVy * dt;
    this.position.z += this.fallVz * dt;

    const vmag = Math.hypot(this.fallVx, this.fallVy, this.fallVz) || 1;
    this.forward.x = this.fallVx / vmag;
    this.forward.y = this.fallVy / vmag;
    this.forward.z = this.fallVz / vmag;

    const groundY = WORLD.GROUND_Y + terrainHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY + 2) {
      this.position.y = groundY;
      this.justCrashed = true;
      this.dying = false;
    }
    this.damageFlash = Math.max(this.damageFlash, 0.2);
  }

  update(dt, joystick) {
    // Joystick: y negative = pull up (drag down = up-inverted)
    this._targetPitchRate = -joystick.y * this.pitchRateMax;
    this._targetRoll = joystick.x * this.rollMax;

    // Smooth pitch rate + roll
    this.pitch += this._targetPitchRate * dt;
    this.roll += (this._targetRoll - this.roll) * this.smooth * (dt * 60);

    // Bank-to-turn yaw
    const yawRate = -Math.sin(this.roll) * this.turnGain; // right bank → yaw right (negative)
    this.yaw += yawRate * dt;

    // Drift-out recovery: gentle yaw toward origin when past soft radius
    const distXZ = Math.hypot(this.position.x, this.position.z);
    if (distXZ > WORLD.RETURN_SOFT) {
      const angleToOrigin = Math.atan2(-this.position.x, -this.position.z);
      let delta = angleToOrigin - this.yaw;
      // Wrap to [-PI, PI]
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      const pull = distXZ > WORLD.RETURN_HARD ? (15 * Math.PI / 180) : (5 * Math.PI / 180);
      this.yaw += Math.sign(delta) * Math.min(Math.abs(delta), pull * dt);
    }

    // Forward vector in world space: yaw first, then pitch. Start forward = (0,0,-1).
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const fx = -sy * cp;
    const fy = sp;
    const fz = -cy * cp;

    this.position.x += fx * this.speed * dt;
    this.position.y += fy * this.speed * dt;
    this.position.z += fz * this.speed * dt;

    this.forward.x = fx;
    this.forward.y = fy;
    this.forward.z = fz;

    // Faster decay so each hit feels like a sharp pulse rather than a slow glow.
    this.damageFlash = Math.max(0, this.damageFlash - dt * 5);
  }
}
