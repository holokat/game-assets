import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({
  name, color, roughness, metalness, flatShading: true, vertexColors: true,
});
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(
  context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group,
);
function box(context, parent, id, size, position, surface, group) {
  const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group);
  part.position.set(...position);
  return part;
}
function beam(context, parent, id, start, end, width, depth, surface, group) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const part = mesh(context, parent, id, new THREE.BoxGeometry(width, a.distanceTo(b), depth), surface, group);
  part.position.copy(a.clone().add(b).multiplyScalar(0.5));
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return part;
}
function wallAlongX(context, parent, id, startX, endX, z, stone) {
  const count = Math.max(2, Math.round(Math.abs(endX - startX) / 0.55));
  const span = Math.abs(endX - startX) / count;
  for (let course = 0; course < 2; course += 1) {
    for (let index = 0; index < count; index += 1) {
      const offset = course ? span * 0.22 : 0;
      const x = THREE.MathUtils.lerp(startX, endX, (index + 0.5) / count) + (index === count - 1 ? 0 : offset);
      box(context, parent, `${id}-stone-${course}-${index}`, [span * 0.93, 0.27, 0.34], [x, 0.135 + course * 0.275, z], stone, 'boundary-stone');
    }
  }
}
function wallAlongZ(context, parent, id, x, startZ, endZ, stone) {
  const count = Math.max(2, Math.round(Math.abs(endZ - startZ) / 0.55));
  const span = Math.abs(endZ - startZ) / count;
  for (let course = 0; course < 2; course += 1) {
    for (let index = 0; index < count; index += 1) {
      const offset = course ? span * 0.22 : 0;
      const z = THREE.MathUtils.lerp(startZ, endZ, (index + 0.5) / count) + (index === count - 1 ? 0 : offset);
      box(context, parent, `${id}-stone-${course}-${index}`, [0.34, 0.27, span * 0.93], [x, 0.135 + course * 0.275, z], stone, 'boundary-stone');
    }
  }
}

export function createSheepfold() {
  const context = createAssetContext('sheepfold', { label: 'Sheepfold', style: 'lean stylized low-poly textureless enclosure' });
  const { model } = context;
  const earth = material('sheepfold-compacted-earth', '#98734d', 0.96);
  const stone = material('sheepfold-dry-fieldstone', '#7f796c', 0.9);
  const timber = material('sheepfold-weathered-timber', '#775638', 0.82);
  const iron = material('sheepfold-dark-iron-hardware', '#343a3a', 0.5, 0.35);
  const galvanized = material('sheepfold-galvanized-fixtures', '#718084', 0.48, 0.2);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const floor = addPivot(context, model, 'open-fold-floor');
  box(context, floor, 'compacted-earth-floor', [4.8, 0.1, 3.8], [0, 0.05, 0], earth, 'floor');

  const boundary = addPivot(context, model, 'low-dry-stone-boundary');
  wallAlongX(context, boundary, 'front-left-wall', -2.35, -0.82, 1.85, stone);
  wallAlongX(context, boundary, 'front-right-wall', 0.82, 2.35, 1.85, stone);
  wallAlongX(context, boundary, 'rear-wall', -2.35, 2.35, -1.85, stone);
  wallAlongZ(context, boundary, 'left-wall', -2.35, -1.85, 1.85, stone);
  wallAlongZ(context, boundary, 'right-wall', 2.35, -1.85, 1.85, stone);
  for (const [id, x, z] of [
    ['front-left', -2.35, 1.85], ['gate-left', -0.82, 1.85], ['gate-right', 0.82, 1.85], ['front-right', 2.35, 1.85],
    ['rear-left', -2.35, -1.85], ['rear-right', 2.35, -1.85], ['left-mid', -2.35, 0], ['right-mid', 2.35, 0],
  ]) box(context, boundary, `${id}-timber-post`, [0.16, 0.86, 0.16], [x, 0.43, z], timber, 'boundary-posts');

  const gate = addPivot(context, model, 'broad-entry-gate', [-0.75, 0, 1.87]);
  gate.userData.attachment = {
    parentId: 'low-dry-stone-boundary', parentSocket: 'gate-left-hinge',
    localStart: [-0.75, 0.08, 1.87], localEnd: [-0.75, 0.9, 1.87], contactType: 'hinge',
    overlap: 0.03, gapTolerance: 0.006, evidenceRefs: ['sheepfold concept: broad front gate'],
  };
  box(context, gate, 'gate-left-frame', [0.11, 0.86, 0.11], [0.055, 0.43, 0], timber, 'gate');
  box(context, gate, 'gate-right-frame', [0.11, 0.86, 0.11], [1.445, 0.43, 0], timber, 'gate');
  box(context, gate, 'gate-top-frame', [1.5, 0.11, 0.11], [0.75, 0.805, 0], timber, 'gate');
  box(context, gate, 'gate-bottom-frame', [1.5, 0.1, 0.11], [0.75, 0.05, 0], timber, 'gate');
  for (const x of [0.3, 0.58, 0.86, 1.14]) box(context, gate, `gate-vertical-board-${x}`, [0.18, 0.66, 0.07], [x, 0.43, -0.01], timber, 'gate');
  beam(context, gate, 'gate-diagonal-brace', [0.12, 0.16, 0.055], [1.35, 0.72, 0.055], 0.09, 0.08, timber, 'gate');
  for (const y of [0.23, 0.65]) box(context, gate, `gate-hinge-${y}`, [0.22, 0.08, 0.12], [0.02, y, 0.1], iron, 'gate-hardware');
  box(context, gate, 'gate-latch', [0.22, 0.08, 0.12], [1.42, 0.55, 0.1], iron, 'gate-hardware');
  addChannel(context, gate, 'rotation', 'y', 1.04, 0.62, 0);

  const shelter = addPivot(context, model, 'rear-corner-wind-shelter');
  for (let index = 0; index < 4; index += 1) {
    box(context, shelter, `rear-windbreak-slat-${index}`, [1.5, 0.2, 0.1], [1.48, 0.62 + index * 0.22, -1.72], timber, 'shelter');
    box(context, shelter, `side-windbreak-slat-${index}`, [0.1, 0.2, 1.2], [2.2, 0.62 + index * 0.22, -1.18], timber, 'shelter');
  }
  for (const [id, x, z] of [['inner', 0.78, -1.72], ['corner', 2.2, -1.72], ['front', 2.2, -0.62]]) {
    box(context, shelter, `${id}-shelter-post`, [0.13, 1.35, 0.13], [x, 0.735, z], timber, 'shelter');
  }
  const canopy = box(context, shelter, 'shallow-wind-shelter-roof', [1.72, 0.1, 1.42], [1.48, 1.45, -1.18], galvanized, 'shelter');
  canopy.rotation.x = -0.12;

  const fixtures = addPivot(context, model, 'feeding-water-fixtures');
  box(context, fixtures, 'long-low-feed-trough', [1.55, 0.28, 0.46], [-1.25, 0.23, -1.15], galvanized, 'fixtures');
  box(context, fixtures, 'feed-trough-inset', [1.33, 0.07, 0.28], [-1.25, 0.405, -1.15], iron, 'fixtures');
  const water = mesh(context, fixtures, 'compact-water-trough', new THREE.CylinderGeometry(0.4, 0.46, 0.25, 8), galvanized, 'fixtures');
  water.position.set(1.3, 0.225, 0.85);
  const waterInset = mesh(context, fixtures, 'water-trough-inset', new THREE.CylinderGeometry(0.31, 0.34, 0.06, 8), iron, 'fixtures');
  waterInset.position.set(1.3, 0.38, 0.85);

  addSocket(context, model, 'terrain', [0, 0.05, 0]);
  addSocket(context, model, 'animal-entry', [0, 0.08, 2.05]);
  addSocket(context, model, 'loading', [0, 0.08, 2.3]);
  addSocket(context, model, 'feeding', [-1.25, 0.2, -1.15]);
  addSocket(context, model, 'watering', [1.3, 0.25, 0.85]);
  addSocket(context, model, 'shelter', [1.45, 0.15, -1.2]);
  addSocket(context, model, 'service', [2.55, 0.1, 0]);
  addSocket(context, model, 'attachment', [1.48, 1.5, -1.2]);
  addSocket(context, model, 'adjacency-left', [-2.58, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [2.58, 0.1, 0]);
  addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.08]);
  addSocket(context, gate, 'gate-control', [1.42, 0.55, 0.18]);

  addCollider(context, floor, 'fold-floor', 'box', [0, 0.05, 0], { width: 4.8, height: 0.1, depth: 3.8, isTrigger: false });
  addCollider(context, boundary, 'stone-boundary', 'box', [0, 0.3, 0], { width: 4.75, height: 0.62, depth: 3.75, hollow: true, isTrigger: false });
  addCollider(context, gate, 'entry-gate', 'box', [0.75, 0.43, 0], { width: 1.5, height: 0.86, depth: 0.16, isTrigger: false });
  addCollider(context, shelter, 'wind-shelter', 'box', [1.48, 0.76, -1.18], { width: 1.72, height: 1.52, depth: 1.42, isTrigger: false });
  addCollider(context, fixtures, 'feeding-water', 'box', [0, 0.24, -0.15], { width: 3.4, height: 0.48, depth: 2.6, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    concept: 'references/concepts/sheepfold.png',
    identity: ['low dry-stone boundary', 'broad timber gate', 'open central fold', 'rear-corner wind shelter', 'feed and water troughs'],
    motion: 'Only the visibly hinged broad entry gate rotates.', correctionPasses: 0,
  };
  Object.defineProperty(root.userData, 'sheepfoldRig', { value: { floor, boundary, gate, shelter, fixtures }, enumerable: false, configurable: true });
  return root;
}

export function animateSheepfold(root, timeSeconds) {
  const gate = root?.userData?.sheepfoldRig?.gate;
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!gate || !channel) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  gate.rotation.y = channel.baseValue + Math.max(0, Math.sin(time * channel.frequency + channel.phase)) * channel.amplitude;
  return root;
}
