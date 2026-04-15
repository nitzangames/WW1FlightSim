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
    // Only fighter planes count toward the cap — balloons/zeppelins are
    // persistent bonus targets that shouldn't starve the wave spawner.
    const planeCount = () => enemies.reduce(
      (n, e) => n + ((e.type === 'plane' || !e.type) && e.alive && !e.dying ? 1 : 0), 0);
    while (planeCount() < goal) {
      // Place the enemy on the far side of the playable map.
      // Direction from origin to player (bearing where the player currently is).
      let playerBearing;
      const pr = Math.hypot(player.position.x, player.position.z);
      if (pr < 1) {
        // Player at center — pick a random bearing; enemy goes anywhere on the rim.
        playerBearing = Math.random() * Math.PI * 2;
      } else {
        playerBearing = Math.atan2(player.position.x, player.position.z);
      }
      // Spawn bearing is opposite to the player, with random spread.
      const spread = (Math.random() * 2 - 1) * SPAWN.SPAWN_BEARING_SPREAD;
      const bearing = playerBearing + Math.PI + spread;
      const dist = SPAWN.SPAWN_EDGE_MIN + Math.random() * (SPAWN.SPAWN_EDGE_MAX - SPAWN.SPAWN_EDGE_MIN);
      const alt = (Math.random() * 2 - 1) * SPAWN.SPAWN_ALT_JITTER;
      const x = Math.sin(bearing) * dist;
      const z = Math.cos(bearing) * dist;
      const y = player.position.y + alt;
      const mode = Math.random() < 0.6 ? 'chaser' : 'jouster';
      // Variant ramp: default khaki always; olive 'b' unlocks at 5 kills; gold
      // 'ace' is a rare (1-in-6) treat after 10 kills.
      let variant = 'a';
      const r = Math.random();
      if (kills >= 10 && r < 0.17) variant = 'ace';
      else if (kills >= 5 && r < 0.45) variant = 'b';
      const e = new Enemy({ x, y, z, mode, variant });
      // Yaw so the enemy is facing toward the player at spawn.
      const dx = player.position.x - x;
      const dz = player.position.z - z;
      e.yaw = Math.atan2(-dx, -dz);
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
