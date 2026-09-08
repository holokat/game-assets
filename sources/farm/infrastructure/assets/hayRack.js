import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group);
function box(context, parent, id, size, position, surface, group) { const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group); part.position.set(...position); return part; }
function beam(context, parent, id, start, end, width, depth, surface, group) {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end);
  const part = mesh(context, parent, id, new THREE.BoxGeometry(width, a.distanceTo(b), depth), surface, group);
  part.position.copy(a.clone().add(b).multiplyScalar(0.5)); part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return part;
}

export function createHayRack() {
  const context = createAssetContext('hay-rack', { label: 'Hay Rack', style: 'lean freestanding textureless low-poly feeder' });
  const { model } = context;
  const timber = material('hay-rack-weathered-timber', '#77583a', 0.82);
  const iron = material('hay-rack-dark-iron-hardware', '#343a39', 0.5, 0.34);
  const galvanized = material('hay-rack-galvanized-catch-tray', '#718084', 0.48, 0.2);
  const stone = material('hay-rack-stable-stone-feet', '#7d786e', 0.9);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const frame = addPivot(context, model, 'freestanding-support-frame');
  const basket = addPivot(context, frame, 'open-v-shaped-feed-basket');
  const tray = addPivot(context, frame, 'galvanized-catch-tray');
  const feet = addPivot(context, frame, 'stable-foot-system');

  for (const [id, x, z] of [['left-front', -1.1, 0.42], ['left-rear', -1.1, -0.42], ['right-front', 1.1, 0.42], ['right-rear', 1.1, -0.42]]) {
    box(context, feet, `${id}-stone-foot`, [0.28, 0.14, 0.28], [x, 0.07, z], stone, 'feet');
    const upperZ = z > 0 ? 0.26 : -0.26;
    beam(context, frame, `${id}-splayed-leg`, [x, 0.14, z], [x, 1.38, upperZ], 0.12, 0.12, timber, 'frame');
  }
  for (const z of [-0.29, 0.29]) {
    box(context, basket, `top-longitudinal-rail-${z}`, [2.34, 0.12, 0.12], [0, 1.34, z], timber, 'basket');
    box(context, basket, `bottom-longitudinal-rail-${z}`, [2.34, 0.1, 0.1], [0, 0.56, z * 0.38], timber, 'basket');
  }
  for (const x of [-0.94, -0.63, -0.31, 0, 0.31, 0.63, 0.94]) {
    beam(context, basket, `front-v-slat-${x}`, [x, 0.59, 0.1], [x, 1.29, 0.27], 0.075, 0.075, timber, 'basket');
    beam(context, basket, `rear-v-slat-${x}`, [x, 0.59, -0.1], [x, 1.29, -0.27], 0.075, 0.075, timber, 'basket');
  }
  for (const x of [-1.08, 1.08]) {
    beam(context, basket, `end-v-brace-front-${x}`, [x, 0.54, 0.08], [x, 1.35, 0.34], 0.1, 0.1, timber, 'basket');
    beam(context, basket, `end-v-brace-rear-${x}`, [x, 0.54, -0.08], [x, 1.35, -0.34], 0.1, 0.1, timber, 'basket');
    box(context, frame, `end-iron-band-${x}`, [0.1, 0.12, 0.96], [x, 0.56, 0], iron, 'hardware');
    for (const z of [-0.34, 0.34]) {
      const bolt = mesh(context, frame, `band-bolt-${x}-${z}`, new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8), iron, 'hardware');
      bolt.position.set(x + (x < 0 ? -0.06 : 0.06), 0.57, z); bolt.rotation.z = Math.PI / 2;
    }
  }

  box(context, tray, 'long-galvanized-catch-tray', [2.28, 0.18, 0.72], [0, 0.4, 0], galvanized, 'tray');
  box(context, tray, 'catch-tray-inset', [2.05, 0.06, 0.5], [0, 0.515, 0], iron, 'tray');
  for (const x of [-1.02, 1.02]) box(context, tray, `tray-end-bracket-${x}`, [0.08, 0.24, 0.8], [x, 0.44, 0], iron, 'hardware');

  addSocket(context, model, 'refill', [0, 1.45, 0]);
  addSocket(context, model, 'animal-approach-front', [0, 0.28, 0.78]);
  addSocket(context, model, 'animal-approach-rear', [0, 0.28, -0.78]);
  addSocket(context, model, 'service', [1.35, 0.55, 0]);
  addSocket(context, model, 'feed-collection', [0, 0.48, 0]);
  addSocket(context, model, 'attachment', [0, 1.4, 0]);
  addSocket(context, model, 'adjacency-left', [-1.4, 0.08, 0]);
  addSocket(context, model, 'adjacency-right', [1.4, 0.08, 0]);

  addCollider(context, frame, 'support-frame', 'box', [0, 0.76, 0], { width: 2.34, height: 1.52, depth: 0.95, isTrigger: false });
  addCollider(context, tray, 'catch-tray', 'box', [0, 0.4, 0], { width: 2.28, height: 0.18, depth: 0.72, isTrigger: false });
  addCollider(context, model, 'approach-front', 'box', [0, 0.35, 0.75], { width: 2.3, height: 0.7, depth: 0.45, isTrigger: true });
  addCollider(context, model, 'approach-rear', 'box', [0, 0.35, -0.75], { width: 2.3, height: 0.7, depth: 0.45, isTrigger: true });

  const root = finishAsset(context);
  root.userData.artDirection = { concept: 'references/concepts/hay-rack.png', identity: ['open V-shaped slatted basket', 'double-sided access', 'galvanized catch tray', 'splayed stone-footed support frame'], motion: 'Static because the open refill mouth has no visible latch or door.', correctionPasses: 0 };
  Object.defineProperty(root.userData, 'hayRackRig', { value: { frame, basket, tray, feet }, enumerable: false, configurable: true });
  return root;
}
