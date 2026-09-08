import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEEP_WELL_PASSES, animateDeepWell, createDeepWell } from '../assets/deepWell.js';

const query = new URLSearchParams(window.location.search);
const passId = DEEP_WELL_PASSES.includes(query.get('pass')) ? query.get('pass') : 'optimization-pass';
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
renderer.toneMappingExposure = 1.0;
renderer.domElement.setAttribute('aria-label', 'Deep Well three-dimensional review render');
canvasHost.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6eee3);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(3.55, 2.85, 5.35);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.1, 1.22, 0); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 2.8; controls.maxDistance = 8;
scene.add(new THREE.HemisphereLight(0xfff9ef, 0x7c7162, 1.9));
const key = new THREE.DirectionalLight(0xffddb8, 3.0); key.position.set(-3.5, 5.4, 4.8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -2; scene.add(key);
const fill = new THREE.DirectionalLight(0xdce4e1, 1.0); fill.position.set(4, 2.4, 4); scene.add(fill);
const ground = new THREE.Mesh(new THREE.CircleGeometry(3.1, 64), new THREE.ShadowMaterial({ color: 0x4a4036, opacity: 0.11, transparent: true })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const deepWell = createDeepWell({ passId }); scene.add(deepWell);
function countVisible(root) { let meshes = 0; let triangles = 0; root.traverse((node) => { if (!node.visible || !node.isMesh) return; meshes += 1; triangles += ((node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0) / 3) * (node.isInstancedMesh ? node.count : 1); }); return { meshes, triangles: Math.round(triangles) }; }
function resize() { const width = canvasHost.clientWidth; const height = canvasHost.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); }
resize(); new ResizeObserver(resize).observe(canvasHost);
const start = performance.now();
function frame(now) { if (animate) animateDeepWell(deepWell, (now - start) / 1000, passId === 'interaction-pass' ? 0.8 : 0.32); controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
const stats = countVisible(deepWell);
statsElement.textContent = `${passId} · ${stats.meshes} visible meshes · ${stats.triangles.toLocaleString()} triangles · 2.55 m art-direction height`;
window.__DEEP_WELL_REVIEW_READY__ = true;
window.__DEEP_WELL_REVIEW_STATE__ = { passId, stats, runtime: deepWell.userData.sculptRuntime, rig: deepWell.userData.deepWellRig };
