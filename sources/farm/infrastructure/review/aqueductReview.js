import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAqueduct } from '../assets/aqueduct.js';

const host = document.querySelector('#canvas-host');
const stats = document.querySelector('#stats');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6eee3);
const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
camera.position.set(6.7, 3.7, 8.4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.92, 0);
controls.enableDamping = true;
controls.enablePan = false;

scene.add(new THREE.HemisphereLight(0xfff9ef, 0x7c7162, 1.9));
const key = new THREE.DirectionalLight(0xffddb8, 3);
key.position.set(-3.5, 5.4, 4.8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdce4e1, 1);
fill.position.set(4, 2.4, 4);
scene.add(fill);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 64),
  new THREE.ShadowMaterial({ color: 0x4a4036, opacity: 0.11, transparent: true }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const aqueduct = createAqueduct();
scene.add(aqueduct);
let meshCount = 0;
let triangleCount = 0;
aqueduct.traverse((node) => {
  if (!node.isMesh) return;
  meshCount += 1;
  triangleCount += (node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0) / 3;
});

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
resize();
new ResizeObserver(resize).observe(host);

function render() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

stats.textContent = `${meshCount} visible meshes · ${Math.round(triangleCount).toLocaleString()} triangles · 4.18 m module span`;
window.__AQUEDUCT_REVIEW_READY__ = true;
window.__AQUEDUCT_REVIEW_STATE__ = {
  stats: { meshes: meshCount, triangles: Math.round(triangleCount) },
  runtime: aqueduct.userData.sculptRuntime,
};
