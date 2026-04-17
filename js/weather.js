// Simple weather variation. Picks a random condition at game start and adjusts
// fog distance + tint. Wind gusts nudge the player's yaw periodically.

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.cloudMat = null;  // set from main.js after buildWorld
    this.skyMat = null;    // sky shader material (uniforms: topColor, bottomColor)
    this.windYawBias = 0;
    this.gustTimer = 3 + Math.random() * 4;
    this.gustStrength = 0;
    this.gustDecay = 0;
    this.condition = 'clear';
  }

  // Call once at game start. Picks one of: clear, hazy, overcast.
  // Tints clouds to match the fog so they don't look out of place.
  randomize() {
    const r = Math.random();
    if (r < 0.35) {
      this.condition = 'clear';
      this.scene.fog.near = 900;
      this.scene.fog.far = 2600;
      this.scene.fog.color.setHex(0xcfd8e0);
      if (this.cloudMat) this.cloudMat.color.setHex(0xffffff);
      if (this.skyMat) {
        this.skyMat.uniforms.topColor.value.setHex(0x6fa6d6);
        this.skyMat.uniforms.bottomColor.value.setHex(0xfff1c9);
      }
    } else if (r < 0.7) {
      this.condition = 'hazy';
      this.scene.fog.near = 500;
      this.scene.fog.far = 1800;
      this.scene.fog.color.setHex(0xc8c4b8);
      if (this.cloudMat) this.cloudMat.color.setHex(0xe0dcd4);
      if (this.skyMat) {
        this.skyMat.uniforms.topColor.value.setHex(0x8aaac0);
        this.skyMat.uniforms.bottomColor.value.setHex(0xd8cca8);
      }
    } else {
      this.condition = 'overcast';
      this.scene.fog.near = 300;
      this.scene.fog.far = 1200;
      this.scene.fog.color.setHex(0xa0a0a0);
      if (this.cloudMat) this.cloudMat.color.setHex(0xb8b8b8);
      if (this.skyMat) {
        this.skyMat.uniforms.topColor.value.setHex(0x7a8a98);
        this.skyMat.uniforms.bottomColor.value.setHex(0xb0aaa0);
      }
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
