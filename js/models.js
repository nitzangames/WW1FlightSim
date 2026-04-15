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

  // Two wings: upper and lower — pushed forward over the front half of the fuselage.
  const wingGeo = new THREE.BoxGeometry(5.5, 0.12, 1.0);
  const wTop = new THREE.Mesh(wingGeo, khaki); wTop.position.set(0, 0.9, 0.5); group.add(wTop);
  const wBot = new THREE.Mesh(wingGeo, khaki); wBot.position.set(0, -0.55, 0.4); group.add(wBot);

  // Roundel discs on upper wing (follow the wing forward)
  for (const x of [-1.5, 1.5]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), roundel);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, 0.97, 0.5);
    group.add(disc);
  }

  // Struts
  for (const x of [-2.2, 2.2]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.07), brown);
    strut.position.set(x, 0.2, 0.45);
    group.add(strut);
  }

  // Tail
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.8, 0.7), khaki);
  tailV.position.set(0, 0.35, -2.2); group.add(tailV);
  const tailH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.6), khaki);
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

  return group;
}
