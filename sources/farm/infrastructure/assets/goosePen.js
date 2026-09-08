import * as THREE from 'three';
import {
  addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const GOOSE_PEN_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);
const PASS_INDEX = new Map(GOOSE_PEN_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
}
function makeMaterials() {
  return {
    earth: material('goose-pen-compacted-earth-mat', '#9a754e', 0.98),
    timber: material('goose-pen-weathered-timber-mat', '#765032', 0.9),
    iron: material('goose-pen-dark-wire-iron-mat', '#353a3b', 0.6, 0.5),
    roof: material('goose-pen-galvanized-canopy-mat', '#899397', 0.7, 0.4),
    fixture: material('goose-pen-blue-grey-fixture-mat', '#5e7476', 0.82, 0.12),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass);
}
function addBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return beam;
}

function addFencePanel(context, parent, id, startX, endX, z, alongX = true) {
  const span = Math.abs(endX - startX);
  const center = (startX + endX) / 2;
  for (const [index, y] of [0.28, 0.74, 1.2].entries()) {
    const rail = mesh(context, parent, `${id}-rail-${index + 1}`, alongX ? box(span, 0.1, 0.1) : box(0.1, 0.1, span), context.materials.timber, 'fence-rails', 'structural-pass');
    rail.position.set(alongX ? center : z, y, alongX ? z : center);
  }
  for (let index = 1; index <= 5; index += 1) {
    const t = index / 6;
    const wire = mesh(context, parent, `${id}-wire-${index}`, box(0.025, 0.84, 0.025), context.materials.iron, 'wire-infill', 'surface-pass');
    wire.position.set(alongX ? THREE.MathUtils.lerp(startX, endX, t) : z, 0.74, alongX ? z : THREE.MathUtils.lerp(startX, endX, t));
  }
}

export function createGoosePen(options = {}) {
  const passId = GOOSE_PEN_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('goose-pen', { label: 'Goose Pen', targetHeightMetres: 1.72, passId });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'animal-entry', [0, 0.1, 2.08]);
  addSocket(context, model, 'loading', [0, 0.1, 2.32]);
  addSocket(context, model, 'feeding', [1.35, 0.18, 0.55]);
  addSocket(context, model, 'watering', [0.35, 0.28, -1.36]);
  addSocket(context, model, 'shelter', [-1.45, 0.2, -1.35]);
  addSocket(context, model, 'service', [1.95, 0.18, 0]);
  addSocket(context, model, 'roof-attachment', [-1.45, 1.7, -1.35]);
  addSocket(context, model, 'adjacency-left', [-2.45, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [2.45, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 2.22]);
  addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.22]);

  const floor = addPivot(context, model, 'pen-floor');
  const floorMesh = mesh(context, floor, 'compacted-earth-floor', box(4.6, 0.1, 4.0), context.materials.earth, 'pen-floor');
  floorMesh.position.y = 0.05;
  addCollider(context, floor, 'pen-floor', 'box', [0, 0.05, 0], { width: 4.6, height: 0.1, depth: 4, isTrigger: false });

  const fence = addPivot(context, model, 'tall-perimeter-fence');
  for (const [id, x, z] of [
    ['front-left', -2.25, 1.95], ['gate-left', -0.7, 1.95], ['gate-right', 0.7, 1.95], ['front-right', 2.25, 1.95],
    ['rear-left', -2.25, -1.95], ['rear-center', 0, -1.95], ['rear-right', 2.25, -1.95],
    ['left-center', -2.25, 0], ['right-center', 2.25, 0],
  ]) {
    const post = mesh(context, fence, `${id}-fence-post`, box(0.14, 1.42, 0.14), context.materials.timber, 'fence-posts', 'structural-pass');
    post.position.set(x, 0.71, z);
    const foot = mesh(context, fence, `${id}-post-foot`, box(0.22, 0.16, 0.22), context.materials.iron, 'fence-hardware', 'surface-pass');
    foot.position.set(x, 0.08, z);
  }
  addFencePanel(context, fence, 'front-left', -2.25, -0.7, 1.95, true);
  addFencePanel(context, fence, 'front-right', 0.7, 2.25, 1.95, true);
  addFencePanel(context, fence, 'rear', -2.25, 2.25, -1.95, true);
  addFencePanel(context, fence, 'left', -1.95, 1.95, -2.25, false);
  addFencePanel(context, fence, 'right', -1.95, 1.95, 2.25, false);
  addCollider(context, fence, 'perimeter-fence', 'box', [0, 0.72, 0], { width: 4.64, height: 1.44, depth: 4.04, isTrigger: false, hollow: true });

  const gate = addPivot(context, model, 'broad-front-gate', [-0.66, 0.08, 1.96]);
  for (const [id, width, height, x, y] of [
    ['left', 0.11, 1.22, 0.055, 0.61], ['right', 0.11, 1.22, 1.265, 0.61],
    ['top', 1.32, 0.11, 0.66, 1.165], ['bottom', 1.32, 0.11, 0.66, 0.055],
  ]) {
    const frame = mesh(context, gate, `gate-${id}-frame`, box(width, height, 0.11), context.materials.timber, 'front-gate', 'structural-pass');
    frame.position.set(x, y, 0);
  }
  addBeam(context, gate, 'gate-diagonal-brace', [0.1, 0.16, 0], [1.22, 1.06, 0], 0.09, 0.09, context.materials.timber, 'front-gate', 'structural-pass');
  for (const x of [0.3, 0.52, 0.74, 0.96]) {
    const wire = mesh(context, gate, `gate-wire-${x}`, box(0.025, 0.86, 0.025), context.materials.iron, 'front-gate', 'surface-pass');
    wire.position.set(x, 0.61, -0.02);
  }
  const latch = mesh(context, gate, 'gate-latch', box(0.24, 0.1, 0.12), context.materials.iron, 'front-gate', 'interaction-pass');
  latch.position.set(1.22, 0.72, 0.1);
  addChannel(context, gate, 'rotation', 'y', 1.08, 0.65, 0);
  addSocket(context, gate, 'gate-control', [1.22, 0.72, 0.16]);
  addCollider(context, gate, 'front-gate', 'box', [0.66, 0.61, 0], { width: 1.34, height: 1.24, depth: 0.16, isTrigger: false });

  const shelter = addPivot(context, model, 'sheltered-rear-corner');
  const backWall = mesh(context, shelter, 'shelter-back-wall', box(1.65, 1.12, 0.14), context.materials.timber, 'corner-shelter', 'structural-pass');
  backWall.position.set(-1.38, 0.62, -1.82);
  const sideWall = mesh(context, shelter, 'shelter-side-wall', box(0.14, 1.12, 1.35), context.materials.timber, 'corner-shelter', 'structural-pass');
  sideWall.position.set(-2.12, 0.62, -1.28);
  const canopy = mesh(context, shelter, 'shelter-canopy', box(1.85, 0.12, 1.55), context.materials.roof, 'corner-shelter', 'form-refinement');
  canopy.position.set(-1.38, 1.42, -1.3);
  canopy.rotation.x = -0.16;
  addCollider(context, shelter, 'corner-shelter', 'box', [-1.4, 0.78, -1.4], { width: 1.85, height: 1.56, depth: 1.55, isTrigger: false });

  const fixtures = addPivot(context, model, 'feeding-water-fixtures');
  const trough = mesh(context, fixtures, 'long-water-trough', box(1.5, 0.28, 0.48), context.materials.fixture, 'water-trough', 'form-refinement');
  trough.position.set(0.35, 0.26, -1.36);
  const troughInset = mesh(context, fixtures, 'water-trough-inset', box(1.3, 0.08, 0.3), context.materials.iron, 'water-trough', 'surface-pass');
  troughInset.position.set(0.35, 0.43, -1.36);
  const feedPan = mesh(context, fixtures, 'shallow-feed-pan', new THREE.CylinderGeometry(0.42, 0.5, 0.16, 8), context.materials.fixture, 'feed-pan', 'form-refinement');
  feedPan.position.set(1.35, 0.18, 0.55);
  addCollider(context, fixtures, 'feeding-water-fixtures', 'box', [0.72, 0.28, -0.45], { width: 2.4, height: 0.56, depth: 2.2, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 1.72,
    note: 'Lean stylized low-poly Goose Pen reconstructed from the generated four-view concept sheet.',
    fenceRailCount: 3,
    palette: ['compacted earth', 'weathered timber', 'dark wire iron', 'galvanized canopy', 'blue-grey fixtures'],
    motion: 'Only the broad front gate rotates on its visible hinge side.',
  };
  root.userData.goosePenRig = { floor, fence, gate, shelter, fixtures };
  root.userData.applyPassState = (nextPassId) => applyGoosePenPassState(root, nextPassId);
  applyGoosePenPassState(root, passId);
  return root;
}

export function applyGoosePenPassState(root, passId = 'optimization-pass') {
  const selectedPass = GOOSE_PEN_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['goose-pen-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'goose-pen-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true,
  });
  root.userData.passId = selectedPass;
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateGoosePen(root, timeSeconds, intensity = 1) {
  const gate = root?.userData?.goosePenRig?.gate;
  if (!gate) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  gate.rotation.y = Math.sin(time * 0.65) * 1.08 * Math.max(0, intensity);
  return root;
}
