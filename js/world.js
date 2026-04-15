import { WORLD } from './config.js';

// Deterministic value noise (stable per-session via seeded rng)
function hash(x, z) {
  const a = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (a - Math.floor(a)) * 2 - 1;
}

function smoothNoise(x, z) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const fx = x - x0, fz = z - z0;
  const v00 = hash(x0, z0);
  const v10 = hash(x0 + 1, z0);
  const v01 = hash(x0, z0 + 1);
  const v11 = hash(x0 + 1, z0 + 1);
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return a + (b - a) * sz;
}

// Sample a terrain height at world-space (x, z). Exported so future code can place things on the surface.
export function terrainHeight(x, z) {
  return (
    smoothNoise(x * 0.0015, z * 0.0015) * 35 +
    smoothNoise(x * 0.005, z * 0.005) * 12 +
    smoothNoise(x * 0.02, z * 0.02) * 3
  );
}

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

  // Low-poly ground: 50×50 plane, displaced and flat-shaded, one color per triangle.
  // Coarse triangles + hard facets = visible geometric terrain at altitude.
  const groundGeo = new THREE.PlaneGeometry(WORLD.GROUND_SIZE, WORLD.GROUND_SIZE, 50, 50);
  {
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // PlaneGeometry is in XY; becomes XZ after rotation.
      pos.setZ(i, terrainHeight(x, y));
    }
    pos.needsUpdate = true;
  }

  // Split shared vertices so each triangle can carry its own color.
  const flatGeo = groundGeo.toNonIndexed();
  flatGeo.computeVertexNormals();

  // Biome palette: picked by average face height. Jittered within each biome.
  const BIOMES = [
    { max: -12, colors: [0x2b4a1f, 0x324d23, 0x3a5a2a] }, // deep green (valleys)
    { max:   0, colors: [0x446b28, 0x4e7630, 0x5a842f] }, // mid green (grass)
    { max:  12, colors: [0x7a8c42, 0x8a994d, 0x6f8040] }, // olive / fields
    { max:  25, colors: [0x9a7a3c, 0x8c6a30, 0x7e5a24] }, // tan / dirt
    { max:  Infinity, colors: [0x6f5b36, 0x5f4d2a, 0x8f6f48] }, // bare hillside / rocky
  ];
  function pickBiomeColor(faceHeight, seed) {
    for (const b of BIOMES) {
      if (faceHeight < b.max) return b.colors[seed % b.colors.length];
    }
    return 0x888888;
  }

  const triPos = flatGeo.attributes.position;
  const faceColors = new THREE.Float32BufferAttribute(new Float32Array(triPos.count * 3), 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < triPos.count; i += 3) {
    const avgH = (triPos.getZ(i) + triPos.getZ(i + 1) + triPos.getZ(i + 2)) / 3;
    // Deterministic seed from centroid so reloads look the same.
    const cx = triPos.getX(i) + triPos.getX(i + 1) + triPos.getX(i + 2);
    const cy = triPos.getY(i) + triPos.getY(i + 1) + triPos.getY(i + 2);
    const seed = Math.floor(Math.abs(cx * 0.013 + cy * 0.029)) & 0xffff;
    tmp.setHex(pickBiomeColor(avgH, seed));
    for (let k = 0; k < 3; k++) {
      faceColors.setXYZ(i + k, tmp.r, tmp.g, tmp.b);
    }
  }
  flatGeo.setAttribute('color', faceColors);

  const groundMat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    flatShading: true,
    shininess: 0,
    specular: 0x000000,
  });
  const ground = new THREE.Mesh(flatGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = WORLD.GROUND_Y;
  scene.add(ground);

  // Trench line: zig-zag along z=0±30m, x from -2500 to 2500
  const trenchSegmentCount = 30;
  const trenchBoxGeo = new THREE.BoxGeometry(80, 3, 12);
  const trenchMat = new THREE.MeshLambertMaterial({ color: 0x3d2817 });

  for (let i = 0; i < trenchSegmentCount; i++) {
    const progress = i / trenchSegmentCount;
    const x = -2500 + progress * 5000;
    const zOffset = (i % 2 === 0) ? 15 : -15;
    const surfaceHeight = terrainHeight(x, zOffset);
    const y = WORLD.GROUND_Y + surfaceHeight - 1; // Sunken slightly

    const trenchBox = new THREE.Mesh(trenchBoxGeo, trenchMat);
    trenchBox.position.set(x, y, zOffset);
    scene.add(trenchBox);
  }

  // Add small crater discs near the trench
  const craterGeo = new THREE.CylinderGeometry(25, 25, 1, 8);
  const craterMat = new THREE.MeshLambertMaterial({ color: 0x3d2817 });
  for (let i = 0; i < 8; i++) {
    const x = -2000 + Math.random() * 4000;
    const z = -80 + Math.random() * 160;
    const surfaceHeight = terrainHeight(x, z);
    const y = WORLD.GROUND_Y + surfaceHeight;
    const crater = new THREE.Mesh(craterGeo, craterMat);
    crater.position.set(x, y, z);
    scene.add(crater);
  }

  // Forest clumps: shared cone geometry and materials
  const treeGeo = new THREE.ConeGeometry(3, 8, 6);
  const treeMat1 = new THREE.MeshLambertMaterial({ color: 0x2d5028 });
  const treeMat2 = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });

  const clusterCount = 12;
  const treesPerCluster = 25;
  const clusterRadius = 60;
  const mapRadius = 2400;

  for (let c = 0; c < clusterCount; c++) {
    // Pick cluster center (avoid trench corridor z: -50 to +50)
    let centerX, centerZ;
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * mapRadius;
      centerX = Math.cos(angle) * r;
      centerZ = Math.sin(angle) * r;
    } while (centerZ > -50 && centerZ < 50); // Avoid trench

    // Place trees within cluster
    for (let t = 0; t < treesPerCluster; t++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * clusterRadius;
      const treeX = centerX + Math.cos(a) * r;
      const treeZ = centerZ + Math.sin(a) * r;
      const surfaceHeight = terrainHeight(treeX, treeZ);
      const treeY = WORLD.GROUND_Y + surfaceHeight + 4; // Cone half-height is ~4

      const scale = 0.7 + Math.random() * 0.6;
      const mat = Math.random() > 0.5 ? treeMat1 : treeMat2;
      const tree = new THREE.Mesh(treeGeo, mat);
      tree.position.set(treeX, treeY, treeZ);
      tree.scale.set(scale, scale, scale);
      tree.rotation.y = Math.random() * Math.PI * 2;
      scene.add(tree);
    }
  }

  // Distant mountain ring: ~40 low-poly cones at horizon
  const mountainGeo = new THREE.ConeGeometry(220, 450, 5);
  const mountainMat = new THREE.MeshLambertMaterial({ color: 0x5e6872 });

  const mountainCount = 40;
  const mountainRadius = 3500;

  for (let m = 0; m < mountainCount; m++) {
    const angle = (m / mountainCount) * Math.PI * 2;
    const rJitter = mountainRadius + (Math.random() - 0.5) * 400;
    const scaleJitter = 0.85 + Math.random() * 0.3;
    const x = Math.cos(angle) * rJitter;
    const z = Math.sin(angle) * rJitter;

    const mountain = new THREE.Mesh(mountainGeo, mountainMat);
    mountain.position.set(x, WORLD.GROUND_Y + 180, z); // Positioned so peaks show
    mountain.scale.set(scaleJitter, scaleJitter, scaleJitter);
    scene.add(mountain);
  }

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

  return { ground };
}
