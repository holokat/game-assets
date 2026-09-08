import * as THREE from 'three';
import {
  addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const QUARANTINE_PEN_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);
const PASS_INDEX = new Map(QUARANTINE_PEN_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
}
function makeMaterials() {
  return {
    curb: material('quarantine-pen-tan-drainage-curb-mat', '#9c8060', 0.96),
    floor: material('quarantine-pen-dry-floor-mat', '#b29772', 0.98),
    timber: material('quarantine-pen-weathered-timber-mat', '#67503a', 0.9),
    iron: material('quarantine-pen-galvanized-iron-mat', '#596161', 0.68, 0.38),
    warning: material('quarantine-pen-status-red-mat', '#a9382f', 0.72, 0.08),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass);
}
function fenceSpan(context, parent, id, axis, fixed, start, end) {
  const length = Math.abs(end - start); const center = (start + end) / 2;
  for (const [index, y] of [0.55, 1.02, 1.49].entries()) {
    const rail = mesh(context, parent, `${id}-rail-${index + 1}`, axis === 'x' ? box(length, 0.075, 0.075) : box(0.075, 0.075, length), context.materials.iron, 'fence-rails', 'structural-pass');
    rail.position.set(axis === 'x' ? center : fixed, y, axis === 'x' ? fixed : center);
  }
}

export function createQuarantinePen(options = {}) {
  const passId = QUARANTINE_PEN_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('quarantine-pen', { label: 'Quarantine Pen', targetHeightMetres: 2.18, passId });
  context.materials = makeMaterials(); const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.05, 0]);
  addSocket(context, model, 'livestock-entry', [0, 0.14, 2.78]);
  addSocket(context, model, 'isolation-center', [0, 0.24, 0]);
  addSocket(context, model, 'inspection-shelter', [0, 0.24, -1.55]);
  addSocket(context, model, 'watering', [-2.2, 0.42, 0.15]);
  addSocket(context, model, 'wash-service', [0.82, 0.14, 2.55]);
  addSocket(context, model, 'drain-out', [1.48, 0.08, 2.78]);
  addSocket(context, model, 'status-control', [0.9, 1.86, 2.18]);
  addSocket(context, model, 'attachment', [2.72, 0.16, 0]);
  addSocket(context, model, 'adjacency-left', [-3.24, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [3.24, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 2.95]);
  addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.52]);

  const base = addPivot(context, model, 'isolation-base');
  const curb = mesh(context, base, 'drainage-curb', box(6.1, 0.18, 4.55), context.materials.curb, 'foundation'); curb.position.y = 0.09;
  const floor = mesh(context, base, 'dry-pen-floor', box(5.78, 0.08, 4.23), context.materials.floor, 'floor'); floor.position.y = 0.22;
  const servicePad = mesh(context, base, 'front-service-pad', box(2.15, 0.12, 0.78), context.materials.curb, 'service'); servicePad.position.set(0.45, 0.06, 2.62);
  const drain = mesh(context, base, 'wash-drain-grate', box(0.72, 0.055, 0.52), context.materials.iron, 'service', 'surface-pass'); drain.position.set(0.9, 0.15, 2.62);
  addCollider(context, base, 'pen-ground', 'box', [0, 0.12, 0], { width: 6.1, height: 0.24, depth: 4.55, isTrigger: false });

  const fence = addPivot(context, model, 'isolation-fence');
  for (const [id, x, z] of [
    ['front-left', -2.95, 2.1], ['front-gate-left', -0.78, 2.1], ['front-gate-right', 0.78, 2.1], ['front-right', 2.95, 2.1],
    ['rear-left', -2.95, -2.1], ['rear-mid', 0, -2.1], ['rear-right', 2.95, -2.1], ['left-mid', -2.95, 0], ['right-mid', 2.95, 0],
  ]) {
    const post = mesh(context, fence, `${id}-post`, box(0.13, 1.72, 0.13), context.materials.iron, 'fence-posts', 'structural-pass'); post.position.set(x, 0.86, z);
  }
  fenceSpan(context, fence, 'front-left', 'x', 2.1, -2.95, -0.78);
  fenceSpan(context, fence, 'front-right', 'x', 2.1, 0.78, 2.95);
  fenceSpan(context, fence, 'rear-left', 'x', -2.1, -2.95, 0);
  fenceSpan(context, fence, 'rear-right', 'x', -2.1, 0, 2.95);
  fenceSpan(context, fence, 'left-front', 'z', -2.95, 0, 2.1);
  fenceSpan(context, fence, 'left-rear', 'z', -2.95, -2.1, 0);
  fenceSpan(context, fence, 'right-front', 'z', 2.95, 0, 2.1);
  fenceSpan(context, fence, 'right-rear', 'z', 2.95, -2.1, 0);
  addCollider(context, fence, 'perimeter-fence', 'box', [0, 0.88, 0], { width: 6, height: 1.76, depth: 4.3, hollow: true, isTrigger: false });

  const shelter = addPivot(context, model, 'inspection-shelter');
  for (const [id, x, z] of [['left-front', -2.5, -1.02], ['right-front', 2.5, -1.02], ['left-rear', -2.5, -1.96], ['right-rear', 2.5, -1.96]]) {
    const post = mesh(context, shelter, `${id}-post`, box(0.13, 1.82, 0.13), context.materials.timber, 'shelter-frame', 'structural-pass'); post.position.set(x, 1.12, z);
  }
  const rearPanel = mesh(context, shelter, 'rear-inspection-panel', box(4.95, 1.15, 0.11), context.materials.timber, 'shelter-frame', 'form-refinement'); rearPanel.position.set(0, 0.92, -1.94);
  const roof = mesh(context, shelter, 'slender-shelter-roof', box(5.35, 0.12, 1.3), context.materials.iron, 'shelter-roof', 'structural-pass'); roof.position.set(0, 2.07, -1.52); roof.rotation.z = -0.035;
  addCollider(context, shelter, 'inspection-shelter', 'box', [0, 1.1, -1.55], { width: 5.2, height: 2.2, depth: 1.2, isTrigger: false });

  const gate = addPivot(context, model, 'entry-gate', [-0.7, 0.24, 2.12]);
  for (const [id, width, height, x, y] of [['hinge', 0.09, 1.38, 0.045, 0.69], ['latch', 0.09, 1.38, 1.355, 0.69], ['top', 1.4, 0.09, 0.7, 1.335], ['bottom', 1.4, 0.09, 0.7, 0.045]]) {
    const part = mesh(context, gate, `gate-${id}`, box(width, height, 0.09), context.materials.iron, 'entry-gate', 'structural-pass'); part.position.set(x, y, 0);
  }
  for (const [index, y] of [0.38, 0.72, 1.06].entries()) { const rail = mesh(context, gate, `gate-rail-${index + 1}`, box(1.22, 0.07, 0.07), context.materials.iron, 'entry-gate', 'structural-pass'); rail.position.set(0.7, y, 0); }
  addChannel(context, gate, 'rotation', 'y', 1.04, 0.72, 0);
  addSocket(context, gate, 'gate-control', [1.35, 0.78, 0.14]);
  addCollider(context, gate, 'entry-gate', 'box', [0.7, 0.69, 0], { width: 1.43, height: 1.4, depth: 0.14, isTrigger: false });

  const utilities = addPivot(context, model, 'quarantine-utilities');
  const trough = mesh(context, utilities, 'separated-water-trough', box(1.35, 0.36, 0.5), context.materials.iron, 'water'); trough.position.set(-2.15, 0.43, 0.15);
  const troughInset = mesh(context, utilities, 'water-trough-inset', box(1.12, 0.07, 0.3), context.materials.floor, 'water', 'surface-pass'); troughInset.position.set(-2.15, 0.64, 0.15);
  for (const x of [-2.7, -1.6]) { const foot = mesh(context, utilities, `trough-foot-${x}`, box(0.12, 0.34, 0.42), context.materials.timber, 'water', 'structural-pass'); foot.position.set(x, 0.29, 0.15); }
  const lampPost = mesh(context, utilities, 'status-lamp-post', box(0.1, 1.52, 0.1), context.materials.timber, 'warning'); lampPost.position.set(0.9, 1.05, 2.16);
  const lamp = mesh(context, utilities, 'red-status-lamp', new THREE.CylinderGeometry(0.09, 0.12, 0.22, 6), context.materials.warning, 'warning', 'interaction-pass'); lamp.position.set(0.9, 1.88, 2.16);
  addCollider(context, utilities, 'water-and-service-fixtures', 'box', [-0.8, 0.42, 1.2], { width: 4.2, height: 0.84, depth: 2.3, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.18,
    note: 'Lean low-poly Quarantine Pen reconstructed from the generated four-view concept sheet.',
    palette: ['tan drainage curb', 'dry pen floor', 'weathered timber', 'galvanized iron', 'restrained red status cue'],
    motion: 'Only the front entry gate rotates.',
  };
  root.userData.quarantinePenRig = { base, fence, shelter, gate, utilities };
  root.userData.applyPassState = (nextPassId) => applyQuarantinePenPassState(root, nextPassId);
  applyQuarantinePenPassState(root, passId); return root;
}

export function applyQuarantinePenPassState(root, passId = 'optimization-pass') {
  const selectedPass = QUARANTINE_PEN_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['quarantine-pen-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'quarantine-pen-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass;
  root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; });
  return root;
}

export function animateQuarantinePen(root, timeSeconds, intensity = 1) {
  const gate = root?.userData?.quarantinePenRig?.gate; if (!gate) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0; gate.rotation.y = Math.sin(time * 0.72) * 1.04 * Math.max(0, intensity); return root;
}
