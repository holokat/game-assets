import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HAND_PUMP_PASSES, animateHandPump, createHandPump } from '../assets/handPump.js';

const query = new URLSearchParams(window.location.search);
const passId = HAND_PUMP_PASSES.includes(query.get('pass')) ? query.get('pass') : 'optimization-pass';
const animate = query.get('animate') !== '0';
const viewId = query.get('view') === 'grazing-close' ? 'grazing-close' : 'reference-three-quarter';
const canvasHost = document.querySelector('#canvas-host');
const passSelect = document.querySelector('#pass-select');
const statsElement = document.querySelector('#stats');

passSelect.value = passId;
passSelect.addEventListener('change', () => {
  query.set('pass', passSelect.value);
  window.location.search = query.toString();
});

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.setAttribute('aria-label', 'Hand Pump three-dimensional review render');
renderer.domElement.setAttribute('role', 'img');
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7f0e6);
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
camera.position.set(1.02, 1.14, 3.05);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.1, 0.56, 0);
if (viewId === 'grazing-close') {
  camera.position.set(-1.25, 0.92, 1.58);
  controls.target.set(-0.02, 0.67, 0);
}
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.25;
controls.maxDistance = 5;

const hemi = new THREE.HemisphereLight(0xfff8e9, 0x7e9389, 2.25);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe8cf, 3.0);
key.position.set(-3.5, 5.2, 4.8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -2;
key.shadow.camera.right = 2;
key.shadow.camera.top = 2;
key.shadow.camera.bottom = -2;
scene.add(key);
const fill = new THREE.DirectionalLight(0xd8eee9, 1.75);
fill.position.set(4.5, 3.2, 3.8);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xf1f4e5, passId === 'lighting-pass' ? 1.35 : 0.8);
rim.position.set(1.5, 4, -4);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.ShadowMaterial({ color: 0x4a4036, opacity: 0.1, transparent: true }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pump = createHandPump({ passId });
pump.rotation.y = 0.06;
scene.add(pump);

function countVisible(root) {
  let meshes = 0;
  let triangles = 0;
  root.traverse((node) => {
    if (!node.visible || !node.isMesh) return;
    meshes += 1;
    const count = node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0;
    triangles += count / 3;
  });
  return { meshes, triangles: Math.round(triangles) };
}

function resize() {
  const width = canvasHost.clientWidth;
  const height = canvasHost.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

resize();
new ResizeObserver(resize).observe(canvasHost);
const start = performance.now();
function frame(now) {
  if (animate && passId === 'interaction-pass') animateHandPump(pump, (now - start) / 1000, 0.7);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const stats = countVisible(pump);
statsElement.textContent = `${passId} · ${stats.meshes} visible meshes · ${stats.triangles.toLocaleString()} triangles · 1.2 m art-direction height`;
window.__HAND_PUMP_REVIEW_READY__ = true;
window.__HAND_PUMP_REVIEW_STATE__ = { passId, viewId, stats, animate, runtime: pump.userData.sculptRuntime };
