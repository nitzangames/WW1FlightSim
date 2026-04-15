import { PLAYER, WORLD } from './config.js';

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
    this.alive = true;
    this.damageFlash = 0;
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
