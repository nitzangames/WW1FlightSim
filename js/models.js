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

  return group;
}

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
