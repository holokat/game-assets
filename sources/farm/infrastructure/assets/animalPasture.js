import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group);
function box(context, parent, id, size, position, surface, group) {
  const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group);
  part.position.set(...position);
  return part;
}
function beam(context, parent, id, start, end, width, depth, surface, group) {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end);
  const part = mesh(context, parent, id, new THREE.BoxGeometry(width, a.distanceTo(b), depth), surface, group);
  part.position.copy(a.clone().add(b).multiplyScalar(0.5));
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return part;
}
function railsAlongX(context, parent, id, startX, endX, z, timber) {
  for (const [index, y] of [0.32, 0.7].entries()) box(context, parent, `${id}-rail-${index + 1}`, [Math.abs(endX - startX), 0.075, 0.075], [(startX + endX) / 2, y, z], timber, 'boundary-rails');
}
function railsAlongZ(context, parent, id, x, startZ, endZ, timber) {
  for (const [index, y] of [0.32, 0.7].entries()) box(context, parent, `${id}-rail-${index + 1}`, [0.075, 0.075, Math.abs(endZ - startZ)], [x, y, (startZ + endZ) / 2], timber, 'boundary-rails');
}

export function createAnimalPasture() {
  const context = createAssetContext('animal-pasture', { label: 'Animal Pasture', style: 'practical modular low-poly pasture plot' });
  const { model } = context;
  const soil = material('animal-pasture-earth-terrain', '#8c714e', 0.96);
  const grass = material('animal-pasture-muted-grazing-grass', '#687344', 0.9);
  const timber = material('animal-pasture-weathered-timber', '#77583a', 0.82);
  const iron = material('animal-pasture-dark-iron-hardware', '#343a39', 0.5, 0.34);
  const galvanized = material('animal-pasture-galvanized-fixtures', '#718084', 0.48, 0.2);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const terrain = addPivot(context, model, 'modular-pasture-terrain');
  box(context, terrain, 'broad-earth-terrain-pad', [5.2, 0.1, 4.2], [0, 0.05, 0], soil, 'terrain');
  box(context, terrain, 'thin-grass-sward', [5.08, 0.035, 4.08], [0, 0.1175, 0], grass, 'terrain');

  const grazing = addPivot(context, model, 'sparse-grazing-patches');
  const patches = [
    [-1.8, -1.25, 0.45, 0.28], [-0.9, -1.45, 0.62, 0.22], [0.2, -1.3, 0.5, 0.32], [1.35, -1.42, 0.55, 0.25],
    [-1.55, -0.4, 0.58, 0.3], [-0.35, -0.55, 0.72, 0.24], [0.95, -0.35, 0.42, 0.3], [1.85, -0.55, 0.34, 0.22],
    [-1.95, 0.55, 0.38, 0.28], [-0.85, 0.45, 0.52, 0.24], [0.25, 0.62, 0.64, 0.3], [1.45, 0.55, 0.5, 0.24],
    [-1.35, 1.35, 0.6, 0.25], [-0.15, 1.25, 0.45, 0.3], [1.05, 1.4, 0.55, 0.22],
  ];
  patches.forEach(([x, z, width, depth], index) => {
    const patch = mesh(context, grazing, `irregular-grazing-patch-${index + 1}`, new THREE.CylinderGeometry(0.5, 0.54, 0.045, 6), grass, 'grazing');
    patch.position.set(x, 0.15, z); patch.scale.set(width, 1, depth); patch.rotation.y = (index % 5) * 0.24;
  });

  const boundary = addPivot(context, model, 'sparse-two-rail-boundary');
  railsAlongX(context, boundary, 'front-left', -2.5, -0.86, 2.02, timber);
  railsAlongX(context, boundary, 'front-right', 0.86, 2.5, 2.02, timber);
  railsAlongX(context, boundary, 'rear', -2.5, 2.5, -2.02, timber);
  railsAlongZ(context, boundary, 'left', -2.5, -2.02, 2.02, timber);
  railsAlongZ(context, boundary, 'right', 2.5, -2.02, 2.02, timber);
  for (const [id, x, z] of [
    ['front-left', -2.5, 2.02], ['gate-left', -0.86, 2.02], ['gate-right', 0.86, 2.02], ['front-right', 2.5, 2.02],
    ['rear-left', -2.5, -2.02], ['rear-center', 0, -2.02], ['rear-right', 2.5, -2.02], ['left-mid', -2.5, 0], ['right-mid', 2.5, 0],
  ]) box(context, boundary, `${id}-boundary-post`, [0.14, 0.94, 0.14], [x, 0.47, z], timber, 'boundary-posts');

  const gate = addPivot(context, model, 'broad-entry-gate', [-0.79, 0, 2.04]);
  gate.userData.attachment = { parentId: 'sparse-two-rail-boundary', parentSocket: 'gate-left-hinge', localStart: [-0.79, 0.08, 2.04], localEnd: [-0.79, 0.9, 2.04], contactType: 'hinge', overlap: 0.03, gapTolerance: 0.006, evidenceRefs: ['animal-pasture concept: broad front gate'] };
  box(context, gate, 'gate-left-frame', [0.11, 0.88, 0.11], [0.055, 0.44, 0], timber, 'gate');
  box(context, gate, 'gate-right-frame', [0.11, 0.88, 0.11], [1.525, 0.44, 0], timber, 'gate');
  box(context, gate, 'gate-top-frame', [1.58, 0.11, 0.11], [0.79, 0.825, 0], timber, 'gate');
  box(context, gate, 'gate-bottom-frame', [1.58, 0.1, 0.11], [0.79, 0.05, 0], timber, 'gate');
  for (const x of [0.34, 0.68, 1.02, 1.36]) box(context, gate, `gate-board-${x}`, [0.21, 0.66, 0.07], [x, 0.44, -0.01], timber, 'gate');
  beam(context, gate, 'gate-diagonal-brace', [0.12, 0.16, 0.055], [1.46, 0.73, 0.055], 0.09, 0.08, timber, 'gate');
  for (const y of [0.23, 0.67]) box(context, gate, `gate-hinge-${y}`, [0.22, 0.08, 0.12], [0.02, y, 0.1], iron, 'hardware');
  box(context, gate, 'gate-latch', [0.22, 0.08, 0.12], [1.5, 0.57, 0.1], iron, 'hardware');
  addChannel(context, gate, 'rotation', 'y', 1.04, 0.62, 0);

  const shade = addPivot(context, model, 'open-shade-canopy');
  for (const [id, x, z] of [['rear-left', 1.15, -1.72], ['rear-right', 2.2, -1.72], ['front-left', 1.15, -0.72], ['front-right', 2.2, -0.72]]) {
    box(context, shade, `${id}-shade-post`, [0.11, 1.32, 0.11], [x, 0.76, z], timber, 'shade');
  }
  const roof = box(context, shade, 'small-open-shade-roof', [1.35, 0.09, 1.28], [1.67, 1.47, -1.22], galvanized, 'shade');
  roof.rotation.x = -0.08;
  box(context, shade, 'shade-front-edge', [1.35, 0.07, 0.07], [1.67, 1.42, -0.6], iron, 'shade');

  const fixtures = addPivot(context, model, 'feed-water-fixtures');
  box(context, fixtures, 'low-feed-rack-bed', [0.95, 0.1, 0.46], [-1.55, 0.2, -0.95], timber, 'fixtures');
  for (const x of [-1.92, -1.67, -1.43, -1.18]) beam(context, fixtures, `feed-rack-slat-${x}`, [x, 0.25, -1.15], [x, 0.62, -0.75], 0.055, 0.055, timber, 'fixtures');
  box(context, fixtures, 'compact-water-trough', [1.12, 0.28, 0.46], [1.5, 0.24, 0.95], galvanized, 'fixtures');
  box(context, fixtures, 'water-trough-inset', [0.92, 0.07, 0.28], [1.5, 0.425, 0.95], iron, 'fixtures');

  addSocket(context, model, 'terrain', [0, 0.05, 0]);
  addSocket(context, model, 'grazing', [0, 0.15, 0]);
  addSocket(context, model, 'animal-entry', [0, 0.08, 2.25]);
  addSocket(context, model, 'loading', [0, 0.08, 2.48]);
  addSocket(context, model, 'feeding', [-1.55, 0.25, -0.95]);
  addSocket(context, model, 'watering', [1.5, 0.25, 0.95]);
  addSocket(context, model, 'shade', [1.67, 0.12, -1.22]);
  addSocket(context, model, 'service', [2.72, 0.1, 0]);
  addSocket(context, model, 'attachment', [1.67, 1.52, -1.22]);
  addSocket(context, model, 'adjacency-left', [-2.72, 0.08, 0]);
  addSocket(context, model, 'adjacency-right', [2.72, 0.08, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.08, 2.28]);
  addSocket(context, model, 'adjacency-rear', [0, 0.08, -2.28]);
  addSocket(context, gate, 'gate-control', [1.5, 0.57, 0.18]);

  addCollider(context, terrain, 'pasture-terrain', 'box', [0, 0.06, 0], { width: 5.2, height: 0.12, depth: 4.2, isTrigger: false });
  addCollider(context, boundary, 'pasture-boundary', 'box', [0, 0.47, 0], { width: 5.05, height: 0.94, depth: 4.09, hollow: true, isTrigger: false });
  addCollider(context, gate, 'entry-gate', 'box', [0.79, 0.44, 0], { width: 1.58, height: 0.88, depth: 0.16, isTrigger: false });
  addCollider(context, shade, 'shade-canopy', 'box', [1.67, 0.78, -1.22], { width: 1.35, height: 1.56, depth: 1.28, isTrigger: false });
  addCollider(context, fixtures, 'feed-water', 'box', [0, 0.32, 0], { width: 4.1, height: 0.64, depth: 2.6, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = { concept: 'references/concepts/animal-pasture.png', identity: ['broad modular terrain pad', 'sparse grazing patches', 'two-rail boundary cues', 'broad gate', 'open shade canopy', 'feed and water fixtures'], motion: 'Only the broad entry gate rotates.', correctionPasses: 0 };
  Object.defineProperty(root.userData, 'animalPastureRig', { value: { terrain, grazing, boundary, gate, shade, fixtures }, enumerable: false, configurable: true });
  return root;
}

export function animateAnimalPasture(root, timeSeconds) {
  const gate = root?.userData?.animalPastureRig?.gate;
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!gate || !channel) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  gate.rotation.y = channel.baseValue + Math.max(0, Math.sin(time * channel.frequency + channel.phase)) * channel.amplitude;
  return root;
}
