# WW1 Flight Sim — Design

**Date:** 2026-04-14
**Status:** Approved (brainstorming), pending implementation plan
**Platform target:** play.nitzan.games (sandboxed iframe, 1080×1920 portrait)

## 1. Concept

One-touch 3D WW1 dogfighting game. The player flies the Red Baron's Fokker Dr.I triplane against Allied biplanes in an endless-survival loop. Touch anywhere on the screen to create a virtual joystick; drag to control pitch and roll. Guns fire automatically whenever an enemy is in a 15° lock cone in front of the nose. View is first-person from the pilot seat.

## 2. Goals & non-goals

**Goals**
- Snackable, mobile-first session (< 2 min avg run).
- Visceral dogfight feel on a portrait phone screen.
- Readable at a glance: minimap, health bar, lock indicator.
- Cheap to run on mid-tier mobile GPUs (flat-shaded low-poly + 2 MP canvas).

**Non-goals**
- No throttle control, no yaw stick, no landing.
- No weapon variety, no upgrades, no unlocks.
- No campaign, no missions, no cutscenes.
- No multiplayer.

## 3. Core game loop

1. Title screen → "TAP TO FLY".
2. Player spawns at 200m altitude, facing forward, 2 enemies already airborne nearby.
3. Player drags to fly; auto-fires when enemies are in the lock cone.
4. Enemies respawn to maintain target count (starts at 2, +1 every 5 kills, cap 4).
5. Player dies when HP reaches 0 → "SHOT DOWN" screen with kills + best.
6. Tap to return to title / restart.

Best kills persisted via `localStorage`.

## 4. Controls

**Virtual joystick (one-touch)**
- On `pointerdown` anywhere on the canvas: record anchor `(ax, ay)`.
- On `pointermove`: delta `(dx, dy)` clamped to 200px radius, divided by 200 → normalized `(jx, jy)` in `[-1, +1]`.
- 8% dead zone.
- On `pointerup`: joystick eases back to zero over 0.15s.
- Visible: faint ring at anchor, inner dot at current touch position (drawn on overlay canvas).

**Plane response (bank-to-turn)**
- `jy` → target **pitch rate**. (Drag down = pull up, inverted stick. Configurable.)
- `jx` → target **roll angle**, max ±60°.
- Roll angle induces **yaw rate** automatically: `yawRate = sin(roll) * turnGain`.
- Smoothing: `pitch += (targetPitch - pitch) * 0.1`; same for roll.
- Constant forward throttle. Player ~80 m/s, enemies ~75 m/s.

**Drift-out recovery**
- `> 1800m` from origin: gentle yaw bias (~5°/s) toward origin + edge arrow on minimap.
- `> 2400m`: stronger pull (~15°/s). Never fully removes control.

## 5. Combat

**Auto-fire (player)**
- Per-frame: for each enemy, convert to player-local space. Enemy is **in-cone** if `localZ > 0` AND angle to forward `< 15°` AND distance `< 400m`.
- Any enemy in-cone → fire at 600 RPM (10/sec). Tracer rendered every 3rd round.
- Damage: 2 HP per round. Centered fire (all rounds connect) kills an enemy (60 HP) in ~3 s. Edge-of-cone fire misses more rounds → longer kill time (~5–6 s).
- **Aim-assist** lives only in the hit test: predict enemy position at bullet travel time, test against that point. Tracer visuals always follow the true aim line.

**Enemy HP & player HP**
- Player: **100 HP**. Enemy sustained fire does ~10 HP/sec when the player is centered in their cone.
- Enemy: **60 HP**.
- Player feedback: red vignette on hit, screen shake scaled with damage, smoke trail below 30 HP, flames below 10 HP.

**Enemy AI archetypes**
- **Chaser (60%)**: steers toward player with ~40°/s turn cap, fires within a 12° cone at < 350m (~10 HP/sec), breaks off and re-engages on overshoot.
- **Jouster (40%)**: flies toward `player + playerForward * 200m` (head-on pass), fires during approach, climbs/turns after, re-queues.

**Spawning**
- Target active count: 2 → 3 (at 5 kills) → 4 (at 10 kills, cap).
- Spawns at 900–1400m from player, random bearing, altitude ±100m of player.
- Enemy fire damage and turn rate scale mildly with score, capped at +50% at 20 kills.

**Game over**
- HP ≤ 0: plane flat-spins with smoke for 2 s, fade to black, "SHOT DOWN" screen.

## 6. World & rendering

**Scene**
- `THREE.Scene` with linear fog (800m → 2400m) blending planes into horizon haze.
- One directional light (warm sun, tilted down-forward) + soft ambient.
- Flat `MeshLambertMaterial` throughout.

**Camera**
- `PerspectiveCamera`, FOV 75°, parented to player plane at "pilot seat" (slightly forward of CG, head height).
- Inherits plane pitch and roll directly (horizon tilts when banking).
- ~50ms positional lag on pitch so the horizon settles after sharp pulls.

**Minimal cockpit frame (camera children)**
- Twin gun barrels at bottom edge (dark blue-steel; muzzle flashes when firing).
- Sliver of red triplane top-wing at top edge (all-red, black cross decal).

**World**
- Skybox: inside-out sphere with gradient shader (pale blue zenith → warm cream horizon).
- Ground: 6000×6000m plane at y = -200, green/brown quilt texture.
- Clouds: 20–30 billboard sprites (soft white puff) scattered between y = 150–500.

**Plane models (procedural, in `models.js`)**
- **Fokker Dr.I (player)**: fuselage box (red), three stacked wings, tail fin, landing gear hint. ~30–50 tris.
- **Allied biplane (enemy)**: two-wing variant, khaki/olive paint, roundel decals. ~30–50 tris.
- Muzzle flashes: 1-frame billboard sprites.
- Smoke trail: pooled sprite particle system, fade over 1s, enabled under 30 HP.
- Crash: flat spin + growing smoke, removed after 2s.

**Performance constraints**
- Canvas backing store: 1080×1920 logical pixels (no DPR scaling).
- Flexbox-centered canvas, no transforms (per GAME_DEV_NOTES incident).
- `touch-action: none` directly on canvas.
- Pool bullets, tracers, smoke particles — no per-frame allocations.
- Cap on-screen tracers at 60.
- Single `requestAnimationFrame` loop; paused via `PlaySDK.onPause`.

## 7. HUD & overlay (2D canvas, 1080×1920)

Redrawn every frame via `clearRect` + redraw (cheap at 2 MP).

- **Center**: thin white crosshair + 40px ring. Ring turns gold + subtle pulse when an enemy is in the lock cone.
- **Top-left**: "KILLS 12  BEST 24".
- **Bottom-left**: 300×24px health bar (red fill) with HP number inset.
- **Top-right**: 180px-radius circular minimap. Translucent dark fill. Player icon at center pointing up. Enemies as red dots sized by altitude delta. Edge arrow to origin when `> 1800m`.
- **Bottom-right**: altitude + speed readout (dim, small, atmospheric only).
- **Edges**: red damage vignette on hit (fade 0.3s). "RETURN TO BATTLE" text when past 1800m.
- **Virtual joystick**: faint ring at anchor + inner dot at current touch, drawn while pointer is down.
- **Menus (title / game over)**: drawn on the same overlay; throttled to render-on-change.

## 8. Screens / state machine

```
menu  ─TAP→  playing  ─HP=0→  gameover  ─TAP→  menu
```

- **menu**: "WW1 FLIGHT SIM" title, "TAP TO FLY" prompt, best kills, VERSION bottom-center.
- **playing**: full game loop, HUD active.
- **gameover**: darkened scene, "SHOT DOWN", kills + best, "TAP TO FLY AGAIN".

Screenshot mode (`PlaySDK.screenshotMode`): jump directly to `playing` with 2 enemies nearby for a dramatic frame.

## 9. Audio (procedural, Web Audio)

- **Engine drone**: sawtooth + low-pass, pitch modulated by pitch-rate. On during `playing`.
- **Machine gun**: short burst envelope retriggered at 10 Hz while firing, slight pitch jitter.
- **Hit taken**: noise pop + thud.
- **Enemy down**: descending pitch whine + explosion thud.
- **AudioContext** created on first `pointerdown`.
- `PlaySDK.onPause` → `audioCtx.suspend()`; `onResume` → `audioCtx.resume()`.

## 10. File structure (JS modules)

```
index.html
meta.json
thumbnail.png (1024×1024, title rendered in)
css/ui.css
js/
  main.js             # bootstraps, owns game loop, wires modules
  config.js           # VERSION, HP, damage, spawn rates, speeds, colors
  input.js            # virtual joystick state from pointer events
  plane.js            # player physics (pitch/roll/yaw-from-bank, position)
  enemy.js            # enemy state + AI (chaser, jouster)
  enemy-spawner.js    # waves, difficulty scaling, keep-in-zone
  weapons.js          # auto-fire, tracers, hit tests
  world.js            # skybox, ground, clouds, scenery
  models.js           # procedural Fokker Dr.I + biplane meshes
  renderer.js         # three.js scene/camera/renderer, per-frame draw
  hud.js              # 2D overlay draw (crosshair, health, score, vignette)
  minimap.js          # circular radar on overlay
  audio.js            # procedural sfx
  game.js             # state machine: menu → playing → gameover
```

Each module exposes a small explicit API (e.g. `plane.update(dt, joystick)`, `enemySpawner.update(dt, player, enemies)`). No cross-module reach-through.

## 11. Dependencies

- `three.js r128` (CDN)
- `play-sdk.js` (platform CDN)
- No build tooling, no bundler, no npm install.

## 12. Platform deployment

- `meta.json`: slug `ww1-flight-sim`, title "WW1 Flight Sim", tags `["action","3d","dogfight","arcade"]`, author "Nitzan Wilnai".
- `thumbnail.png`: 1024×1024 PNG with game title rendered in (readable at ~200px).
- `.zipignore`: exclude `.git/`, `docs/`, `screenshots/`, dev scripts, `CLAUDE.md`, `.zipignore` itself.
- Deploy via `GamesPlatform/scripts/deploy-game.sh`.
- VERSION constant in `config.js`, rendered on menu and HUD; bumped every commit.

## 13. Open items / decisions deferred to implementation

- Exact tuning of turn rate, pitch smoothing, and fire cone (expect several playtest iterations).
- Thumbnail art direction (low-poly render vs illustrated).
- Whether to add a "best streak" stat alongside best kills.
