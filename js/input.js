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

// Tracks digital key state and presents it as a normalized {x, y} stick value.
// Up/W → y=-1 (visual up); Down/S → y=+1; Left/A → x=-1; Right/D → x=+1.
// Treated as a peer of Joystick so the same invertY / sensitivity settings apply.
export class Keyboard {
  constructor() {
    this.keys = new Set();
    this._onDown = (e) => {
      const k = this._normalize(e);
      if (!k) return;
      this.keys.add(k);
      // Stop arrow keys from scrolling the page during play.
      e.preventDefault();
    };
    this._onUp = (e) => {
      const k = this._normalize(e);
      if (!k) return;
      this.keys.delete(k);
      e.preventDefault();
    };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
    window.addEventListener('blur', () => this.keys.clear());
  }
  _normalize(e) {
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': return 'up';
      case 'ArrowDown': case 'KeyS': return 'down';
      case 'ArrowLeft': case 'KeyA': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
    }
    return null;
  }
  get active() {
    return this.keys.size > 0;
  }
  value() {
    let x = 0, y = 0;
    if (this.keys.has('left')) x -= 1;
    if (this.keys.has('right')) x += 1;
    if (this.keys.has('up')) y -= 1;
    if (this.keys.has('down')) y += 1;
    return { x, y };
  }
}
