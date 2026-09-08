import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CISTERN_PASSES, animateCistern, createCistern } from '../assets/cistern.js';

const query = new URLSearchParams(window.location.search);
const passId = CISTERN_PASSES.includes(query.get('pass')) ? query.get('pass') : 'optimization-pass';
const animate = query.get('animate') !== '0';
const canvasHost = document.querySelector('#canvas-host');
const passSelect = document.querySelector('#pass-select');
const statsElement = document.querySelector('#stats');
passSelect.value = passId;
passSelect.addEventListener('change', () => { query.set('pass', passSelect.value); window.location.search = query.toString(); });

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
canvasHost.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6eee3);
const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
camera.position.set(6.25, 4.45, 6.65);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.02, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4.5;
controls.maxDistance = 11;
scene.add(new THREE.HemisphereLight(0xfff9ef, 0x6e7774, 1.85));
const key = new THREE.DirectionalLight(0xffe4c6, 2.85);
key.position.set(-4.5, 6, 4.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -3;
scene.add(key);
const fill = new THREE.DirectionalLight(0xddebea, 1.12); fill.position.set(4, 3, 4); scene.add(fill);
const rim = new THREE.DirectionalLight(0xfff3db, passId === 'lighting-pass' ? 1.12 : 0.68); rim.position.set(1.5, 4.2, -4); scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.ShadowMaterial({ color: 0x4a4036, opacity: 0.11, transparent: true }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const cistern = createCistern({ passId }); scene.add(cistern);

function countVisible(root) {
  let meshes = 0; let triangles = 0;
  root.traverse((node) => { if (node.visible && node.isMesh) { meshes += 1; triangles += (node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0) / 3; } });
  return { meshes, triangles: Math.round(triangles) };
}
function resize() { const width = canvasHost.clientWidth; const height = canvasHost.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); }
resize(); new ResizeObserver(resize).observe(canvasHost);
const start = performance.now();
function frame(now) { if (animate && passId === 'interaction-pass') animateCistern(cistern, (now - start) / 1000, 0.9); controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
const stats = countVisible(cistern);
statsElement.textContent = `${passId} · ${stats.meshes} meshes · ${stats.triangles.toLocaleString()} triangles · 2.18 m art-direction height`;
window.__CISTERN_REVIEW_READY__ = true;
window.__CISTERN_REVIEW_STATE__ = { passId, stats, animate, rig: cistern.userData.cisternRig, runtime: cistern.userData.sculptRuntime };
