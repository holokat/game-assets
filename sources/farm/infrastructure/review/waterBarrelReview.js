import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WATER_BARREL_PASSES, animateWaterBarrel, createWaterBarrel } from '../assets/waterBarrel.js';

const query = new URLSearchParams(window.location.search);
const passId = WATER_BARREL_PASSES.includes(query.get('pass')) ? query.get('pass') : 'optimization';
const animate = query.get('animate') !== '0';
const view = query.get('view') === 'top-three-quarter' ? 'top-three-quarter' : 'review-three-quarter';
const canvasHost = document.querySelector('#canvas-host'); const passSelect = document.querySelector('#pass-select'); const statsElement = document.querySelector('#stats');
passSelect.value = passId; passSelect.addEventListener('change', () => { query.set('pass', passSelect.value); window.location.search = query.toString(); });
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', 'Water Barrel three-dimensional review render'); canvasHost.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf7f0e6);
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100); camera.position.set(1.15, 1.15, 2.85);
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0.57, 0); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1.1; controls.maxDistance = 4.5;
if (view === 'top-three-quarter') { camera.position.set(1.02, 1.56, 2.38); controls.target.set(0, 0.64, 0); }
scene.add(new THREE.HemisphereLight(0xfff8e9, 0x7e9389, 2.2));
const key = new THREE.DirectionalLight(0xffe8cf, 3); key.position.set(-3.5, 5.2, 4.8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 2; key.shadow.camera.bottom = -2; scene.add(key);
const fill = new THREE.DirectionalLight(0xd8eee9, 1.7); fill.position.set(4.5, 3.2, 3.8); scene.add(fill);
const rim = new THREE.DirectionalLight(0xf1f4e5, 0.85); rim.position.set(1.5, 4, -4); scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(2.1, 64), new THREE.ShadowMaterial({ color: 0x4a4036, opacity: 0.1, transparent: true })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const barrel = createWaterBarrel({ passId }); barrel.rotation.y = 0.12; scene.add(barrel);
function visibleStats(root) { let meshes = 0; let triangles = 0; root.traverse((node) => { if (!node.visible || !node.isMesh) return; meshes += 1; triangles += (node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0) / 3; }); return { meshes, triangles: Math.round(triangles) }; }
function resize() { const width = canvasHost.clientWidth; const height = canvasHost.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); }
resize(); new ResizeObserver(resize).observe(canvasHost); const start = performance.now();
function frame(now) { if (animate && passId === 'interaction') animateWaterBarrel(barrel, (now - start) / 1000, 0.75); controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame); }
requestAnimationFrame(frame); const stats = visibleStats(barrel); statsElement.textContent = `${passId} · ${stats.meshes} visible meshes · ${stats.triangles.toLocaleString()} triangles · 1.15 m art-direction height`; window.__WATER_BARREL_REVIEW_READY__ = true; window.__WATER_BARREL_REVIEW_STATE__ = { passId, view, stats, animate, runtime: barrel.userData.sculptRuntime };
