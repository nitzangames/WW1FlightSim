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

  // Three stacked wings (triplane): top, middle, bottom — pushed forward
  // so they sit over the pilot's cockpit / forward half of the fuselage.
  const wingGeo = new THREE.BoxGeometry(6.0, 0.15, 1.1);
  const wTop = new THREE.Mesh(wingGeo, red); wTop.position.set(0, 1.1, 0.5); group.add(wTop);
  const wMid = new THREE.Mesh(wingGeo, red); wMid.position.set(0, 0.2, 0.3); group.add(wMid);
  const wBot = new THREE.Mesh(wingGeo, red); wBot.position.set(0, -0.7, 0.3); group.add(wBot);

  // Vertical struts (follow the wings forward)
  for (const x of [-2.5, 2.5]) {
    const strutTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), wood);
    strutTop.position.set(x, 0.65, 0.4); group.add(strutTop);
    const strutBot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), wood);
    strutBot.position.set(x, -0.25, 0.3); group.add(strutBot);
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

  // Spinning-propeller disc — semi-transparent faint gray, flat perpendicular to nose.
  const propDiscGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.04, 20);
  const propDiscMat = new THREE.MeshBasicMaterial({
    color: 0xdcdcdc, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  const propDisc = new THREE.Mesh(propDiscGeo, propDiscMat);
  propDisc.rotation.x = Math.PI / 2;
  propDisc.position.set(0, 0, 2.12);
  group.add(propDisc);

  // Landing gear: twin wheels on horizontal axle, V-struts to the fuselage.
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 14);
  for (const wx of [-0.6, 0.6]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, -1.15, 0.3);
    group.add(w);
    // Strut from wheel to fuselage underside
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), wood);
    strut.position.set(wx * 0.6, -0.85, 0.3);
    group.add(strut);
  }
  // Axle between wheels
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), wheelMat);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, -1.15, 0.3);
  group.add(axle);

  return group;
}

export function buildCockpit() {
  const group = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xb01a1a });
  const black = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Top-wing sliver: thin red plank pushed high and flat so it only covers the
  // very top of the view (not a wedge of perspective). Gun barrels + muzzle
  // flash moved to the 2D HUD.
  const topWing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.2), red);
  topWing.position.set(0, 0.7, -1.0);
  group.add(topWing);

  // Black iron cross on top wing (small flat box)
  const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.082, 0.08), black);
  cross1.position.set(0, 0.71, -1.0);
  group.add(cross1);
  const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.082, 0.18), black);
  cross2.position.set(0, 0.71, -1.0);
  group.add(cross2);

  return group;
}

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

// Caquot triple-fin observation balloon. Tether hangs ~280m below the basket.
export function buildBalloon() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc7b585 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a2a18 });
  const cable = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  // Gasbag
  const bagGeo = new THREE.SphereGeometry(3.2, 16, 10);
  bagGeo.scale(1, 1, 1.75);
  const bag = new THREE.Mesh(bagGeo, skin);
  group.add(bag);

  // Three tail fins spaced 120° apart
  const finGeo = new THREE.BoxGeometry(0.15, 2.8, 2.2);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(finGeo, skin);
    fin.position.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6 - 0.6, -5.2);
    fin.rotation.z = a + Math.PI / 2;
    group.add(fin);
  }

  // Gondola basket
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.6), dark);
  basket.position.set(0, -4.2, 0);
  group.add(basket);

  // Long tether down to the ground. Length deliberately over-long — the
  // terrain geometry hides whatever hangs below the surface.
  const tetherLen = 280;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, tetherLen, 4), cable);
  c.position.set(0, -4.2 - tetherLen / 2, 0);
  group.add(c);

  return group;
}

// Classic LZ-style rigid airship: tapered body, 4 cruciform fins, twin gondolas,
// black iron cross on the side.
export function buildZeppelin() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xb0a890 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a3024 });
  const black = new THREE.MeshLambertMaterial({ color: 0x101010 });

  // Body — elongated ellipsoid
  const bodyGeo = new THREE.SphereGeometry(6.5, 22, 12);
  bodyGeo.scale(1, 1, 6);
  const body = new THREE.Mesh(bodyGeo, skin);
  group.add(body);

  // 4 cruciform tail fins
  const finGeo = new THREE.BoxGeometry(0.35, 5.5, 5);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const fin = new THREE.Mesh(finGeo, skin);
    fin.position.set(0, 0, -35);
    fin.rotation.z = a;
    group.add(fin);
  }

  // Twin gondolas underneath (fore + aft)
  for (const z of [10, -14]) {
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.8, 3.8), dark);
    gondola.position.set(0, -6.6, z);
    group.add(gondola);
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 2.4), black);
    engine.position.set(0, -8.2, z);
    group.add(engine);
  }

  // Iron cross on the side of the hull (flat crossbars layered on the skin)
  const crossBg = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.15), black);
  crossBg.position.set(0, 1, 6.6);
  crossBg.scale.set(1, 0.35, 1);
  group.add(crossBg);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(3, 0.16, 3), black);
  crossV.position.set(0, 0, 6.6);
  crossV.scale.set(0.33, 1, 1);
  group.add(crossV);

  return group;
}

// Simple scorch-mark pool: flat dark discs laid on the terrain where planes crash.
export function createScorchPool(scene, size = 30) {
  const geo = new THREE.CircleGeometry(8, 20);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x14100a, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false,
  });
  const pool = { slots: [], next: 0 };
  for (let i = 0; i < size; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; // flat on the XZ ground plane
    m.visible = false;
    scene.add(m);
    pool.slots.push(m);
  }
  return pool;
}

export function placeScorch(pool, x, y, z, scale = 1) {
  const m = pool.slots[pool.next];
  pool.next = (pool.next + 1) % pool.slots.length;
  m.visible = true;
  m.position.set(x, y + 0.2, z); // slight lift over terrain to avoid z-fighting
  m.scale.setScalar(scale);
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

const BIPLANE_PALETTES = {
  a:   { body: 0x8b824a, strut: 0x5b4a2a, cockpit: 0x151515, roundel: 0x2a3c8a, nose: 0x8b824a },
  b:   { body: 0x5a6a2a, strut: 0x3a2a18, cockpit: 0x151515, roundel: 0x9a2020, nose: 0x1a1a1a }, // Sopwith-ish olive + black nose
  ace: { body: 0x101010, strut: 0x3a2810, cockpit: 0x1a1a1a, roundel: 0xd4af37, nose: 0xd4af37 }, // black with gold cowl & trim
};

export function buildBiplane({ variant = 'a' } = {}) {
  const group = new THREE.Group();
  const p = BIPLANE_PALETTES[variant] || BIPLANE_PALETTES.a;
  const body = new THREE.MeshLambertMaterial({ color: p.body });
  const strutMat = new THREE.MeshLambertMaterial({ color: p.strut });
  const cockpitMat = new THREE.MeshLambertMaterial({ color: p.cockpit });
  const roundelMat = new THREE.MeshLambertMaterial({ color: p.roundel });
  const noseMat = new THREE.MeshLambertMaterial({ color: p.nose });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  // Fuselage
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 4.2), body);
  group.add(fuselage);

  // Engine cowl / nose (distinct color so variants read at a distance)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.82, 0.5), noseMat);
  nose.position.set(0, 0, 1.9);
  group.add(nose);

  // Cockpit
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.75), cockpitMat);
  cockpit.position.set(0, 0.4, 0.3);
  group.add(cockpit);

  // Two wings: upper and lower — pushed forward over the front half of the fuselage.
  const wingGeo = new THREE.BoxGeometry(5.5, 0.12, 1.0);
  const wTop = new THREE.Mesh(wingGeo, body); wTop.position.set(0, 0.9, 0.5); group.add(wTop);
  const wBot = new THREE.Mesh(wingGeo, body); wBot.position.set(0, -0.55, 0.4); group.add(wBot);

  // Roundel discs on upper wing
  for (const x of [-1.5, 1.5]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), roundelMat);
    disc.position.set(x, 0.97, 0.5);
    group.add(disc);
  }

  // Struts
  for (const x of [-2.2, 2.2]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.07), strutMat);
    strut.position.set(x, 0.2, 0.45);
    group.add(strut);
  }

  // Tail
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.8, 0.7), body);
  tailV.position.set(0, 0.35, -2.2); group.add(tailV);
  const tailH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.6), body);
  tailH.position.set(0, 0.05, -2.2); group.add(tailH);

  // Spinning-propeller disc at the nose.
  const propDiscGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.04, 20);
  const propDiscMat = new THREE.MeshBasicMaterial({
    color: 0xdcdcdc, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  const propDisc = new THREE.Mesh(propDiscGeo, propDiscMat);
  propDisc.rotation.x = Math.PI / 2;
  propDisc.position.set(0, 0, 2.22);
  group.add(propDisc);

  // Landing gear: twin wheels, horizontal axle, struts up to fuselage.
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14);
  for (const wx of [-0.65, 0.65]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, -1.05, 0.4);
    group.add(w);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), strutMat);
    strut.position.set(wx * 0.55, -0.75, 0.4);
    group.add(strut);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), wheelMat);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, -1.05, 0.4);
  group.add(axle);

  return group;
}
