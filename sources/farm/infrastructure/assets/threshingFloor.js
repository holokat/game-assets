import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group);
function box(context, parent, id, size, position, surface, group) { const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group); part.position.set(...position); return part; }
function beam(context, parent, id, start, end, width, depth, surface, group) { const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const part = mesh(context, parent, id, new THREE.BoxGeometry(width, a.distanceTo(b), depth), surface, group); part.position.copy(a.clone().add(b).multiplyScalar(0.5)); part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return part; }
const angularDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function createThreshingFloor() {
  const context = createAssetContext('threshing-floor', { label: 'Threshing Floor', style: 'practical static low-poly grain-processing floor' });
  const { model } = context;
  const clay = material('threshing-floor-dry-compacted-clay', '#a27e54', 0.97);
  const stone = material('threshing-floor-dry-stone-curb', '#817a6d', 0.92);
  const timber = material('threshing-floor-weathered-tool-timber', '#745437', 0.82);
  const galvanized = material('threshing-floor-galvanized-tool-roof', '#718084', 0.48, 0.2);
  const straw = material('threshing-floor-static-bundled-sheaf', '#ad8242', 0.9);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const floor = addPivot(context, model, 'broad-dry-working-floor');
  const base = mesh(context, floor, 'rounded-floor-base', new THREE.CylinderGeometry(2.65, 2.7, 0.12, 32), stone, 'floor-base'); base.position.y = 0.06;
  const surface = mesh(context, floor, 'compacted-clay-threshing-surface', new THREE.CylinderGeometry(2.48, 2.5, 0.05, 32), clay, 'working-surface'); surface.position.y = 0.145;
  surface.userData.surfaceIntent = 'dry compacted threshing surface without particles or simulated process';

  const curb = addPivot(context, model, 'segmented-low-perimeter-curb');
  const count = 30; const radius = 2.56;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const grainInputGap = angularDistance(angle, Math.PI / 2) < 0.29;
    const strawOutputGap = angularDistance(angle, 0) < 0.25;
    if (grainInputGap || strawOutputGap) continue;
    const block = box(context, curb, `curb-block-${index + 1}`, [0.5, 0.22, 0.32], [Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius], stone, 'perimeter-curb');
    block.rotation.y = -angle - Math.PI / 2;
  }
  for (const [id, x, z, rotation] of [['grain-left', -0.62, 2.53, 0.18], ['grain-right', 0.62, 2.53, -0.18], ['straw-front', 2.53, 0.54, -1.4], ['straw-rear', 2.53, -0.54, -1.74]]) {
    const marker = box(context, curb, `${id}-opening-marker`, [0.18, 0.36, 0.18], [x, 0.3, z], timber, 'opening-markers'); marker.rotation.y = rotation;
  }

  const shelter = addPivot(context, model, 'covered-tool-collection-edge');
  for (const [id, x, z] of [['left-front', -1.02, -2.18], ['right-front', 1.02, -2.18], ['left-rear', -1.02, -2.62], ['right-rear', 1.02, -2.62]]) box(context, shelter, `${id}-shelter-post`, [0.12, 1.28, 0.12], [x, 0.79, z], timber, 'tool-shelter');
  for (let index = 0; index < 4; index += 1) box(context, shelter, `rear-rack-slat-${index + 1}`, [1.94, 0.18, 0.08], [0, 0.52 + index * 0.24, -2.56], timber, 'tool-shelter');
  const roof = box(context, shelter, 'shallow-covered-edge-roof', [2.28, 0.1, 0.82], [0, 1.48, -2.39], galvanized, 'tool-shelter'); roof.rotation.x = -0.08;
  box(context, shelter, 'tool-rack-shelf', [1.88, 0.1, 0.44], [0, 0.28, -2.37], timber, 'tool-shelter');
  for (const [index, x] of [-0.56, -0.18, 0.22].entries()) {
    beam(context, shelter, `stored-tool-handle-${index + 1}`, [x, 0.32, -2.24], [x + 0.1, 1.2, -2.49], 0.055, 0.055, timber, 'stored-tools');
    box(context, shelter, `stored-tool-head-${index + 1}`, [0.32, 0.08, 0.08], [x + 0.1, 1.16, -2.5], galvanized, 'stored-tools');
  }
  box(context, shelter, 'collection-crate-body', [0.48, 0.44, 0.4], [0.7, 0.49, -2.34], timber, 'collection-tools');
  box(context, shelter, 'collection-crate-rim', [0.54, 0.08, 0.46], [0.7, 0.74, -2.34], galvanized, 'collection-tools');

  const sheaves = addPivot(context, model, 'static-input-sheaf-cues');
  for (const [index, x] of [-0.42, 0.42].entries()) {
    const bundle = mesh(context, sheaves, `tied-sheaf-bundle-${index + 1}`, new THREE.CylinderGeometry(0.18, 0.27, 0.72, 8), straw, 'static-sheaves'); bundle.position.set(x, 0.51, 2.15);
    const tie = mesh(context, sheaves, `tied-sheaf-band-${index + 1}`, new THREE.TorusGeometry(0.175, 0.025, 4, 12), timber, 'static-sheaves'); tie.position.set(x, 0.55, 2.15); tie.rotation.x = Math.PI / 2;
  }

  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, floor, 'threshing-center', [0, 0.18, 0]);
  addSocket(context, floor, 'grain-input', [0, 0.18, 2.92]);
  addSocket(context, floor, 'straw-output', [2.92, 0.18, 0]);
  addSocket(context, shelter, 'tool', [-0.2, 0.62, -2.32]);
  addSocket(context, shelter, 'service', [0, 0.2, -2.86]);
  addSocket(context, shelter, 'attachment', [0, 1.56, -2.38]);
  addSocket(context, model, 'adjacency-left', [-3.02, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [3.02, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 3.02]);
  addSocket(context, model, 'adjacency-rear', [0, 0.1, -3.02]);

  addCollider(context, floor, 'working-floor', 'cylinder', [0, 0.08, 0], { radius: 2.7, height: 0.16, isTrigger: false });
  addCollider(context, curb, 'segmented-curb', 'cylinder', [0, 0.25, 0], { radius: 2.72, height: 0.36, hollow: true, openings: ['grain-input', 'straw-output'], isTrigger: false });
  addCollider(context, shelter, 'tool-shelter', 'box', [0, 0.79, -2.4], { width: 2.28, height: 1.58, depth: 0.84, isTrigger: false });
  addCollider(context, sheaves, 'static-sheaves', 'box', [0, 0.5, 2.15], { width: 1.18, height: 0.82, depth: 0.58, isTrigger: false });
  addCollider(context, floor, 'grain-input-zone', 'box', [0, 0.2, 2.78], { width: 1.15, height: 0.4, depth: 0.58, isTrigger: true });
  addCollider(context, floor, 'straw-output-zone', 'box', [2.78, 0.2, 0], { width: 0.58, height: 0.4, depth: 1.08, isTrigger: true });

  const root = finishAsset(context);
  root.userData.artDirection = { concept: 'references/concepts/threshing-floor.png', identity: ['broad rounded dry clay working surface', 'segmented low stone curb', 'separate grain-input and straw-output gaps', 'compact covered tool and collection edge', 'two restrained static sheaf cues'], motion: 'Static by design; no action channels.', correctionPasses: 1 };
  Object.defineProperty(root.userData, 'threshingFloorRig', { value: { floor, curb, shelter, sheaves }, enumerable: false, configurable: true });
  return root;
}
