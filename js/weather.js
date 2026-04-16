// Simple weather variation. Picks a random condition at game start and adjusts
// fog distance + tint. Wind gusts nudge the player's yaw periodically.

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.windYawBias = 0;
    this.gustTimer = 3 + Math.random() * 4;
    this.gustStrength = 0;
    this.gustDecay = 0;
    this.condition = 'clear'; // set by randomize()
  }

  // Call once at game start. Picks one of: clear, hazy, overcast.
  randomize() {
    const r = Math.random();
    if (r < 0.35) {
      this.condition = 'clear';
      this.scene.fog.near = 900;
      this.scene.fog.far = 2600;
    } else if (r < 0.7) {
      this.condition = 'hazy';
      this.scene.fog.near = 500;
      this.scene.fog.far = 1800;
      this.scene.fog.color.setHex(0xc8c4b8);
    } else {
      this.condition = 'overcast';
      this.scene.fog.near = 300;
      this.scene.fog.far = 1200;
      this.scene.fog.color.setHex(0xa0a0a0);
    }
  }

  // Call each frame while playing. Returns a yaw nudge to apply to the plane.
  update(dt) {
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      this.gustTimer = 3 + Math.random() * 5;
      this.gustStrength = (Math.random() - 0.5) * 0.15; // radians per second
      this.gustDecay = 1.0 + Math.random() * 1.5;
    }
    this.gustDecay -= dt;
    const gust = this.gustDecay > 0 ? this.gustStrength : 0;
    return gust * dt;
  }
}
