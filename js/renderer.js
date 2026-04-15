import { CANVAS_W, CANVAS_H, WORLD } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(CANVAS_W, CANVAS_H, false);
  renderer.setClearColor(0x6fa6d6);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfd8e0, WORLD.FOG_NEAR, WORLD.FOG_FAR);

  const camera = new THREE.PerspectiveCamera(75, CANVAS_W / CANVAS_H, 0.5, 5000);

  const sun = new THREE.DirectionalLight(0xfff0d0, 1.0);
  sun.position.set(200, 400, 100);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x556677, 0.6));

  return { renderer, scene, camera };
}
