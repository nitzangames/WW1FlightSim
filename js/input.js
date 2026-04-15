export class Joystick {
  constructor({ radius = 200, deadZone = 0.08, releaseEase = 0.15 } = {}) {
    this.radius = radius;
    this.deadZone = deadZone;
    this.releaseEase = releaseEase;
    this.ax = 0; this.ay = 0;
    this.x = 0; this.y = 0;           // normalized output
    this.rawX = 0; this.rawY = 0;     // pre-release value
    this.active = false;
    this.releasing = false;
  }
  down(px, py) {
    this.ax = px; this.ay = py;
    this.active = true;
    this.releasing = false;
    this.x = 0; this.y = 0;
    this.rawX = 0; this.rawY = 0;
  }
  move(px, py) {
    if (!this.active) return;
    let dx = px - this.ax;
    let dy = py - this.ay;
    const mag = Math.hypot(dx, dy);
    if (mag > this.radius) {
      dx = (dx / mag) * this.radius;
      dy = (dy / mag) * this.radius;
    }
    let nx = dx / this.radius;
    let ny = dy / this.radius;
    // Circular dead zone — compare 2D magnitude, not per-axis.
    const m = Math.hypot(nx, ny);
    if (m < this.deadZone) { nx = 0; ny = 0; }
    this.rawX = nx; this.rawY = ny;
    this.x = nx; this.y = ny;
  }
  up() {
    this.active = false;
    this.releasing = true;
  }
  tick(dt) {
    if (this.releasing) {
      const k = Math.min(1, dt / this.releaseEase);
      this.x += (0 - this.x) * k;
      this.y += (0 - this.y) * k;
      if (Math.abs(this.x) < 0.01 && Math.abs(this.y) < 0.01) {
        this.x = 0; this.y = 0; this.releasing = false;
      }
    }
  }
  value() { return { x: this.x, y: this.y }; }
}
