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
    // Placeholder AI: fly straight in current heading. Real AI in Task 11.
    const fx = -Math.sin(this.yaw) * Math.cos(this.pitch);
    const fy = Math.sin(this.pitch);
    const fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    this.position.x += fx * this.speed * dt;
    this.position.y += fy * this.speed * dt;
    this.position.z += fz * this.speed * dt;
    this.forward.x = fx;
    this.forward.y = fy;
    this.forward.z = fz;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw;
    this.mesh.rotation.x = this.pitch;
    this.mesh.rotation.z = -this.roll;
  }
}
