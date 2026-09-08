import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIrrigationDitch } from '../assets/irrigationDitch.js';

const host = document.querySelector('#canvas-host');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6eee3);
const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
camera.position.set(2.35, 1.55, 3.4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.14, 0);
controls.enableDamping = true;
controls.enablePan = false;
scene.add(new THREE.HemisphereLight(0xfff9ef, 0x81796e, 2));
const key = new THREE.DirectionalLight(0xffe3c3, 2.8);
key.position.set(-3.5, 5.2, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -3;
key.shadow.camera.right = 3;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -2;
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe8e3, 1.15);
fill.position.set(4, 2.6, 4);
scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.ShadowMaterial({ color: 0x4a4036, opacity: 0.08, transparent: true }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const ditch = createIrrigationDitch({ passId: 'optimization-pass' });
scene.add(ditch);
let meshes = 0;
let triangles = 0;
ditch.traverse((node) => {
  if (!node.visible || !node.isMesh) return;
  meshes += 1;
  triangles += (node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0) / 3;
});
const stats = { meshes, triangles: Math.round(triangles) };
document.querySelector('#stats').textContent = `${meshes} meshes · ${stats.triangles.toLocaleString()} triangles · 3.2 m modular length`;
function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}
resize();
new ResizeObserver(resize).observe(host);
function frame() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__IRRIGATION_DITCH_REVIEW_READY__ = true;
window.__IRRIGATION_DITCH_REVIEW_STATE__ = { stats, runtime: ditch.userData.sculptRuntime };
