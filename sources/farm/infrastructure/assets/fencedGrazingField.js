import * as THREE from 'three';
import {
  addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const FENCED_GRAZING_FIELD_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);
const PASS_INDEX = new Map(FENCED_GRAZING_FIELD_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
}
function makeMaterials() {
  return {
    earth: material('fenced-grazing-field-earth-curb-mat', '#98734b', 0.98),
    grass: material('fenced-grazing-field-muted-grass-mat', '#78804c', 0.96),
    timber: material('fenced-grazing-field-weathered-timber-mat', '#775235', 0.9),
    iron: material('fenced-grazing-field-dark-iron-mat', '#34393a', 0.6, 0.5),
    fixture: material('fenced-grazing-field-blue-grey-fixture-mat', '#607678', 0.82, 0.12),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass);
}
function addBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end);
  const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return beam;
}
function addFenceSpan(context, parent, id, axis, fixed, start, end) {
  const length = Math.abs(end - start);
  const center = (start + end) / 2;
  for (const [index, y] of [0.36, 0.78, 1.2].entries()) {
    const rail = mesh(context, parent, `${id}-rail-${index + 1}`, axis === 'x' ? box(length, 0.1, 0.1) : box(0.1, 0.1, length), context.materials.timber, 'fence-rails', 'structural-pass');
    rail.position.set(axis === 'x' ? center : fixed, y, axis === 'x' ? fixed : center);
  }
  for (let index = 1; index <= 3; index += 1) {
    const bracket = mesh(context, parent, `${id}-rail-bracket-${index}`, box(0.08, 0.5, 0.08), context.materials.iron, 'fence-hardware', 'surface-pass');
    bracket.position.set(axis === 'x' ? center : fixed, 0.78, axis === 'x' ? fixed : center);
    bracket.position[axis] += (index - 2) * Math.min(0.35, length * 0.14);
  }
}

export function createFencedGrazingField(options = {}) {
  const passId = FENCED_GRAZING_FIELD_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('fenced-grazing-field', { label: 'Fenced Grazing Field', targetHeightMetres: 1.56, passId });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'grazing-center', [0, 0.18, 0]);
  addSocket(context, model, 'grazing-left', [-1.75, 0.18, 0]);
  addSocket(context, model, 'grazing-right', [1.75, 0.18, 0]);
  addSocket(context, model, 'feeding', [-2.45, 0.35, 0.25]);
  addSocket(context, model, 'watering', [0.8, 0.32, -1.8]);
  addSocket(context, model, 'service', [0.75, 0.12, 2.65]);
  addSocket(context, model, 'gate-attachment', [0, 0.72, 2.3]);
  addSocket(context, model, 'adjacency-left', [-3.28, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [3.28, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 2.58]);
  addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.58]);

  const field = addPivot(context, model, 'grazing-field-plot');
  const curb = mesh(context, field, 'earth-perimeter-curb', box(6.2, 0.12, 4.7), context.materials.earth, 'field-ground');
  curb.position.y = 0.06;
  const grazingBase = mesh(context, field, 'grazing-surface', box(5.86, 0.08, 4.36), context.materials.grass, 'grazing-surface');
  grazingBase.position.y = 0.16;
  for (let index = 0; index < 5; index += 1) {
    const strip = mesh(context, field, `grazing-strip-${index + 1}`, box(0.78, 0.035, 3.82), context.materials.grass, 'grazing-strips', 'form-refinement');
    strip.position.set(-2.05 + index * 1.02, 0.22 + (index % 2) * 0.012, 0);
    strip.rotation.y = (index % 2 ? 1 : -1) * 0.025;
  }
  addCollider(context, field, 'field-ground', 'box', [0, 0.11, 0], { width: 6.2, height: 0.22, depth: 4.7, isTrigger: false });

  const fence = addPivot(context, model, 'segmented-perimeter-fence');
  const corners = [
    ['front-left', -3, 2.25], ['front-right', 3, 2.25],
    ['rear-left', -3, -2.25], ['rear-right', 3, -2.25],
  ];
  const midpoints = [
    ['front-midpoint', 0, 2.25], ['rear-midpoint', 0, -2.25],
    ['left-midpoint', -3, 0], ['right-midpoint', 3, 0],
  ];
  for (const [id, x, z] of corners) {
    const post = mesh(context, fence, `${id}-corner-post`, box(0.16, 1.54, 0.16), context.materials.timber, 'corner-posts', 'structural-pass');
    post.position.set(x, 0.77, z);
    const shoe = mesh(context, fence, `${id}-post-shoe`, box(0.26, 0.18, 0.26), context.materials.iron, 'fence-hardware', 'surface-pass');
    shoe.position.set(x, 0.09, z);
    const connector = mesh(context, fence, `${id}-module-connector`, box(0.24, 0.16, 0.24), context.materials.iron, 'module-connectors', 'interaction-pass');
    connector.position.set(x + (x < 0 ? -0.16 : 0.16), 0.1, z + (z < 0 ? -0.16 : 0.16));
  }
  for (const [id, x, z] of midpoints) {
    const post = mesh(context, fence, `${id}-post`, box(0.15, 1.46, 0.15), context.materials.timber, 'midpoint-posts', 'structural-pass');
    post.position.set(x, 0.73, z);
    const shoe = mesh(context, fence, `${id}-post-shoe`, box(0.24, 0.16, 0.24), context.materials.iron, 'fence-hardware', 'surface-pass');
    shoe.position.set(x, 0.08, z);
  }
  const gateLatchPost = mesh(context, fence, 'gate-latch-upright', box(0.15, 1.46, 0.15), context.materials.timber, 'front-gate', 'structural-pass');
  gateLatchPost.position.set(1.5, 0.73, 2.25);
  addFenceSpan(context, fence, 'front-left', 'x', 2.25, -3, 0);
  addFenceSpan(context, fence, 'front-right', 'x', 2.25, 1.5, 3);
  addFenceSpan(context, fence, 'rear-left', 'x', -2.25, -3, 0);
  addFenceSpan(context, fence, 'rear-right', 'x', -2.25, 0, 3);
  addFenceSpan(context, fence, 'left-front', 'z', -3, 0, 2.25);
  addFenceSpan(context, fence, 'left-rear', 'z', -3, -2.25, 0);
  addFenceSpan(context, fence, 'right-front', 'z', 3, 0, 2.25);
  addFenceSpan(context, fence, 'right-rear', 'z', 3, -2.25, 0);
  addCollider(context, fence, 'perimeter-fence', 'box', [0, 0.74, 0], { width: 6.16, height: 1.5, depth: 4.66, hollow: true, isTrigger: false });

  const gate = addPivot(context, model, 'broad-front-gate', [0.08, 0.08, 2.26]);
  for (const [id, width, height, x, y] of [
    ['left', 0.11, 1.2, 0.055, 0.6], ['right', 0.11, 1.2, 1.36, 0.6],
    ['top', 1.42, 0.11, 0.71, 1.145], ['bottom', 1.42, 0.11, 0.71, 0.055],
  ]) {
    const frame = mesh(context, gate, `gate-${id}-frame`, box(width, height, 0.11), context.materials.timber, 'front-gate', 'structural-pass');
    frame.position.set(x, y, 0);
  }
  addBeam(context, gate, 'gate-diagonal-brace', [0.1, 0.14, 0], [1.31, 1.06, 0], 0.09, 0.09, context.materials.timber, 'front-gate');
  const latch = mesh(context, gate, 'gate-latch', box(0.22, 0.1, 0.13), context.materials.iron, 'front-gate', 'interaction-pass');
  latch.position.set(1.32, 0.67, 0.1);
  addChannel(context, gate, 'rotation', 'y', 1.06, 0.64, 0);
  addSocket(context, gate, 'gate-control', [1.32, 0.67, 0.16]);
  addCollider(context, gate, 'front-gate', 'box', [0.71, 0.6, 0], { width: 1.46, height: 1.24, depth: 0.16, isTrigger: false });

  const fixtures = addPivot(context, model, 'feed-water-stations');
  const trough = mesh(context, fixtures, 'long-water-trough', box(1.5, 0.28, 0.46), context.materials.fixture, 'water-station', 'form-refinement');
  trough.position.set(0.8, 0.34, -1.78);
  const troughInset = mesh(context, fixtures, 'water-trough-inset', box(1.3, 0.07, 0.28), context.materials.iron, 'water-station', 'surface-pass');
  troughInset.position.set(0.8, 0.5, -1.78);
  for (const z of [-0.22, 0.22]) {
    const rackRail = mesh(context, fixtures, `feed-rack-rail-${z}`, box(0.95, 0.1, 0.1), context.materials.timber, 'feed-station', 'structural-pass');
    rackRail.position.set(-2.45, 0.55, z + 0.25);
  }
  for (const x of [-2.85, -2.05]) {
    const rackPost = mesh(context, fixtures, `feed-rack-post-${x}`, box(0.1, 0.7, 0.1), context.materials.timber, 'feed-station', 'structural-pass');
    rackPost.position.set(x, 0.45, 0.25);
  }
  const rackTray = mesh(context, fixtures, 'feed-rack-tray', box(0.95, 0.18, 0.55), context.materials.fixture, 'feed-station', 'form-refinement');
  rackTray.position.set(-2.45, 0.24, 0.25);
  addCollider(context, fixtures, 'feed-water-stations', 'box', [-0.8, 0.4, -0.6], { width: 4.4, height: 0.8, depth: 2.9, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 1.54,
    note: 'Lean stylized low-poly Fenced Grazing Field reconstructed from the generated four-view concept sheet.',
    cornerPostCount: 4,
    midpointPostCount: 4,
    fixedFenceRailCount: 24,
    palette: ['earth curb', 'muted grazing grass', 'weathered timber', 'dark iron', 'blue-grey fixtures'],
    motion: 'Only the broad front field gate rotates.',
  };
  root.userData.fencedGrazingFieldRig = { field, fence, gate, fixtures };
  root.userData.applyPassState = (nextPassId) => applyFencedGrazingFieldPassState(root, nextPassId);
  applyFencedGrazingFieldPassState(root, passId);
  return root;
}

export function applyFencedGrazingFieldPassState(root, passId = 'optimization-pass') {
  const selectedPass = FENCED_GRAZING_FIELD_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['fenced-grazing-field-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'fenced-grazing-field-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass;
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateFencedGrazingField(root, timeSeconds, intensity = 1) {
  const gate = root?.userData?.fencedGrazingFieldRig?.gate;
  if (!gate) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  gate.rotation.y = Math.sin(time * 0.64) * 1.06 * Math.max(0, intensity);
  return root;
}
