import { SPAWN } from './config.js';
import { Enemy } from './enemy.js';

export function targetCount(kills) {
  return Math.min(
    SPAWN.CAP_COUNT,
    SPAWN.START_COUNT + Math.floor(kills / SPAWN.KILLS_PER_RAMP)
  );
}

export class Spawner {
  constructor(scene) {
    this.scene = scene;
  }

  maybeSpawn(enemies, player, kills) {
    const goal = targetCount(kills);
    while (enemies.length < goal) {
      const bearing = Math.random() * Math.PI * 2;
      const dist = SPAWN.SPAWN_MIN_DIST + Math.random() * (SPAWN.SPAWN_MAX_DIST - SPAWN.SPAWN_MIN_DIST);
      const alt = (Math.random() * 2 - 1) * SPAWN.SPAWN_ALT_JITTER;
      const x = player.position.x + Math.sin(bearing) * dist;
      const z = player.position.z + Math.cos(bearing) * dist;
      const y = player.position.y + alt;
      const mode = Math.random() < 0.6 ? 'chaser' : 'jouster';
      const e = new Enemy({ x, y, z, mode });
      e.yaw = bearing + Math.PI;
      enemies.push(e);
      this.scene.add(e.mesh);
    }
  }

  removeDead(enemies) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (!enemies[i].alive) {
        this.scene.remove(enemies[i].mesh);
        enemies.splice(i, 1);
      }
    }
  }
}
