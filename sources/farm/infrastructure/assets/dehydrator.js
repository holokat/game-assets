import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const DEHYDRATOR_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(DEHYDRATOR_PASSES.map((id, index) => [id, index]));
const material = (name, color, roughness = 0.68, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group, minimumPass = 'blockout') => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group, minimumPass);
function box(context, parent, id, size, position, surface, group, minimumPass = 'blockout') { const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group, minimumPass); part.position.set(...position); return part; }
function beam(context, parent, id, start, end, width, depth, surface, group, minimumPass = 'structural-pass') { const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const part = mesh(context, parent, id, new THREE.BoxGeometry(width, a.distanceTo(b), depth), surface, group, minimumPass); part.position.copy(a.clone().add(b).multiplyScalar(0.5)); part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return part; }

export function createDehydrator(options = {}) {
  const passId = DEHYDRATOR_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('dehydrator', { label: 'Dehydrator', targetHeightMetres: 3.05, passId }); const { model } = context;
  const cream = material('dehydrator-grounded-cream-plinth', '#afa38e', 0.9);
  const galvanized = material('dehydrator-pale-galvanized-shell', '#aeb7b5', 0.48, 0.24);
  const teal = material('dehydrator-muted-teal-service-panels', '#587a78', 0.66, 0.05);
  const iron = material('dehydrator-dark-iron-frame-hardware', '#30383a', 0.52, 0.3);
  const trayMetal = material('dehydrator-clean-empty-trays', '#858f8d', 0.4, 0.34);

  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0, 0]);
  const base = addPivot(context, model, 'grounded-base'); const cabinet = addPivot(context, model, 'dehydrator-cabinet'); const trays = addPivot(context, cabinet, 'four-empty-tray-levels'); const exhaust = addPivot(context, cabinet, 'upper-exhaust'); const fan = addPivot(context, cabinet, 'side-fan-housing'); const service = addPivot(context, cabinet, 'control-service-box');
  box(context, base, 'cream-ground-plinth', [1.68, 0.18, 1.36], [0, 0.09, 0], cream, 'foundation');
  box(context, base, 'dark-base-frame', [1.54, 0.18, 1.22], [0, 0.25, 0], iron, 'foundation', 'structural-pass');
  for (const [x, z] of [[-0.66, -0.5], [0.66, -0.5], [-0.66, 0.5], [0.66, 0.5]]) box(context, base, `stable-foot-${x}-${z}`, [0.18, 0.22, 0.18], [x, 0.19, z], iron, 'foundation', 'structural-pass');

  box(context, cabinet, 'rear-galvanized-panel', [1.42, 2.08, 0.1], [0, 1.31, -0.58], galvanized, 'cabinet-shell', 'structural-pass');
  box(context, cabinet, 'left-galvanized-panel', [0.1, 2.08, 1.08], [-0.71, 1.31, -0.02], galvanized, 'cabinet-shell', 'structural-pass');
  box(context, cabinet, 'right-galvanized-panel', [0.1, 2.08, 1.08], [0.71, 1.31, -0.02], galvanized, 'cabinet-shell', 'structural-pass');
  box(context, cabinet, 'dark-interior-back', [1.18, 1.78, 0.06], [0, 1.34, -0.51], iron, 'cabinet-interior', 'form-refinement');
  for (const x of [-0.73, 0.73]) box(context, cabinet, `front-vertical-frame-${x}`, [0.12, 2.2, 0.12], [x, 1.34, 0.6], iron, 'cabinet-frame', 'structural-pass');
  box(context, cabinet, 'front-top-frame', [1.56, 0.12, 0.12], [0, 2.41, 0.6], iron, 'cabinet-frame', 'structural-pass');
  box(context, cabinet, 'front-bottom-frame', [1.56, 0.12, 0.12], [0, 0.35, 0.6], iron, 'cabinet-frame', 'structural-pass');
  for (const [x, z] of [[-0.72, -0.57], [0.72, -0.57], [-0.72, 0.57], [0.72, 0.57]]) box(context, cabinet, `corner-post-${x}-${z}`, [0.1, 2.18, 0.1], [x, 1.34, z], iron, 'cabinet-frame', 'structural-pass');

  const hood = mesh(context, cabinet, 'faceted-exhaust-hood', new THREE.ConeGeometry(1.02, 0.46, 4), galvanized, 'exhaust-hood', 'form-refinement'); hood.position.set(0, 2.64, 0); hood.rotation.y = Math.PI / 4; hood.scale.z = 0.82;
  box(context, exhaust, 'exhaust-stack-core', [0.5, 0.36, 0.42], [0, 2.95, 0], iron, 'upper-exhaust', 'form-refinement');
  for (const y of [2.84, 2.95, 3.06]) { box(context, exhaust, `front-exhaust-slat-${y}`, [0.46, 0.055, 0.06], [0, y, 0.24], galvanized, 'upper-exhaust', 'surface-pass'); box(context, exhaust, `rear-exhaust-slat-${y}`, [0.46, 0.055, 0.06], [0, y, -0.24], galvanized, 'upper-exhaust', 'surface-pass'); }
  box(context, exhaust, 'exhaust-rain-cap', [0.64, 0.1, 0.56], [0, 3.17, 0], iron, 'upper-exhaust', 'surface-pass');

  for (const [index, y] of [0.62, 1.02, 1.42, 1.82].entries()) { box(context, trays, `empty-tray-${index + 1}`, [1.18, 0.07, 0.88], [0, y, 0.03], trayMetal, 'empty-trays', 'form-refinement'); box(context, trays, `tray-front-lip-${index + 1}`, [1.22, 0.12, 0.07], [0, y + 0.03, 0.49], iron, 'empty-trays', 'surface-pass'); for (const x of [-0.56, 0.56]) box(context, trays, `tray-guide-${index + 1}-${x}`, [0.05, 0.06, 0.92], [x, y + 0.01, 0], iron, 'tray-guides', 'structural-pass'); }

  const door = addPivot(context, cabinet, 'hinged-front-door', [0.7, 0.39, 0.66]);
  box(context, door, 'teal-front-door-panel', [1.34, 1.98, 0.1], [-0.67, 0.99, 0], teal, 'front-door', 'structural-pass');
  for (const x of [-1.27, -0.07]) box(context, door, `door-vertical-edge-${x}`, [0.08, 2.02, 0.14], [x, 1.0, 0], iron, 'door-hardware', 'surface-pass');
  for (const y of [0.16, 1.82]) box(context, door, `door-horizontal-edge-${y}`, [1.3, 0.08, 0.14], [-0.67, y, 0], iron, 'door-hardware', 'surface-pass');
  box(context, door, 'door-handle', [0.1, 0.34, 0.12], [-1.17, 1.02, 0.1], iron, 'door-hardware', 'interaction-pass');
  door.userData.attachment = { parentId: 'dehydrator-cabinet', parentSocket: 'front-door-hinge', localStart: [0.7, 0.39, 0.66], localEnd: [0.7, 2.37, 0.66], contactType: 'hinge', overlap: 0.025, gapTolerance: 0.005, evidenceRefs: ['dehydrator concept: single front cabinet door'] }; addChannel(context, door, 'rotation', 'y', 1.15, 0.56, 0);

  const fanBody = mesh(context, fan, 'side-fan-housing-body', new THREE.CylinderGeometry(0.39, 0.39, 0.26, 12), teal, 'fan-housing', 'form-refinement'); fanBody.position.set(-0.87, 1.28, -0.06); fanBody.rotation.z = Math.PI / 2;
  const fanGuard = mesh(context, fan, 'fan-guard-ring', new THREE.TorusGeometry(0.29, 0.035, 6, 12), iron, 'fan-housing', 'surface-pass'); fanGuard.position.set(-1.02, 1.28, -0.06); fanGuard.rotation.y = Math.PI / 2;
  const fanHub = mesh(context, fan, 'fan-hub', new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), iron, 'fan-housing', 'surface-pass'); fanHub.position.set(-1.05, 1.28, -0.06); fanHub.rotation.z = Math.PI / 2;
  for (let index = 0; index < 6; index += 1) { const angle = index * Math.PI / 3; beam(context, fan, `fan-spoke-${index + 1}`, [-1.055, 1.28, -0.06], [-1.055, 1.28 + Math.cos(angle) * 0.26, -0.06 + Math.sin(angle) * 0.26], 0.025, 0.025, iron, 'fan-housing', 'surface-pass'); }
  box(context, fan, 'fan-support-shelf', [0.5, 0.08, 0.78], [-0.92, 0.86, -0.06], iron, 'fan-housing', 'structural-pass');
  box(context, service, 'teal-control-box', [0.2, 0.46, 0.34], [0.84, 1.42, -0.18], teal, 'control-service', 'form-refinement');
  box(context, service, 'control-box-face', [0.06, 0.34, 0.24], [0.96, 1.42, -0.18], iron, 'control-service', 'surface-pass');
  const controlKnob = mesh(context, service, 'control-knob', new THREE.CylinderGeometry(0.055, 0.055, 0.06, 8), trayMetal, 'control-service', 'interaction-pass'); controlKnob.position.set(1.01, 1.34, -0.18); controlKnob.rotation.z = Math.PI / 2;

  addSocket(context, trays, 'loading', [0, 1.15, 0.84]); addSocket(context, trays, 'dried-product-output', [0, 0.65, 0.84]); addSocket(context, exhaust, 'exhaust', [0, 3.24, 0]); addSocket(context, fan, 'airflow', [-1.15, 1.28, -0.06]); addSocket(context, service, 'power', [1.08, 1.42, -0.18]); addSocket(context, door, 'service', [-1.18, 1.02, 0.2]); addSocket(context, cabinet, 'attachment', [0, 3.25, 0]); addSocket(context, cabinet, 'adjacency-left', [-1.35, 0.1, 0]); addSocket(context, cabinet, 'adjacency-right', [1.35, 0.1, 0]); addSocket(context, cabinet, 'adjacency-front', [0, 0.1, 1.3]);
  addCollider(context, base, 'grounded-base', 'box', [0, 0.18, 0], { width: 1.7, height: 0.36, depth: 1.38, isTrigger: false }); addCollider(context, cabinet, 'cabinet', 'box', [0, 1.55, 0], { width: 1.5, height: 2.5, depth: 1.22, isTrigger: false }); addCollider(context, trays, 'tray-stack', 'box', [0, 1.22, 0.03], { width: 1.22, height: 1.7, depth: 0.92, isTrigger: false }); addCollider(context, door, 'front-door', 'box', [-0.67, 0.99, 0], { width: 1.38, height: 2.02, depth: 0.14, isTrigger: false }); addCollider(context, fan, 'fan-housing', 'cylinder', [-0.92, 1.28, -0.06], { radius: 0.42, height: 0.34, axis: 'x', isTrigger: false }); addCollider(context, service, 'control-box', 'box', [0.84, 1.42, -0.18], { width: 0.24, height: 0.5, depth: 0.38, isTrigger: false }); addCollider(context, cabinet, 'loading-service-zone', 'box', [0, 1.1, 0.92], { width: 1.5, height: 1.8, depth: 0.55, isTrigger: true });
  const root = finishAsset(context); root.userData.artDirection = { concept: 'references/concepts/dehydrator.png', identity: ['lean galvanized cabinet chamber', 'four empty tray levels', 'upper vented exhaust', 'side fan housing', 'muted teal hinged door and control box'], motion: 'Only the visibly hinged front door rotates.', correctionPasses: 0 }; root.userData.qualityContract = { suitability: 'pass', approximation: 'stylized low-poly real-time asset', criticalFeatures: ['lean cabinet silhouette', 'exactly four empty tray levels', 'upper exhaust', 'side fan', 'single hinged door'], triangleBudget: 5000, optimizedDrawRange: [4, 6] }; Object.defineProperty(root.userData, 'dehydratorRig', { value: { base, cabinet, trays, exhaust, fan, service, door }, enumerable: false, configurable: true }); root.userData.applyPassState = (nextPassId) => applyDehydratorPassState(root, nextPassId); applyDehydratorPassState(root, passId); return root;
}

export function applyDehydratorPassState(root, passId = 'optimization-pass') { const selectedPass = DEHYDRATOR_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime; const blockout = runtime.nodes['dehydrator-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'dehydrator-blockout-mat', color: '#a49d92', roughness: 0.94, flatShading: true }); root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockout : node.userData.authoredMaterial; }); return root; }
export function animateDehydrator(root, timeSeconds) { const door = root?.userData?.dehydratorRig?.door; const channel = root?.userData?.sculptRuntime?.animationChannels?.[0]; if (!door || !channel) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0; door.rotation.y = channel.baseValue + Math.max(0, Math.sin(time * channel.frequency + channel.phase)) * channel.amplitude; return root; }
