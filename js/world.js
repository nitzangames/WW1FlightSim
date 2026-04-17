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

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Sample a terrain height at world-space (x, z). Exported so future code can place things on the surface.
// The terrain mesh is a PlaneGeometry rotated -90° on X: its local Y becomes
// world -Z. So terrainHeight(x, z) receives z = -worldZ. The airfield lives at
// worldZ = AIRFIELD_Z, which means terrain-space z = -AIRFIELD_Z.
const _afTerrainZ = -WORLD.AIRFIELD_Z;

// Natural terrain height at the airfield center (precomputed for level blending).
const _afCenterH = (function () {
  const ax = WORLD.AIRFIELD_X, az = _afTerrainZ;
  return smoothNoise(ax * 0.0015, az * 0.0015) * 55 +
         smoothNoise(ax * 0.005, az * 0.005) * 22 +
         smoothNoise(ax * 0.02, az * 0.02) * 5;
})();

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);

  // Flatten the airfield zone to the natural terrain level at its center
  // (not to 0, which would create a pit). Smoothly blend to normal terrain.
  const afx = Math.abs(x - WORLD.AIRFIELD_X);
  const afz = Math.abs(z - _afTerrainZ); // z is -worldZ in terrain coords
  const airfieldBlend = smoothstep(25, 60, afx) * smoothstep(120, 180, afz);

  // Base rolling hills, more pronounced than before.
  const hills =
    smoothNoise(x * 0.0015, z * 0.0015) * 55 +
    smoothNoise(x * 0.005, z * 0.005) * 22 +
    smoothNoise(x * 0.02, z * 0.02) * 5;
  // Edge ramp: terrain climbs into mountain ridges beyond ~1800m from center.
  const edgeBoost = smoothstep(1800, 3000, r) * 380;
  // Extra jaggedness in the mountain band so peaks feel uneven.
  const mountainNoise =
    smoothstep(1600, 3200, r) *
    (smoothNoise(x * 0.004, z * 0.004) * 120 +
     smoothNoise(x * 0.012, z * 0.012) * 45);
  const naturalHeight = hills + edgeBoost + mountainNoise;
  // Blend: at airfield center (blend=0) → flat at AF_CENTER_HEIGHT;
  // at edges (blend=1) → normal naturalHeight.
  return _afCenterH + (naturalHeight - _afCenterH) * airfieldBlend;
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
  const groundGeo = new THREE.PlaneGeometry(WORLD.GROUND_SIZE, WORLD.GROUND_SIZE, 90, 90);
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
    { max:  15, colors: [0x7a8c42, 0x8a994d, 0x6f8040] }, // olive / fields
    { max:  40, colors: [0x9a7a3c, 0x8c6a30, 0x7e5a24] }, // tan / dirt
    { max: 110, colors: [0x6f5b36, 0x5f4d2a, 0x8f6f48] }, // bare hillside
    { max: 220, colors: [0x6a6765, 0x54504d, 0x7a7672] }, // rocky grey
    { max: Infinity, colors: [0xe8e8e8, 0xcfcfcf, 0xdadce0] }, // snow caps
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

  // Forest clumps: shared cone geometry and materials
  const treeGeo = new THREE.ConeGeometry(3, 8, 6);
  const treeMat1 = new THREE.MeshLambertMaterial({ color: 0x2d5028 });
  const treeMat2 = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });

  const clusterCount = 12;
  const treesPerCluster = 25;
  const clusterRadius = 60;
  const mapRadius = 1700; // keep forests in the lowland plain, below the mountain ring

  for (let c = 0; c < clusterCount; c++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * mapRadius;
    const centerX = Math.cos(angle) * r;
    const centerZ = Math.sin(angle) * r;

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

  // Clouds: multi-puff clusters so each cloud has volume, not just a dot.
  // Larger canvas texture with a soft falloff, then 4-6 sprites per cluster
  // at randomised offsets to build a cumulus shape.
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 256; cloudCanvas.height = 256;
  const cctx = cloudCanvas.getContext('2d');
  const cgrad = cctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  cgrad.addColorStop(0, 'rgba(255,255,255,0.92)');
  cgrad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  cgrad.addColorStop(1, 'rgba(255,255,255,0)');
  cctx.fillStyle = cgrad; cctx.fillRect(0, 0, 256, 256);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, fog: true, depthWrite: false });

  const CLOUD_CLUSTERS = 18;
  const PUFFS_PER_CLOUD = 10;
  for (let c = 0; c < CLOUD_CLUSTERS; c++) {
    const ca = Math.random() * Math.PI * 2;
    const cr = 250 + Math.random() * 1400;
    const cx = Math.cos(ca) * cr;
    const cy = 180 + Math.random() * 280;
    const cz = Math.sin(ca) * cr;
    const baseSize = 130 + Math.random() * 100;
    for (let p = 0; p < PUFFS_PER_CLOUD; p++) {
      const s = new THREE.Sprite(cloudMat);
      // Wider horizontal scatter, flatter vertical — cumulus shape.
      const ox = (Math.random() - 0.5) * baseSize * 1.3;
      const oy = (Math.random() - 0.3) * baseSize * 0.3;
      const oz = (Math.random() - 0.5) * baseSize * 1.3;
      s.position.set(cx + ox, cy + oy, cz + oz);
      const puffSize = baseSize * (0.7 + Math.random() * 0.6);
      s.scale.set(puffSize, puffSize * 0.7, puffSize);
      scene.add(s);
    }
  }

  return { ground };
}
