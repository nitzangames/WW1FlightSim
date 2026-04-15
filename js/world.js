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
