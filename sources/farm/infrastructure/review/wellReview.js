import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WELL_PASSES, animateWell, createWell } from '../assets/well.js';

const query = new URLSearchParams(window.location.search);
const passId = WELL_PASSES.includes(query.get('pass')) ? query.get('pass') : 'optimization-pass';
const animate = query.get('animate') !== '0';
const requestedView = query.get('view');
const viewId = ['front', 'grazing-close'].includes(requestedView) ? requestedView : 'reference-three-quarter';
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
renderer.toneMappingExposure = 1.03;
renderer.domElement.setAttribute('aria-label', 'Well three-dimensional review render');
renderer.domElement.setAttribute('role', 'img');
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6eee3);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(1.65, 2.2, 4.0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.95, 0);
if (viewId === 'front') {
  camera.position.set(0, 2.08, 4.35);
  controls.target.set(0, 0.98, 0);
} else if (viewId === 'grazing-close') {
  camera.position.set(-2.0, 1.72, 2.1);
  controls.target.set(0, 1.02, 0);
}
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.1;
controls.maxDistance = 7;
const hemi = new THREE.HemisphereLight(0xfff9ef, 0x7c7162, 1.9);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffddb8, 3.0);
key.position.set(-3.5, 5.4, 4.8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -3;
key.shadow.camera.right = 3;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -2;
scene.add(key);
const fill = new THREE.DirectionalLight(0xdce4e1, 1.0);
fill.position.set(4, 2.4, 4);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xfff4dd, passId === 'lighting-pass' ? 1.1 : 0.62);
rim.position.set(1.5, 4.5, -4);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.ShadowMaterial({ color: 0x4a4036, opacity: 0.11, transparent: true }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const well = createWell({ passId });
scene.add(well);

function countVisible(root) {
  let meshes = 0;
  let triangles = 0;
  root.traverse((node) => {
    if (!node.visible || !node.isMesh) return;
    meshes += 1;
    const count = node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0;
    triangles += (count / 3) * (node.isInstancedMesh ? node.count : 1);
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
  if (animate && passId === 'interaction-pass') animateWell(well, (now - start) / 1000, 0.7);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const stats = countVisible(well);
statsElement.textContent = `${passId} · ${stats.meshes} visible meshes · ${stats.triangles.toLocaleString()} triangles · 2.2 m art-direction height`;
window.__WELL_REVIEW_READY__ = true;
window.__WELL_REVIEW_STATE__ = { passId, viewId, stats, animate, runtime: well.userData.sculptRuntime, rig: well.userData.wellRig };
