# WW1 Flight Sim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-touch 3D WW1 dogfighting game for play.nitzan.games — endless-survival Fokker Dr.I vs. Allied biplanes, pilot-seat view, bank-to-turn controls, auto-fire on lock cone.

**Architecture:** Three.js r128 (CDN) for the 3D scene; a second 2D `<canvas>` overlay at 1080×1920 for HUD / minimap / menus. All JS is ES modules under `js/`. Pure-math modules (`input`, `plane`, `weapons`, `enemy-spawner`, `minimap`) have `node --test` unit tests; rendering is verified visually with Puppeteer screenshots. No bundler, no npm deps at runtime.

**Tech Stack:** HTML5 Canvas, Three.js r128 (CDN), Web Audio API, PlaySDK, ES modules, Node's built-in `node:test` for unit tests, Puppeteer for screenshot verification.

**Spec:** `docs/superpowers/specs/2026-04-14-ww1-flight-sim-design.md`

**Reference resolution:** 1080×1920 portrait. No DPR scaling on canvas backing store. Flexbox-centered canvas (no transforms). `touch-action: none` on canvas.

---

## Conventions

- **ES modules** throughout. Each module `export`s its API. `index.html` loads `main.js` with `<script type="module" src="js/main.js">`. Three.js stays as a global (loaded via `<script src="...three.min.js">` before the module script).
- **File paths** are absolute from the project root (`WW1FlightSim/`).
- **Testing:** pure-math modules have a sibling `*.test.mjs` file under `tests/`. Run all tests with `node --test tests/`. Each test prints expected/actual via `node:assert`.
- **Commits:** conventional-style `feat:` / `test:` / `docs:` / `chore:` prefixes. Commit after every task.
- **VERSION:** bumped in `js/config.js` on every commit. Start at `v0.0.1`; first task ships `v0.0.1`, each subsequent task ships the next patch.

---

## File Structure (target)

```
index.html
meta.json
thumbnail.png                 (produced in Task 22)
.zipignore
.gitignore
css/
  ui.css
js/
  main.js                     game bootstrap + main loop
  config.js                   VERSION + tunables (HP, damage, speeds, spawn)
  input.js                    virtual joystick math (pure)
  plane.js                    player physics (pitch/roll/yaw)
  enemy.js                    enemy state + per-enemy AI tick
  enemy-spawner.js            spawn bearings + difficulty ramp (pure)
  weapons.js                  lock-cone hit test + aim lead (pure)
  world.js                    skybox + ground + clouds
  models.js                   Fokker Dr.I + Allied biplane meshes
  renderer.js                 three.js scene/camera/renderer wiring
  hud.js                      2D overlay: crosshair, health, score, vignette
  minimap.js                  circular radar draw + math (partly pure)
  audio.js                    procedural SFX (engine, gun, hit, kill)
  game.js                     state machine (menu / playing / gameover)
tests/
  input.test.mjs
  plane.test.mjs
  weapons.test.mjs
  enemy-spawner.test.mjs
  minimap.test.mjs
docs/
  superpowers/
    specs/2026-04-14-ww1-flight-sim-design.md
    plans/2026-04-14-ww1-flight-sim.md   (this file)
```

---

## Task 1: Project scaffold (HTML, CSS, config, meta, ignores)

**Files:**
- Create: `index.html`
- Create: `css/ui.css`
- Create: `js/config.js`
- Create: `js/main.js`
- Create: `meta.json`
- Create: `.zipignore`
- Create: `.gitignore`

- [ ] **Step 1: Write `.gitignore`**

```
.DS_Store
node_modules/
error.log
/tmp/
screenshot*.png
ss-*.png
```

- [ ] **Step 2: Write `.zipignore`**

```
.git/*
.superpowers/*
docs/*
tests/*
node_modules/*
error.log
screenshot*.png
ss-*.png
.zipignore
.gitignore
CLAUDE.md
```

- [ ] **Step 3: Write `meta.json`**

```json
{
  "slug": "ww1-flight-sim",
  "title": "WW1 Flight Sim",
  "description": "One-touch WW1 dogfight. Pilot the Red Baron's triplane, auto-fire when an enemy is in your sights.",
  "tags": ["action", "3d", "dogfight", "arcade"],
  "author": "Nitzan Wilnai",
  "thumbnail": "thumbnail.png"
}
```

- [ ] **Step 4: Write `css/ui.css`**

```css
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  user-select: none;
  -webkit-user-select: none;
}

#game-canvas, #overlay-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

#overlay-canvas {
  position: absolute;
  pointer-events: none;
}

#game-canvas {
  background: #87a8c0;
}
```

- [ ] **Step 5: Write `js/config.js`**

```js
export const VERSION = 'v0.0.1';

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

export const PLAYER = {
  HP: 100,
  SPEED: 80,             // m/s forward
  PITCH_RATE_MAX: 1.4,   // rad/s at full joystick
  ROLL_ANGLE_MAX: Math.PI / 3,   // 60 deg
  TURN_GAIN: 1.2,        // yaw rate = sin(roll) * gain
  SMOOTH: 0.1,
};

export const ENEMY = {
  HP: 60,
  SPEED: 75,
  TURN_CAP: Math.PI * 40 / 180,  // 40 deg/s for chaser
  FIRE_CONE_DEG: 12,
  FIRE_RANGE: 350,
  DPS: 10,
};

export const GUN = {
  RPM: 600,
  DAMAGE_PER_ROUND: 2,
  CONE_DEG: 15,
  RANGE: 400,
};

export const WORLD = {
  GROUND_Y: -200,
  GROUND_SIZE: 6000,
  FOG_NEAR: 800,
  FOG_FAR: 2400,
  RETURN_SOFT: 1800,
  RETURN_HARD: 2400,
};

export const SPAWN = {
  START_COUNT: 2,
  CAP_COUNT: 4,
  KILLS_PER_RAMP: 5,
  SPAWN_MIN_DIST: 900,
  SPAWN_MAX_DIST: 1400,
  SPAWN_ALT_JITTER: 100,
};
```

- [ ] **Step 6: Write `js/main.js`** (minimal shell; expands in later tasks)

```js
import { VERSION, CANVAS_W, CANVAS_H } from './config.js';

const gameCanvas = document.getElementById('game-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
gameCanvas.width = CANVAS_W;
gameCanvas.height = CANVAS_H;
overlayCanvas.width = CANVAS_W;
overlayCanvas.height = CANVAS_H;

const octx = overlayCanvas.getContext('2d');

function drawBoot() {
  octx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  octx.fillStyle = '#fff';
  octx.font = '36px sans-serif';
  octx.textAlign = 'center';
  octx.fillText('WW1 FLIGHT SIM ' + VERSION, CANVAS_W / 2, CANVAS_H / 2);
}

drawBoot();
console.log('WW1 Flight Sim boot', VERSION);
```

- [ ] **Step 7: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>WW1 Flight Sim</title>
  <link rel="stylesheet" href="css/ui.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn-play.nitzan.games/lib/play-sdk.js"></script>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <canvas id="overlay-canvas"></canvas>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 8: Verify boot locally**

Run: `python3 -m http.server 8765` (from project root), open `http://localhost:8765` in a browser.
Expected: dark background with centered white text "WW1 FLIGHT SIM v0.0.1". No console errors.

- [ ] **Step 9: Commit**

```bash
git add index.html css/ui.css js/config.js js/main.js meta.json .zipignore .gitignore
git commit -m "feat: scaffold project with config, canvases, and boot screen"
```

---

## Task 2: Three.js renderer, camera, sky, ground

**Files:**
- Create: `js/renderer.js`
- Create: `js/world.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/world.js`** (skybox + ground)

```js
import { WORLD } from './config.js';

export function buildWorld(scene) {
  // Gradient skybox (inside-out large sphere with vertex-color gradient)
  const skyGeo = new THREE.SphereGeometry(5000, 16, 12);
  skyGeo.scale(-1, 1, 1); // inside out
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x6fa6d6) },
      bottomColor: { value: new THREE.Color(0xfff1c9) },
    },
    vertexShader: `
      varying float vY;
      void main() {
        vY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying float vY;
      void main() {
        float t = clamp((vY + 0.2) / 1.0, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Ground plane with checker-ish quilt color (flat lambert)
  const groundGeo = new THREE.PlaneGeometry(WORLD.GROUND_SIZE, WORLD.GROUND_SIZE, 40, 40);
  // Random-ish green/brown per face via vertex colors
  const colors = [];
  for (let i = 0; i < groundGeo.attributes.position.count; i++) {
    const g = 0.35 + Math.random() * 0.25;
    const r = 0.25 + Math.random() * 0.2;
    colors.push(r, g, 0.2);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = WORLD.GROUND_Y;
  scene.add(ground);

  return { ground };
}
```

- [ ] **Step 2: Write `js/renderer.js`**

```js
import { CANVAS_W, CANVAS_H, WORLD } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(CANVAS_W, CANVAS_H, false);
  renderer.setClearColor(0x6fa6d6);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfd8e0, WORLD.FOG_NEAR, WORLD.FOG_FAR);

  const camera = new THREE.PerspectiveCamera(75, CANVAS_W / CANVAS_H, 0.5, 5000);
  camera.position.set(0, 0, 0);

  const sun = new THREE.DirectionalLight(0xfff0d0, 1.0);
  sun.position.set(200, 400, 100);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x556677, 0.6));

  return { renderer, scene, camera };
}
```

- [ ] **Step 3: Modify `js/main.js`** to render the world

Replace the file contents with:

```js
import { VERSION, CANVAS_W, CANVAS_H } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';

const gameCanvas = document.getElementById('game-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
gameCanvas.width = CANVAS_W;
gameCanvas.height = CANVAS_H;
overlayCanvas.width = CANVAS_W;
overlayCanvas.height = CANVAS_H;

const { renderer, scene, camera } = createRenderer(gameCanvas);
buildWorld(scene);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -100);

const octx = overlayCanvas.getContext('2d');

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  renderer.render(scene, camera);

  octx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  octx.fillStyle = '#fff';
  octx.font = '20px sans-serif';
  octx.textAlign = 'left';
  octx.fillText(VERSION, 16, 32);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('WW1 Flight Sim running', VERSION);
```

- [ ] **Step 4: Bump VERSION to `v0.0.2`** in `js/config.js`.

- [ ] **Step 5: Verify in browser**

Run: `python3 -m http.server 8765`, open `http://localhost:8765`.
Expected: pale-blue sky above, green-brown ground below, no console errors. Version `v0.0.2` visible top-left.

- [ ] **Step 6: Commit**

```bash
git add js/renderer.js js/world.js js/main.js js/config.js
git commit -m "feat: three.js renderer with gradient sky and ground plane"
```

---

## Task 3: Virtual joystick input (TDD)

**Files:**
- Create: `js/input.js`
- Create: `tests/input.test.mjs`

- [ ] **Step 1: Write `tests/input.test.mjs` (failing)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Joystick } from '../js/input.js';

test('joystick is zero when idle', () => {
  const j = new Joystick();
  assert.deepEqual(j.value(), { x: 0, y: 0 });
});

test('joystick outputs normalized vector within radius', () => {
  const j = new Joystick({ radius: 200, deadZone: 0.08 });
  j.down(500, 500);
  j.move(600, 500); // +100 x, 0 y → jx = 0.5
  const v = j.value();
  assert.equal(Math.round(v.x * 100), 50);
  assert.equal(v.y, 0);
});

test('joystick clamps to radius', () => {
  const j = new Joystick({ radius: 200, deadZone: 0 });
  j.down(0, 0);
  j.move(1000, 0); // way past radius
  const v = j.value();
  assert.equal(v.x, 1);
});

test('dead zone zeros small inputs', () => {
  const j = new Joystick({ radius: 200, deadZone: 0.08 });
  j.down(0, 0);
  j.move(10, 0); // 0.05 normalized → under dead zone
  assert.deepEqual(j.value(), { x: 0, y: 0 });
});

test('release eases toward zero', () => {
  const j = new Joystick({ radius: 200, deadZone: 0, releaseEase: 0.5 });
  j.down(0, 0);
  j.move(200, 0); // x = 1
  j.up();
  j.tick(1); // one tick
  assert.ok(j.value().x < 1);
  assert.ok(j.value().x > 0);
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `node --test tests/input.test.mjs`
Expected: FAIL, "Cannot find module" or equivalent.

- [ ] **Step 3: Write `js/input.js`**

```js
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
```

- [ ] **Step 4: Re-run tests**

Run: `node --test tests/input.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Wire pointer events in `js/main.js`**

Add after the `const octx = ...` line:

```js
import { Joystick } from './input.js';
const joystick = new Joystick();

function screenToCanvas(clientX, clientY) {
  const rect = overlayCanvas.getBoundingClientRect();
  const sx = CANVAS_W / rect.width;
  const sy = CANVAS_H / rect.height;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

overlayCanvas.style.pointerEvents = 'auto';
overlayCanvas.addEventListener('pointerdown', (e) => {
  const p = screenToCanvas(e.clientX, e.clientY);
  joystick.down(p.x, p.y);
});
overlayCanvas.addEventListener('pointermove', (e) => {
  const p = screenToCanvas(e.clientX, e.clientY);
  joystick.move(p.x, p.y);
});
overlayCanvas.addEventListener('pointerup', () => joystick.up());
overlayCanvas.addEventListener('pointercancel', () => joystick.up());
```

(Keep the import at the top with the others, move `overlayCanvas.style.pointerEvents` there as appropriate.)

In the loop, before render, add:

```js
joystick.tick(dt);
```

- [ ] **Step 6: Bump VERSION to `v0.0.3`** in `js/config.js`.

- [ ] **Step 7: Commit**

```bash
git add js/input.js tests/input.test.mjs js/main.js js/config.js
git commit -m "feat: virtual joystick with dead zone and release ease (tests)"
```

---

## Task 4: Player plane physics (TDD)

**Files:**
- Create: `js/plane.js`
- Create: `tests/plane.test.mjs`

- [ ] **Step 1: Write `tests/plane.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Plane } from '../js/plane.js';

test('plane integrates forward velocity along its heading', () => {
  const p = new Plane({ speed: 80 });
  p.update(1, { x: 0, y: 0 });
  // heading is +X start? We'll define: initial forward = -Z
  assert.equal(Math.round(p.position.z), -80);
});

test('joystick y drives pitch rate', () => {
  const p = new Plane();
  for (let i = 0; i < 60; i++) p.update(1 / 60, { x: 0, y: -1 });
  assert.ok(p.pitch > 0.5, `expected pitch > 0.5, got ${p.pitch}`);
});

test('joystick x drives roll toward max', () => {
  const p = new Plane();
  for (let i = 0; i < 120; i++) p.update(1 / 60, { x: 1, y: 0 });
  assert.ok(p.roll > Math.PI / 4, `expected roll > 45deg, got ${p.roll}`);
});

test('bank induces yaw', () => {
  const p = new Plane();
  for (let i = 0; i < 60; i++) p.update(1 / 60, { x: 1, y: 0 }); // roll right
  const yawBefore = p.yaw;
  for (let i = 0; i < 60; i++) p.update(1 / 60, { x: 1, y: 0 });
  assert.ok(p.yaw < yawBefore, `yaw should decrease (turn right): before ${yawBefore} after ${p.yaw}`);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `node --test tests/plane.test.mjs`
Expected: FAIL (module missing).

- [ ] **Step 3: Write `js/plane.js`**

```js
import { PLAYER } from './config.js';

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
    this.pitch = 0;   // +up
    this.roll = 0;    // +right bank
    this.yaw = 0;     // +left turn (right-hand rule)

    this._targetPitchRate = 0;
    this._targetRoll = 0;
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

    // Forward vector in world space: yaw first, then pitch. Start forward = (0,0,-1).
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const fx = -sy * cp;
    const fy = sp;
    const fz = -cy * cp;

    this.position.x += fx * this.speed * dt;
    this.position.y += fy * this.speed * dt;
    this.position.z += fz * this.speed * dt;

    this.forward = { x: fx, y: fy, z: fz };
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `node --test tests/plane.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Bump VERSION to `v0.0.4`**.

- [ ] **Step 6: Commit**

```bash
git add js/plane.js tests/plane.test.mjs js/config.js
git commit -m "feat: player plane physics with bank-to-turn (tests)"
```

---

## Task 5: Build Fokker Dr.I mesh + attach camera to plane

**Files:**
- Create: `js/models.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/models.js`** (player plane only for now)

```js
export function buildFokker() {
  const group = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xb01a1a });
  const black = new THREE.MeshLambertMaterial({ color: 0x202020 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a2a });

  // Fuselage (long box)
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 4.5), red);
  fuselage.position.z = -0.3;
  group.add(fuselage);

  // Cockpit opening (darker)
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), black);
  cockpit.position.set(0, 0.5, 0.3);
  group.add(cockpit);

  // Three stacked wings (triplane): top, middle, bottom
  const wingGeo = new THREE.BoxGeometry(6.0, 0.15, 1.1);
  const wTop = new THREE.Mesh(wingGeo, red); wTop.position.set(0, 1.1, -0.2); group.add(wTop);
  const wMid = new THREE.Mesh(wingGeo, red); wMid.position.set(0, 0.2, -0.4); group.add(wMid);
  const wBot = new THREE.Mesh(wingGeo, red); wBot.position.set(0, -0.7, -0.4); group.add(wBot);

  // Vertical struts
  for (const x of [-2.5, 2.5]) {
    const strutTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), wood);
    strutTop.position.set(x, 0.65, -0.3); group.add(strutTop);
    const strutBot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), wood);
    strutBot.position.set(x, -0.25, -0.4); group.add(strutBot);
  }

  // Tail
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.8), red);
  tailV.position.set(0, 0.4, -2.4); group.add(tailV);
  const tailH = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.7), red);
  tailH.position.set(0, 0.1, -2.4); group.add(tailH);

  // Propeller hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8), black);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 0, 2.0);
  group.add(hub);

  // Default orientation: facing -Z already, nothing to rotate.
  return group;
}
```

- [ ] **Step 2: Modify `js/main.js`** — integrate plane + camera

Replace the loop and setup sections:

```js
import { VERSION, CANVAS_W, CANVAS_H, WORLD } from './config.js';
import { createRenderer } from './renderer.js';
import { buildWorld } from './world.js';
import { Joystick } from './input.js';
import { Plane } from './plane.js';
import { buildFokker } from './models.js';

const gameCanvas = document.getElementById('game-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
gameCanvas.width = CANVAS_W;
gameCanvas.height = CANVAS_H;
overlayCanvas.width = CANVAS_W;
overlayCanvas.height = CANVAS_H;

const { renderer, scene, camera } = createRenderer(gameCanvas);
buildWorld(scene);

// Player plane and its mesh
const plane = new Plane();
plane.position.y = 200;
const planeMesh = buildFokker();
planeMesh.visible = false; // hidden from cockpit — we're inside it
scene.add(planeMesh);

// Joystick + input
const joystick = new Joystick();
const octx = overlayCanvas.getContext('2d');
overlayCanvas.style.pointerEvents = 'auto';
function screenToCanvas(clientX, clientY) {
  const rect = overlayCanvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (CANVAS_W / rect.width),
    y: (clientY - rect.top) * (CANVAS_H / rect.height),
  };
}
overlayCanvas.addEventListener('pointerdown', (e) => {
  const p = screenToCanvas(e.clientX, e.clientY);
  joystick.down(p.x, p.y);
});
overlayCanvas.addEventListener('pointermove', (e) => {
  const p = screenToCanvas(e.clientX, e.clientY);
  joystick.move(p.x, p.y);
});
overlayCanvas.addEventListener('pointerup', () => joystick.up());
overlayCanvas.addEventListener('pointercancel', () => joystick.up());

// Apply plane orientation to camera
function syncCameraToPlane() {
  camera.position.set(plane.position.x, plane.position.y, plane.position.z);
  // Build quaternion from yaw, pitch, roll (YXZ order)
  camera.rotation.order = 'YXZ';
  camera.rotation.y = plane.yaw;
  camera.rotation.x = plane.pitch;
  camera.rotation.z = -plane.roll;
}

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  joystick.tick(dt);
  plane.update(dt, joystick.value());
  syncCameraToPlane();

  renderer.render(scene, camera);

  octx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  octx.fillStyle = '#fff';
  octx.font = '20px sans-serif';
  octx.textAlign = 'left';
  octx.fillText(VERSION, 16, 32);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

- [ ] **Step 3: Bump VERSION to `v0.0.5`**.

- [ ] **Step 4: Manual playtest**

Start local server, load the game in a browser. Drag:
- Left/right: horizon should bank + plane turns.
- Up: nose should point down (drag up = nose down per inverted stick).
- Down: nose should pull up.

Expected: smooth flight, horizon tilts with bank, ground scrolls underneath.

- [ ] **Step 5: Commit**

```bash
git add js/models.js js/main.js js/config.js
git commit -m "feat: Fokker Dr.I mesh and camera locked to plane frame"
```

---

## Task 6: Minimal cockpit frame (gun barrels + top-wing sliver)

**Files:**
- Modify: `js/models.js`
- Modify: `js/main.js`

- [ ] **Step 1: Add `buildCockpit()` to `js/models.js`**

```js
export function buildCockpit() {
  const group = new THREE.Group();
  const steel = new THREE.MeshLambertMaterial({ color: 0x2a2e36 });
  const red = new THREE.MeshLambertMaterial({ color: 0xb01a1a });
  const black = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Twin gun barrels at bottom-center, extending forward
  for (const x of [-0.15, 0.15]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(x, -0.18, -0.9);
    group.add(barrel);
  }

  // Top-wing sliver: red plank at top-forward
  const topWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.6), red);
  topWing.position.set(0, 0.3, -0.9);
  group.add(topWing);

  // Black iron cross on top wing (small flat box)
  const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.061, 0.08), black);
  cross1.position.set(0, 0.31, -0.9);
  group.add(cross1);
  const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.061, 0.3), black);
  cross2.position.set(0, 0.31, -0.9);
  group.add(cross2);

  return group;
}
```

- [ ] **Step 2: Attach cockpit to camera in `js/main.js`**

After `const { renderer, scene, camera } = createRenderer(...)`, add:

```js
import { buildFokker, buildCockpit } from './models.js';
// ...
const cockpit = buildCockpit();
camera.add(cockpit);
scene.add(camera);
```

(Replace the existing `buildFokker` import with the combined one. Also note: in Three.js, a camera only auto-includes descendants when it's part of the scene graph, so `scene.add(camera)` is required.)

- [ ] **Step 3: Bump VERSION to `v0.0.6`**.

- [ ] **Step 4: Manual playtest**

Expected: gun barrels visible at bottom of screen, red wing sliver with black cross at top. They stay put relative to the view when the plane banks (they're attached to camera).

- [ ] **Step 5: Commit**

```bash
git add js/models.js js/main.js js/config.js
git commit -m "feat: minimal cockpit frame (twin guns + top wing sliver)"
```

---

## Task 7: Drift-out recovery (keep player in play zone)

**Files:**
- Modify: `js/plane.js`
- Modify: `tests/plane.test.mjs`

- [ ] **Step 1: Add test for recovery to `tests/plane.test.mjs`**

```js
test('drift recovery applies yaw bias when beyond soft radius', () => {
  const p = new Plane();
  p.position.x = 2000; p.position.z = 0; // past soft radius 1800
  const yawBefore = p.yaw;
  p.update(1, { x: 0, y: 0 });
  assert.notEqual(p.yaw, yawBefore, 'yaw should change from recovery bias');
});

test('no recovery bias inside safe radius', () => {
  const p = new Plane();
  p.position.x = 100;
  const yawBefore = p.yaw;
  p.update(1, { x: 0, y: 0 });
  assert.equal(p.yaw, yawBefore);
});
```

- [ ] **Step 2: Run — expect one fail**

Run: `node --test tests/plane.test.mjs`
Expected: the new "drift recovery" test fails.

- [ ] **Step 3: Modify `js/plane.js`** — add recovery at end of `update()` before forward integration

At the top, `import { PLAYER, WORLD } from './config.js';`. Then inside `update(dt, joystick)`, between the yaw integration and the position update:

```js
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
```

- [ ] **Step 4: Re-run tests**

Run: `node --test tests/plane.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Bump VERSION to `v0.0.7`**.

- [ ] **Step 6: Commit**

```bash
git add js/plane.js tests/plane.test.mjs js/config.js
git commit -m "feat: drift-out recovery keeps player in battle zone (tests)"
```

---

## Task 8: HUD baseline (crosshair, version, joystick visual)

**Files:**
- Create: `js/hud.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/hud.js`**

```js
import { CANVAS_W, CANVAS_H, VERSION } from './config.js';

export function drawHud(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Crosshair (center)
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
  ctx.strokeStyle = state.locked ? '#ffd65a' : '#ffffffaa';
  ctx.lineWidth = state.locked ? 4 : 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy); ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy + 16);
  ctx.stroke();

  // Joystick visual
  if (state.joystick && state.joystick.active) {
    const { ax, ay, x, y, radius } = state.joystick;
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ax, ay, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath();
    ctx.arc(ax + x * radius, ay + y * radius, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Version bottom-center
  ctx.fillStyle = '#ffffff88';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(VERSION, CANVAS_W / 2, CANVAS_H - 16);
}
```

- [ ] **Step 2: Modify `js/main.js`** — replace the octx drawing

```js
import { drawHud } from './hud.js';
// ...
// In the loop, after renderer.render:
drawHud(octx, {
  locked: false,
  joystick: {
    active: joystick.active,
    ax: joystick.ax,
    ay: joystick.ay,
    x: joystick.x,
    y: joystick.y,
    radius: joystick.radius,
  },
});
```

Remove the old inline octx drawing code.

- [ ] **Step 3: Bump VERSION to `v0.0.8`**.

- [ ] **Step 4: Manual playtest** — touch-drag should show joystick ring + inner dot; crosshair stays in center.

- [ ] **Step 5: Commit**

```bash
git add js/hud.js js/main.js js/config.js
git commit -m "feat: HUD with crosshair, joystick viz, and version"
```

---

## Task 9: Enemy biplane mesh + single stationary enemy

**Files:**
- Modify: `js/models.js`
- Create: `js/enemy.js`
- Modify: `js/main.js`

- [ ] **Step 1: Add `buildBiplane()` to `js/models.js`**

```js
export function buildBiplane() {
  const group = new THREE.Group();
  const khaki = new THREE.MeshLambertMaterial({ color: 0x8b824a });
  const brown = new THREE.MeshLambertMaterial({ color: 0x5b4a2a });
  const black = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const roundel = new THREE.MeshLambertMaterial({ color: 0x2a3c8a });

  // Fuselage
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 4.2), khaki);
  group.add(fuselage);

  // Cockpit
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.75), black);
  cockpit.position.set(0, 0.4, 0.3);
  group.add(cockpit);

  // Two wings: upper and lower
  const wingGeo = new THREE.BoxGeometry(5.5, 0.12, 1.0);
  const wTop = new THREE.Mesh(wingGeo, khaki); wTop.position.set(0, 0.9, -0.2); group.add(wTop);
  const wBot = new THREE.Mesh(wingGeo, khaki); wBot.position.set(0, -0.55, -0.3); group.add(wBot);

  // Roundel discs on upper wing
  for (const x of [-1.5, 1.5]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), roundel);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, 0.97, -0.2);
    group.add(disc);
  }

  // Struts
  for (const x of [-2.2, 2.2]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.07), brown);
    strut.position.set(x, 0.2, -0.25);
    group.add(strut);
  }

  // Tail
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.8, 0.7), khaki);
  tailV.position.set(0, 0.35, -2.2); group.add(tailV);
  const tailH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.6), khaki);
  tailH.position.set(0, 0.05, -2.2); group.add(tailH);

  return group;
}
```

- [ ] **Step 2: Write `js/enemy.js`** (stub AI for now)

```js
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
    this.mesh = buildBiplane();
    this.mesh.rotation.order = 'YXZ';
  }

  update(dt, player) {
    // Placeholder: fly straight for now — AI in Task 11
    const fx = -Math.sin(this.yaw) * Math.cos(this.pitch);
    const fy = Math.sin(this.pitch);
    const fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    this.position.x += fx * this.speed * dt;
    this.position.y += fy * this.speed * dt;
    this.position.z += fz * this.speed * dt;
    this.forward = { x: fx, y: fy, z: fz };
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw;
    this.mesh.rotation.x = this.pitch;
    this.mesh.rotation.z = -this.roll;
  }
}
```

- [ ] **Step 3: Add one stationary enemy in `js/main.js`**

```js
import { Enemy } from './enemy.js';
const enemies = [];
const e0 = new Enemy({ x: 0, y: 200, z: -400 });
enemies.push(e0);
scene.add(e0.mesh);

// In loop, after plane.update:
for (const e of enemies) e.update(dt, plane);
```

- [ ] **Step 4: Bump VERSION to `v0.0.9`**.

- [ ] **Step 5: Manual playtest** — you should see a khaki biplane in front of you, slowly receding because it's flying straight ahead.

- [ ] **Step 6: Commit**

```bash
git add js/models.js js/enemy.js js/main.js js/config.js
git commit -m "feat: Allied biplane mesh and initial enemy scaffold"
```

---

## Task 10: Weapons module — lock cone + aim-lead hit test (TDD)

**Files:**
- Create: `js/weapons.js`
- Create: `tests/weapons.test.mjs`

- [ ] **Step 1: Write `tests/weapons.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inCone, leadTarget } from '../js/weapons.js';

const DEG = Math.PI / 180;

test('enemy directly ahead is in cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const enemy = { x: 0, y: 0, z: -100 };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), true);
});

test('enemy behind is NOT in cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const enemy = { x: 0, y: 0, z: 200 };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), false);
});

test('enemy beyond range is NOT in cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const enemy = { x: 0, y: 0, z: -500 };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), false);
});

test('enemy at 20° is NOT in a 15° cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const d = 100;
  const a = 20 * DEG;
  const enemy = { x: Math.sin(a) * d, y: 0, z: -Math.cos(a) * d };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), false);
});

test('leadTarget predicts intercept point', () => {
  const shooter = { x: 0, y: 0, z: 0 };
  const target = { x: 100, y: 0, z: -100, vx: 0, vy: 0, vz: 10 }; // moving +Z
  const bulletSpeed = 200;
  const pt = leadTarget(shooter, target, bulletSpeed);
  // With target moving toward shooter along +Z, lead point should have larger z (less negative)
  assert.ok(pt.z > -100);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `node --test tests/weapons.test.mjs`
Expected: FAIL (module missing).

- [ ] **Step 3: Write `js/weapons.js`**

```js
export function inCone(self, forward, enemy, { angle, range }) {
  const dx = enemy.x - self.x;
  const dy = enemy.y - self.y;
  const dz = enemy.z - self.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > range || dist < 0.01) return false;
  const fmag = Math.hypot(forward.x, forward.y, forward.z) || 1;
  const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / (dist * fmag);
  if (dot <= 0) return false; // behind
  const ang = Math.acos(Math.min(1, Math.max(-1, dot)));
  return ang <= angle;
}

export function leadTarget(shooter, target, bulletSpeed) {
  // Simple linear prediction: solve for t where |target + v*t - shooter| = bulletSpeed*t
  const dx = target.x - shooter.x;
  const dy = target.y - shooter.y;
  const dz = target.z - shooter.z;
  const vx = target.vx || 0, vy = target.vy || 0, vz = target.vz || 0;
  const a = vx * vx + vy * vy + vz * vz - bulletSpeed * bulletSpeed;
  const b = 2 * (dx * vx + dy * vy + dz * vz);
  const c = dx * dx + dy * dy + dz * dz;
  let t;
  if (Math.abs(a) < 1e-6) {
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) t = Math.hypot(dx, dy, dz) / bulletSpeed;
    else t = Math.max(0, (-b - Math.sqrt(disc)) / (2 * a));
    if (!(t > 0)) t = Math.max(0, (-b + Math.sqrt(disc)) / (2 * a));
  }
  return { x: target.x + vx * t, y: target.y + vy * t, z: target.z + vz * t, t };
}
```

- [ ] **Step 4: Re-run tests**

Run: `node --test tests/weapons.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Bump VERSION to `v0.0.10`**.

- [ ] **Step 6: Commit**

```bash
git add js/weapons.js tests/weapons.test.mjs js/config.js
git commit -m "feat: weapon cone test + aim-lead prediction (tests)"
```

---

## Task 11: Enemy AI (chaser + jouster)

**Files:**
- Modify: `js/enemy.js`
- Modify: `js/main.js`

- [ ] **Step 1: Replace `update()` in `js/enemy.js`** with AI

```js
  update(dt, player) {
    // Compute desired heading
    const targetPoint = this.computeTargetPoint(player);
    const dx = targetPoint.x - this.position.x;
    const dy = targetPoint.y - this.position.y;
    const dz = targetPoint.z - this.position.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / dist, ny = dy / dist, nz = dz / dist;

    const desiredYaw = Math.atan2(-nx, -nz);
    const desiredPitch = Math.asin(Math.max(-1, Math.min(1, ny)));

    // Limit turn rate
    const turnCap = ENEMY.TURN_CAP;
    let dYaw = desiredYaw - this.yaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    this.yaw += Math.sign(dYaw) * Math.min(Math.abs(dYaw), turnCap * dt);
    let dPitch = desiredPitch - this.pitch;
    this.pitch += Math.sign(dPitch) * Math.min(Math.abs(dPitch), turnCap * 0.7 * dt);
    // Bank visually into turns
    this.roll += (dYaw * 1.5 - this.roll) * 0.08;
    this.roll = Math.max(-1.0, Math.min(1.0, this.roll));

    // Forward integration
    const fx = -Math.sin(this.yaw) * Math.cos(this.pitch);
    const fy = Math.sin(this.pitch);
    const fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    this.position.x += fx * this.speed * dt;
    this.position.y += fy * this.speed * dt;
    this.position.z += fz * this.speed * dt;
    this.forward = { x: fx, y: fy, z: fz };

    this.syncMesh();
  }

  computeTargetPoint(player) {
    if (this.mode === 'jouster') {
      // Aim for a point 200m ahead of player's nose
      return {
        x: player.position.x + player.forward.x * 200,
        y: player.position.y + player.forward.y * 200,
        z: player.position.z + player.forward.z * 200,
      };
    }
    // Chaser: aim at player's current position
    return { ...player.position };
  }
```

- [ ] **Step 2: Modify `js/main.js`** — spawn a couple of enemies with modes

Replace the stationary enemy block with:

```js
const enemies = [];
function spawnEnemy(mode, bearing, dist, altOffset) {
  const x = plane.position.x + Math.sin(bearing) * dist;
  const z = plane.position.z + Math.cos(bearing) * dist;
  const y = plane.position.y + altOffset;
  const e = new Enemy({ x, y, z, mode });
  e.yaw = bearing + Math.PI; // face roughly toward origin
  enemies.push(e);
  scene.add(e.mesh);
  return e;
}
spawnEnemy('chaser', 0.3, 500, 20);
spawnEnemy('jouster', -0.6, 600, -10);
```

- [ ] **Step 3: Bump VERSION to `v0.0.11`**.

- [ ] **Step 4: Manual playtest** — the two biplanes should orient toward / past you and pursue.

- [ ] **Step 5: Commit**

```bash
git add js/enemy.js js/main.js js/config.js
git commit -m "feat: enemy AI with chaser and jouster behaviors"
```

---

## Task 12: Enemy spawner with difficulty ramp (TDD)

**Files:**
- Create: `js/enemy-spawner.js`
- Create: `tests/enemy-spawner.test.mjs`
- Modify: `js/main.js`

- [ ] **Step 1: Write `tests/enemy-spawner.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetCount } from '../js/enemy-spawner.js';

test('starts at 2 enemies with 0 kills', () => {
  assert.equal(targetCount(0), 2);
});

test('ramps to 3 at 5 kills', () => {
  assert.equal(targetCount(5), 3);
});

test('ramps to 4 at 10 kills', () => {
  assert.equal(targetCount(10), 4);
});

test('caps at 4', () => {
  assert.equal(targetCount(50), 4);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `node --test tests/enemy-spawner.test.mjs`
Expected: FAIL (module missing).

- [ ] **Step 3: Write `js/enemy-spawner.js`**

```js
import { SPAWN, ENEMY } from './config.js';
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
```

- [ ] **Step 4: Re-run tests**

Run: `node --test tests/enemy-spawner.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Modify `js/main.js`** to use the spawner

Replace the manual `spawnEnemy(...)` calls with:

```js
import { Spawner } from './enemy-spawner.js';
const spawner = new Spawner(scene);
let kills = 0;

// In the loop, after enemy updates:
spawner.removeDead(enemies);
spawner.maybeSpawn(enemies, plane, kills);
```

- [ ] **Step 6: Bump VERSION to `v0.0.12`**.

- [ ] **Step 7: Commit**

```bash
git add js/enemy-spawner.js tests/enemy-spawner.test.mjs js/main.js js/config.js
git commit -m "feat: enemy spawner with difficulty ramp (tests)"
```

---

## Task 13: Auto-fire + tracers + enemy damage

**Files:**
- Modify: `js/weapons.js`
- Modify: `js/main.js`

- [ ] **Step 1: Extend `js/weapons.js`** with a firing controller + tracer pool

Append to `js/weapons.js`:

```js
import { GUN } from './config.js';

const DEG = Math.PI / 180;

export class Guns {
  constructor(scene, maxTracers = 60) {
    this.scene = scene;
    this.cooldown = 0;
    this.fireInterval = 60 / GUN.RPM; // seconds per round
    this.tracers = [];
    this.maxTracers = maxTracers;
    this.flashTimer = 0;

    // Pre-allocate tracer meshes
    const geom = new THREE.CylinderGeometry(0.04, 0.04, 3.0, 6);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe58a, fog: false });
    for (let i = 0; i < maxTracers; i++) {
      const m = new THREE.Mesh(geom, mat);
      m.visible = false;
      this.tracers.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
      scene.add(m);
    }
    this.bulletSpeed = 500; // m/s, visual
  }

  update(dt, player, enemies) {
    this.cooldown -= dt;
    this.flashTimer -= dt;

    // Find best target in cone
    let target = null;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (inCone(player.position, player.forward, e.position, { angle: GUN.CONE_DEG * DEG, range: GUN.RANGE })) {
        if (!target || dist2(player.position, e.position) < dist2(player.position, target.position)) {
          target = e;
        }
      }
    }

    // Fire
    let fired = false;
    while (target && this.cooldown <= 0) {
      this.cooldown += this.fireInterval;
      this.flashTimer = 0.05;
      fired = true;

      // Aim-lead hit test
      const enemyWithVel = {
        ...target.position,
        vx: target.forward.x * target.speed,
        vy: target.forward.y * target.speed,
        vz: target.forward.z * target.speed,
      };
      const lead = leadTarget(player.position, enemyWithVel, this.bulletSpeed);
      // If the leaded point is still in-cone, the bullet "hits"
      if (inCone(player.position, player.forward, lead, { angle: GUN.CONE_DEG * DEG, range: GUN.RANGE })) {
        target.hp -= GUN.DAMAGE_PER_ROUND;
      }

      // Spawn tracer (every 3rd round)
      if (this._tracerCounter === undefined) this._tracerCounter = 0;
      this._tracerCounter++;
      if (this._tracerCounter % 3 === 0) this.spawnTracer(player);
    }
    if (!target) this.cooldown = Math.max(0, this.cooldown);

    // Update tracers
    for (const t of this.tracers) {
      if (!t.mesh.visible) continue;
      t.mesh.position.x += t.vx * dt;
      t.mesh.position.y += t.vy * dt;
      t.mesh.position.z += t.vz * dt;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false;
    }

    return { firing: fired, target };
  }

  spawnTracer(player) {
    const slot = this.tracers.find(t => !t.mesh.visible);
    if (!slot) return;
    slot.mesh.visible = true;
    slot.mesh.position.set(player.position.x, player.position.y, player.position.z);
    slot.mesh.lookAt(
      player.position.x + player.forward.x,
      player.position.y + player.forward.y,
      player.position.z + player.forward.z
    );
    slot.vx = player.forward.x * this.bulletSpeed;
    slot.vy = player.forward.y * this.bulletSpeed;
    slot.vz = player.forward.z * this.bulletSpeed;
    slot.life = 0.8;
  }
}

function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
```

- [ ] **Step 2: Wire guns + kill tracking into `js/main.js`**

```js
import { Guns } from './weapons.js';
const guns = new Guns(scene);

// In the loop, after spawner updates:
const gunState = guns.update(dt, plane, enemies);
for (const e of enemies) {
  if (e.alive && e.hp <= 0) {
    e.alive = false;
    kills++;
  }
}
```

- [ ] **Step 3: Light up the crosshair when locked** — extend hud state

In main loop:

```js
drawHud(octx, {
  locked: !!gunState.target,
  joystick: { ... },
});
```

- [ ] **Step 4: Bump VERSION to `v0.0.13`**.

- [ ] **Step 5: Manual playtest**

Fly toward an enemy. When it's near the center of screen, the crosshair ring should turn gold and yellow tracers should stream forward. Enemy disappears after ~3s of centered fire.

- [ ] **Step 6: Commit**

```bash
git add js/weapons.js js/main.js js/config.js
git commit -m "feat: auto-fire with lock cone, aim lead, tracers, and kill tracking"
```

---

## Task 14: Enemy firing + player damage + death state

**Files:**
- Modify: `js/enemy.js`
- Modify: `js/main.js`
- Create: `js/game.js`

- [ ] **Step 1: Add firing to `js/enemy.js`**

Inside `Enemy.update(dt, player)`, after forward integration, before `syncMesh()`:

```js
    // Fire at player if in-cone + in range
    const dx = player.position.x - this.position.x;
    const dy = player.position.y - this.position.y;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dy, dz);
    const fmag = Math.hypot(this.forward.x, this.forward.y, this.forward.z) || 1;
    const dot = (dx * this.forward.x + dy * this.forward.y + dz * this.forward.z) / (dist * fmag);
    const ang = Math.acos(Math.min(1, Math.max(-1, dot)));
    const FIRE_CONE = ENEMY.FIRE_CONE_DEG * Math.PI / 180;
    this.firing = (dist < ENEMY.FIRE_RANGE && ang < FIRE_CONE && dot > 0);
    if (this.firing) {
      player.hp -= ENEMY.DPS * dt;
    }
```

- [ ] **Step 2: Add `hp` to `Plane`** — modify `js/plane.js` constructor:

```js
    this.hp = PLAYER.HP;
    this.alive = true;
    this.damageFlash = 0; // set by external code on hit; decays
```

Add to the end of `update(dt, joystick)`:

```js
    this.damageFlash = Math.max(0, this.damageFlash - dt * 3);
```

- [ ] **Step 3: Write `js/game.js`** (state machine)

```js
export const STATE = { MENU: 'menu', PLAYING: 'playing', GAMEOVER: 'gameover' };

export class GameState {
  constructor() {
    this.state = STATE.MENU;
    this.kills = 0;
    this.best = parseInt(localStorage.getItem('ww1.best') || '0', 10) || 0;
    this.gameOverTimer = 0;
  }
  startRun() {
    this.state = STATE.PLAYING;
    this.kills = 0;
    this.gameOverTimer = 0;
  }
  die() {
    this.state = STATE.GAMEOVER;
    this.gameOverTimer = 2.0;
    if (this.kills > this.best) {
      this.best = this.kills;
      localStorage.setItem('ww1.best', String(this.best));
    }
  }
}
```

- [ ] **Step 4: Wire death + respawn into `js/main.js`**

```js
import { GameState, STATE } from './game.js';
const gs = new GameState();
gs.startRun(); // Task 19 adds the actual menu

// In the loop (new order):
if (gs.state === STATE.PLAYING) {
  joystick.tick(dt);
  plane.update(dt, joystick.value());
  syncCameraToPlane();
  for (const e of enemies) e.update(dt, plane);
  spawner.removeDead(enemies);
  spawner.maybeSpawn(enemies, plane, gs.kills);
  const gunState = guns.update(dt, plane, enemies);
  for (const e of enemies) {
    if (e.alive && e.hp <= 0) {
      e.alive = false;
      gs.kills++;
    }
  }
  if (plane.hp <= 0 && plane.alive) {
    plane.alive = false;
    gs.die();
  }
}
```

- [ ] **Step 5: Bump VERSION to `v0.0.14`**.

- [ ] **Step 6: Manual playtest** — enemies should fire at you when lined up; your HP drops; game state flips to GAMEOVER when HP ≤ 0.

- [ ] **Step 7: Commit**

```bash
git add js/enemy.js js/plane.js js/game.js js/main.js js/config.js
git commit -m "feat: enemy fire, player damage, and death state"
```

---

## Task 15: Health bar + damage vignette + score HUD

**Files:**
- Modify: `js/hud.js`
- Modify: `js/main.js`
- Modify: `js/plane.js`

- [ ] **Step 1: Track damage flash on hit in `js/enemy.js`**

In the `this.firing && ...` block, after `player.hp -= ...`:

```js
      player.damageFlash = Math.min(1, player.damageFlash + ENEMY.DPS * dt / 20);
```

- [ ] **Step 2: Extend `drawHud` in `js/hud.js`** — add health, score, vignette, game-over

Replace the module contents:

```js
import { CANVAS_W, CANVAS_H, VERSION, PLAYER } from './config.js';

export function drawHud(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Damage vignette
  if (state.damageFlash > 0) {
    const g = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.2,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.75
    );
    g.addColorStop(0, `rgba(255,0,0,0)`);
    g.addColorStop(1, `rgba(180,0,0,${state.damageFlash.toFixed(2)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Crosshair
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
  ctx.strokeStyle = state.locked ? '#ffd65a' : '#ffffffaa';
  ctx.lineWidth = state.locked ? 4 : 2;
  ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy); ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy + 16);
  ctx.stroke();

  // Score top-left
  ctx.fillStyle = '#ffffffdd';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`KILLS ${state.kills}`, 32, 64);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#ffffff99';
  ctx.fillText(`BEST ${state.best}`, 32, 100);

  // Health bar bottom-left
  const hpW = 300, hpH = 24, hpX = 32, hpY = CANVAS_H - 64;
  const pct = Math.max(0, state.hp / PLAYER.HP);
  ctx.fillStyle = '#000000aa';
  ctx.fillRect(hpX - 2, hpY - 2, hpW + 4, hpH + 4);
  ctx.fillStyle = '#c21515';
  ctx.fillRect(hpX, hpY, hpW * pct, hpH);
  ctx.fillStyle = '#ffffffdd';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.max(0, Math.round(state.hp))} HP`, hpX, hpY - 6);

  // Joystick visual
  if (state.joystick && state.joystick.active) {
    const { ax, ay, x, y, radius } = state.joystick;
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath(); ctx.arc(ax + x * radius, ay + y * radius, 28, 0, Math.PI * 2); ctx.fill();
  }

  // Game over
  if (state.gameOver) {
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffeded';
    ctx.textAlign = 'center';
    ctx.font = 'bold 96px serif';
    ctx.fillText('SHOT DOWN', CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#ffffffdd';
    ctx.fillText(`KILLS ${state.kills}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
    ctx.fillStyle = '#ffffff99';
    ctx.font = '32px sans-serif';
    ctx.fillText(`BEST ${state.best}`, CANVAS_W / 2, CANVAS_H / 2 + 70);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '28px sans-serif';
    ctx.fillText('TAP TO FLY AGAIN', CANVAS_W / 2, CANVAS_H / 2 + 160);
  }

  // Version bottom-center
  ctx.fillStyle = '#ffffff55';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(VERSION, CANVAS_W / 2, CANVAS_H - 14);
}
```

- [ ] **Step 3: Update hud call in `js/main.js`**

```js
drawHud(octx, {
  locked: !!gunState?.target,
  damageFlash: plane.damageFlash,
  hp: plane.hp,
  kills: gs.kills,
  best: gs.best,
  gameOver: gs.state === STATE.GAMEOVER,
  joystick: {
    active: joystick.active,
    ax: joystick.ax, ay: joystick.ay,
    x: joystick.x, y: joystick.y,
    radius: joystick.radius,
  },
});
```

- [ ] **Step 4: Bump VERSION to `v0.0.15`**.

- [ ] **Step 5: Manual playtest** — getting shot shows red vignette; HP decreases visibly; at 0 HP "SHOT DOWN" appears.

- [ ] **Step 6: Commit**

```bash
git add js/hud.js js/main.js js/enemy.js js/config.js
git commit -m "feat: health bar, damage vignette, score, and game-over overlay"
```

---

## Task 16: Minimap (TDD for coord math)

**Files:**
- Create: `js/minimap.js`
- Create: `tests/minimap.test.mjs`
- Modify: `js/hud.js`

- [ ] **Step 1: Write `tests/minimap.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldToRadar } from '../js/minimap.js';

test('enemy directly ahead maps above center (negative dy)', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: 0 };
  const enemy = { x: 0, y: 0, z: -500 };
  const p = worldToRadar(player, enemy, 100, 2000);
  assert.equal(p.x, 0);
  assert.ok(p.y < 0, `expected y<0, got ${p.y}`);
});

test('enemy behind maps below center (positive dy)', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: 0 };
  const enemy = { x: 0, y: 0, z: 500 };
  const p = worldToRadar(player, enemy, 100, 2000);
  assert.ok(p.y > 0);
});

test('enemy beyond range clamps to edge of radar', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: 0 };
  const enemy = { x: 10000, y: 0, z: 0 };
  const p = worldToRadar(player, enemy, 100, 2000);
  assert.ok(Math.hypot(p.x, p.y) <= 100.01);
});

test('yaw rotates the radar', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: Math.PI / 2 };
  const enemy = { x: 0, y: 0, z: -500 };
  const p = worldToRadar(player, enemy, 100, 2000);
  // With player yaw=90°, forward points +X in world — enemy at -Z is now to the right
  assert.ok(p.x > 0, `expected x>0, got ${p.x}`);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `node --test tests/minimap.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write `js/minimap.js`**

```js
import { WORLD } from './config.js';

// Transform enemy world position to radar-local (x right, y down from center).
// Player frame: right = (cos(yaw), 0, -sin(yaw)), forward = (-sin(yaw), 0, -cos(yaw)).
// Radar x = right projection of offset; radar y = -forward projection (canvas y flips).
export function worldToRadar(player, enemy, radius, range) {
  const dx = enemy.x - player.position.x;
  const dz = enemy.z - player.position.z;
  const cy = Math.cos(player.yaw);
  const sy = Math.sin(player.yaw);
  const rx = dx * cy - dz * sy;
  const ry = dx * sy + dz * cy;
  const scale = radius / range;
  let x = rx * scale;
  let y = ry * scale;
  const mag = Math.hypot(x, y);
  if (mag > radius) {
    x = x * radius / mag;
    y = y * radius / mag;
  }
  return { x, y };
}

export function drawMinimap(ctx, player, enemies, { cx, cy, radius }) {
  // Background
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#00000099';
  ctx.fill();
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Player icon — triangle pointing up
  ctx.fillStyle = '#cfe6ff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx - 7, cy + 7);
  ctx.lineTo(cx + 7, cy + 7);
  ctx.closePath();
  ctx.fill();

  // Enemy dots
  for (const e of enemies) {
    if (!e.alive) continue;
    const p = worldToRadar(player, e.position, radius, 2000);
    const altDelta = e.position.y - player.position.y;
    const altScale = Math.max(0.5, Math.min(1.4, 1 - altDelta / 400));
    ctx.fillStyle = '#ff4a4a';
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, 6 * altScale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Edge arrow if past soft return
  const distXZ = Math.hypot(player.position.x, player.position.z);
  if (distXZ > WORLD.RETURN_SOFT) {
    const originLocal = worldToRadar(player, { x: 0, y: 0, z: 0 }, radius, 2000);
    const mag = Math.hypot(originLocal.x, originLocal.y) || 1;
    const ax = (originLocal.x / mag) * (radius - 8);
    const ay = (originLocal.y / mag) * (radius - 8);
    ctx.fillStyle = '#ffee88';
    ctx.beginPath();
    ctx.arc(cx + ax, cy + ay, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
```

- [ ] **Step 4: Re-run tests**

Run: `node --test tests/minimap.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire minimap into `js/hud.js`** (top-right)

Add import at top of `js/hud.js`:

```js
import { drawMinimap } from './minimap.js';
```

Inside `drawHud`, after joystick block, before game-over:

```js
  if (state.player) {
    drawMinimap(ctx, state.player, state.enemies, {
      cx: CANVAS_W - 200, cy: 200, radius: 180,
    });
  }

  // Return-to-battle text
  if (state.player) {
    const d = Math.hypot(state.player.position.x, state.player.position.z);
    if (d > 1800) {
      ctx.fillStyle = '#ffee88';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RETURN TO BATTLE', CANVAS_W / 2, 260);
    }
  }
```

Pass `player` and `enemies` from `main.js`:

```js
drawHud(octx, {
  ...,
  player: plane,
  enemies,
});
```

- [ ] **Step 6: Bump VERSION to `v0.0.16`**.

- [ ] **Step 7: Manual playtest** — radar shows red dots for enemies, rotates as you turn.

- [ ] **Step 8: Commit**

```bash
git add js/minimap.js tests/minimap.test.mjs js/hud.js js/main.js js/config.js
git commit -m "feat: circular minimap with enemy dots and return-to-battle indicator (tests)"
```

---

## Task 17: Smoke trails, muzzle flash, death spin

**Files:**
- Modify: `js/enemy.js`
- Modify: `js/plane.js`
- Modify: `js/models.js`
- Modify: `js/main.js`

- [ ] **Step 1: Add muzzle flash sprite to cockpit in `js/models.js`**

In `buildCockpit()`, after the barrels are added, add:

```js
  const flashMat = new THREE.SpriteMaterial({
    color: 0xffe080, transparent: true, opacity: 0.0, fog: false,
  });
  const flash = new THREE.Sprite(flashMat);
  flash.scale.set(0.5, 0.5, 0.5);
  flash.position.set(0, -0.18, -1.1);
  flash.name = 'muzzle-flash';
  group.add(flash);
  group.userData.flash = flash;
```

- [ ] **Step 2: Pulse the muzzle flash from `main.js`**

Inside the loop, after `guns.update(...)`:

```js
if (cockpit.userData.flash) {
  cockpit.userData.flash.material.opacity = Math.max(0, guns.flashTimer * 12);
}
```

- [ ] **Step 3: Add smoke trail helper to `js/models.js`**

```js
export function createSmokePool(scene, size = 120) {
  const tex = new THREE.CanvasTexture(makeSmokeCanvas());
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite: false });
  const pool = [];
  for (let i = 0; i < size; i++) {
    const s = new THREE.Sprite(mat.clone());
    s.visible = false;
    s.scale.set(3, 3, 3);
    scene.add(s);
    pool.push({ sprite: s, life: 0, maxLife: 1 });
  }
  return pool;
}

function makeSmokeCanvas() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grad.addColorStop(0, 'rgba(180,180,180,0.9)');
  grad.addColorStop(1, 'rgba(180,180,180,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export function emitSmoke(pool, x, y, z, maxLife = 1.0) {
  const slot = pool.find(s => !s.sprite.visible);
  if (!slot) return;
  slot.sprite.visible = true;
  slot.sprite.position.set(x, y, z);
  slot.sprite.material.opacity = 0.7;
  slot.life = maxLife;
  slot.maxLife = maxLife;
}

export function updateSmoke(pool, dt) {
  for (const s of pool) {
    if (!s.sprite.visible) continue;
    s.life -= dt;
    s.sprite.material.opacity = Math.max(0, 0.7 * s.life / s.maxLife);
    const grow = 1 + (1 - s.life / s.maxLife) * 2;
    s.sprite.scale.set(3 * grow, 3 * grow, 3 * grow);
    if (s.life <= 0) s.sprite.visible = false;
  }
}
```

- [ ] **Step 4: Emit smoke in `js/main.js`**

```js
import { createSmokePool, emitSmoke, updateSmoke } from './models.js';
const smokePool = createSmokePool(scene);
let smokeTimer = 0;

// In the loop:
updateSmoke(smokePool, dt);
smokeTimer -= dt;
if (smokeTimer <= 0) {
  smokeTimer = 0.05;
  for (const e of enemies) {
    if (e.alive && e.hp < 30) {
      emitSmoke(smokePool,
        e.position.x - e.forward.x * 1.5,
        e.position.y - e.forward.y * 1.5,
        e.position.z - e.forward.z * 1.5,
        1.0);
    }
  }
  if (plane.hp < 30) {
    emitSmoke(smokePool,
      plane.position.x - plane.forward.x * 2,
      plane.position.y - plane.forward.y * 2,
      plane.position.z - plane.forward.z * 2,
      1.2);
  }
}
```

- [ ] **Step 5: Add death spin animation**

In `Enemy`, when `hp <= 0`, mark `this.alive = false` and animate a "dying" state before removal. Simplest: spawn smoke burst + delete immediately. Extend `js/enemy.js`:

Change the `alive` gate in `main.js`'s update loop to call `e.onKilled(smokePool)`:

```js
// when kill detected:
for (let i = 0; i < 10; i++) emitSmoke(smokePool, e.position.x, e.position.y, e.position.z, 1.2);
```

- [ ] **Step 6: Bump VERSION to `v0.0.17`**.

- [ ] **Step 7: Commit**

```bash
git add js/models.js js/enemy.js js/plane.js js/main.js js/config.js
git commit -m "feat: muzzle flash, smoke trails below 30HP, kill smoke burst"
```

---

## Task 18: Clouds + altitude/speed readout

**Files:**
- Modify: `js/world.js`
- Modify: `js/hud.js`

- [ ] **Step 1: Add clouds to `js/world.js`**

Append in `buildWorld()` before the return:

```js
  // Clouds: billboard sprites scattered
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 128; cloudCanvas.height = 128;
  const cctx = cloudCanvas.getContext('2d');
  const grad = cctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  cctx.fillStyle = grad; cctx.fillRect(0, 0, 128, 128);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, fog: true });

  for (let i = 0; i < 25; i++) {
    const s = new THREE.Sprite(cloudMat);
    const a = Math.random() * Math.PI * 2;
    const r = 200 + Math.random() * 1500;
    s.position.set(Math.cos(a) * r, 150 + Math.random() * 350, Math.sin(a) * r);
    const size = 60 + Math.random() * 120;
    s.scale.set(size, size, size);
    scene.add(s);
  }
```

- [ ] **Step 2: Add altitude/speed readout to `js/hud.js`**

Inside `drawHud`, before the version line:

```js
  if (state.player) {
    ctx.fillStyle = '#ffffff77';
    ctx.font = '22px monospace';
    ctx.textAlign = 'right';
    const altM = Math.max(0, Math.round(state.player.position.y));
    const spd = state.player.speed || 0;
    ctx.fillText(`ALT ${altM}m`, CANVAS_W - 32, CANVAS_H - 90);
    ctx.fillText(`SPD ${spd}m/s`, CANVAS_W - 32, CANVAS_H - 60);
  }
```

- [ ] **Step 3: Bump VERSION to `v0.0.18`**.

- [ ] **Step 4: Commit**

```bash
git add js/world.js js/hud.js js/config.js
git commit -m "feat: clouds and altitude/speed readout"
```

---

## Task 19: Title / game-over screens + tap to start

**Files:**
- Modify: `js/game.js`
- Modify: `js/main.js`
- Modify: `js/hud.js`

- [ ] **Step 1: Add `restart()` + `resetPlayer()` to `js/game.js`**

```js
  reset() {
    this.kills = 0;
  }
```

- [ ] **Step 2: Modify `js/main.js`** to handle state transitions

Replace the `gs.startRun()` line with nothing (stay in MENU). Add:

```js
function resetGameObjects() {
  // Remove all enemies
  for (const e of enemies) scene.remove(e.mesh);
  enemies.length = 0;
  plane.position.x = 0; plane.position.y = 200; plane.position.z = 0;
  plane.pitch = 0; plane.roll = 0; plane.yaw = 0;
  plane.hp = 100; plane.alive = true; plane.damageFlash = 0;
  gs.reset();
}

// Tap handler (pointerdown on overlay)
overlayCanvas.addEventListener('pointerdown', (e) => {
  if (gs.state === STATE.MENU) {
    resetGameObjects();
    gs.startRun();
  } else if (gs.state === STATE.GAMEOVER && gs.gameOverTimer <= 0) {
    gs.state = STATE.MENU;
  }
  // ...existing joystick handling
});
```

In the loop, advance `gs.gameOverTimer`:

```js
if (gs.state === STATE.GAMEOVER) {
  gs.gameOverTimer = Math.max(0, gs.gameOverTimer - dt);
}
```

- [ ] **Step 3: Draw MENU screen in `js/hud.js`**

Add inside `drawHud`:

```js
  if (state.menu) {
    ctx.fillStyle = '#000000dd';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffd65a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 110px serif';
    ctx.fillText('WW1', CANVAS_W / 2, CANVAS_H / 2 - 180);
    ctx.font = 'bold 88px serif';
    ctx.fillStyle = '#ffeded';
    ctx.fillText('FLIGHT SIM', CANVAS_W / 2, CANVAS_H / 2 - 80);
    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#ffffffcc';
    ctx.fillText('TAP TO FLY', CANVAS_W / 2, CANVAS_H / 2 + 60);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff99';
    ctx.fillText(`BEST ${state.best}`, CANVAS_W / 2, CANVAS_H / 2 + 140);
  }
```

Pass `menu: gs.state === STATE.MENU` into the HUD call.

- [ ] **Step 4: Bump VERSION to `v0.0.19`**.

- [ ] **Step 5: Manual playtest** — game boots to title, tap starts run, death → game-over → tap → title.

- [ ] **Step 6: Commit**

```bash
git add js/game.js js/main.js js/hud.js js/config.js
git commit -m "feat: title / game-over screens with tap-to-start"
```

---

## Task 20: Procedural audio (engine, gun, hit, kill)

**Files:**
- Create: `js/audio.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/audio.js`**

```js
let ctx = null;
let engineOsc = null;
let engineGain = null;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
}

export function startEngine() {
  if (!ctx) return;
  if (engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 90;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0.08;
  engineOsc.connect(lp).connect(engineGain).connect(ctx.destination);
  engineOsc.start();
}

export function stopEngine() {
  if (engineOsc) { engineOsc.stop(); engineOsc.disconnect(); engineOsc = null; engineGain = null; }
}

export function setEnginePitch(hz) {
  if (engineOsc) engineOsc.frequency.value = hz;
}

export function playGunBurst() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = 180 + Math.random() * 40;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.14, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.06);
}

export function playHit() {
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain(); g.gain.value = 0.3;
  src.connect(g).connect(ctx.destination);
  src.start();
}

export function playKill() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(400, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.65);
}

export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
```

- [ ] **Step 2: Wire into `js/main.js`**

```js
import { initAudio, startEngine, stopEngine, setEnginePitch, playGunBurst, playHit, playKill } from './audio.js';

// First tap starts audio:
overlayCanvas.addEventListener('pointerdown', () => { initAudio(); }, { once: true });

// When entering PLAYING: startEngine();
// When exiting PLAYING (gameover/menu): stopEngine();

// In gun firing: if (gunState.firing) playGunBurst();
// In player damage: if took dmg this frame, playHit();
// In kill: playKill();
```

Engine pitch modulation: in the loop when playing, `setEnginePitch(80 + Math.abs(plane._targetPitchRate) * 80);`

- [ ] **Step 3: Bump VERSION to `v0.0.20`**.

- [ ] **Step 4: Manual playtest** — engine drone, gun bursts on fire, noise pop on hit, descending whine on kill.

- [ ] **Step 5: Commit**

```bash
git add js/audio.js js/main.js js/config.js
git commit -m "feat: procedural engine, gun, hit, and kill audio"
```

---

## Task 21: PlaySDK pause/resume + screenshot mode

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add pause handling in `js/main.js`**

```js
let rafId;
let paused = false;

function loop(t) {
  if (paused) return;
  // ... existing body ...
  rafId = requestAnimationFrame(loop);
}
rafId = requestAnimationFrame(loop);

if (window.PlaySDK) {
  PlaySDK.onPause(() => {
    paused = true;
    cancelAnimationFrame(rafId);
    import('./audio.js').then(m => m.suspendAudio());
  });
  PlaySDK.onResume(() => {
    paused = false;
    import('./audio.js').then(m => m.resumeAudio());
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  });
}
```

- [ ] **Step 2: Screenshot mode** — at end of `js/main.js`:

```js
if (window.PlaySDK && PlaySDK.screenshotMode) {
  // Auto-enter play, spawn a close enemy for a dramatic frame
  resetGameObjects();
  gs.startRun();
  const e = new Enemy({
    x: plane.position.x + 30,
    y: plane.position.y + 5,
    z: plane.position.z - 200,
    mode: 'chaser',
  });
  enemies.push(e);
  scene.add(e.mesh);
}
```

- [ ] **Step 3: Bump VERSION to `v0.0.21`**.

- [ ] **Step 4: Commit**

```bash
git add js/main.js js/config.js
git commit -m "feat: PlaySDK pause/resume and screenshot mode"
```

---

## Task 22: Thumbnail + deploy smoke test

**Files:**
- Create: `thumbnail.png`
- Create: `tools/render-thumbnail.html` (throwaway)

- [ ] **Step 1: Create `tools/render-thumbnail.html`** — a page that draws the thumbnail to a 1024×1024 canvas and lets you right-click → save.

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Thumbnail</title>
<style>body{margin:0;background:#222;display:flex;align-items:center;justify-content:center;height:100vh}
canvas{border:1px solid #444;background:#6fa6d6}</style>
</head><body>
<canvas id="c" width="1024" height="1024"></canvas>
<script>
const c = document.getElementById('c'); const g = c.getContext('2d');
// Sky gradient
const sky = g.createLinearGradient(0,0,0,1024);
sky.addColorStop(0,'#4a7ab0'); sky.addColorStop(1,'#f0dcb0');
g.fillStyle = sky; g.fillRect(0,0,1024,1024);
// Silhouette of triplane
g.fillStyle = '#b01a1a';
g.fillRect(400, 470, 220, 40);
g.fillRect(250, 380, 520, 28);
g.fillRect(250, 500, 520, 28);
g.fillRect(250, 620, 520, 28);
g.fillStyle = '#202020';
g.fillRect(470, 470, 80, 40);
// Biplane silhouettes far away
g.fillStyle = '#8b824a';
for (const [x,y] of [[120,240],[860,300],[780,760]]) {
  g.fillRect(x-40,y,80,10); g.fillRect(x-40,y+30,80,10); g.fillRect(x-4,y+3,8,30);
}
// Title
g.fillStyle = '#fff5db'; g.font = 'bold 128px serif'; g.textAlign = 'center';
g.fillText('WW1', 512, 230);
g.font = 'bold 96px serif';
g.fillText('FLIGHT SIM', 512, 930);
</script>
</body></html>
```

- [ ] **Step 2: Render and save**

Open `tools/render-thumbnail.html` in a browser. Right-click canvas → "Save Image As…" → save as `thumbnail.png` in the project root.

Alternatively use Puppeteer headless to automate:

```bash
node -e "
(async () => {
  const puppeteer = require('/usr/local/lib/node_modules/puppeteer');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({width:1024, height:1024});
  await page.goto('file://' + process.cwd() + '/tools/render-thumbnail.html');
  await new Promise(r => setTimeout(r, 200));
  const canvas = await page.$('#c');
  await canvas.screenshot({path:'thumbnail.png'});
  await browser.close();
})();
"
```

- [ ] **Step 3: Confirm the PNG is 1024×1024 and readable at small size.**

Open `thumbnail.png` in Preview — the title should still be legible at ~200px width.

- [ ] **Step 4: Deploy smoke test**

```bash
cd /Users/nitzanwilnai/Programming/Claude/GamesPlatform
./scripts/deploy-game.sh /Users/nitzanwilnai/Programming/Claude/JSGames/WW1FlightSim
```

Expected: success message; game playable at `https://play.nitzan.games/games/ww1-flight-sim`.

- [ ] **Step 5: Bump VERSION to `v0.0.22`**.

- [ ] **Step 6: Commit**

```bash
git add thumbnail.png tools/render-thumbnail.html js/config.js
git commit -m "feat: thumbnail art and first platform deploy"
```

---

## Task 23: Full test sweep + puppeteer smoke

**Files:**
- Create: `tests/smoke.mjs`

- [ ] **Step 1: Run all unit tests**

Run: `node --test tests/`
Expected: all passing across all test files.

- [ ] **Step 2: Write `tests/smoke.mjs`** — Puppeteer boot check

```js
const puppeteer = require('/usr/local/lib/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:8765', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/ww1-menu.png' });

  // Simulate a tap to start
  await page.mouse.click(270, 480);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/ww1-playing.png' });

  await browser.close();
  if (errors.length) {
    console.error('Errors detected:', errors);
    process.exit(1);
  }
  console.log('Smoke OK. Screenshots at /tmp/ww1-menu.png and /tmp/ww1-playing.png');
})();
```

- [ ] **Step 3: Run the smoke test**

Start the local server first (`python3 -m http.server 8765 &`), then:

```bash
node tests/smoke.mjs
```

Expected: `Smoke OK.` and two screenshots saved. Open them to confirm menu + in-game look correct.

- [ ] **Step 4: Bump VERSION to `v0.0.23`**.

- [ ] **Step 5: Commit**

```bash
git add tests/smoke.mjs js/config.js
git commit -m "chore: puppeteer smoke test for menu + playing states"
```

---

## Self-Review Summary

- **Spec coverage:**
  - One-touch virtual joystick → Task 3
  - Bank-to-turn physics → Tasks 4, 7
  - Pilot-seat camera + cockpit frame → Tasks 5, 6
  - Auto-fire on 15° cone with lead assist → Tasks 10, 13
  - Enemy chaser/jouster AI → Task 11
  - Spawner + difficulty ramp → Task 12
  - Player/enemy HP, damage, death → Tasks 14, 15
  - Minimap + return-to-battle → Task 16
  - Smoke trails, muzzle flash, kill VFX → Task 17
  - Clouds + HUD readouts → Task 18
  - Menu / game-over state machine → Tasks 14, 19
  - Procedural audio → Task 20
  - PlaySDK pause + screenshot mode → Task 21
  - Thumbnail + deploy → Task 22
  - Smoke test → Task 23

- **Known follow-ups not included** (listed in spec §13):
  - Gameplay tuning iterations on turn rate, pitch smoothing, cone angle
  - Possibly adding a "best streak" stat
  - Thumbnail art polish
