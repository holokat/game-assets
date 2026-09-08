import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.68, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group);
function box(context, parent, id, size, position, surface, group) { const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group); part.position.set(...position); return part; }
function beam(context, parent, id, start, end, width, depth, surface, group) { const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const part = mesh(context, parent, id, new THREE.BoxGeometry(width, a.distanceTo(b), depth), surface, group); part.position.copy(a.clone().add(b).multiplyScalar(0.5)); part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return part; }

export function createButcher() {
  const context = createAssetContext('butcher', { label: 'Butcher', style: 'compact non-graphic low-poly hygienic processing workshop' });
  const { model } = context;
  const stone = material('butcher-washable-stone-curb', '#817a70', 0.9);
  const panel = material('butcher-insulated-pale-panel', '#d1cec2', 0.76);
  const roof = material('butcher-galvanized-roof-ventilation', '#707b7d', 0.46, 0.18);
  const iron = material('butcher-dark-rail-service-trim', '#343b3d', 0.5, 0.3);
  const stainless = material('butcher-clean-stainless-equipment', '#9ca19e', 0.4, 0.32);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const building = addPivot(context, model, 'hygienic-processing-building');
  const rail = addPivot(context, building, 'empty-receiving-rail');
  const workTables = addPivot(context, building, 'empty-work-tables');
  const wash = addPivot(context, building, 'wash-sink');
  const drain = addPivot(context, building, 'floor-drain-system');
  const coldRoom = addPivot(context, building, 'cold-room-access');
  const output = addPivot(context, building, 'clean-product-output-shutter');
  const ventilation = addPivot(context, building, 'ventilation-system');
  const power = addPivot(context, building, 'power-service-access');

  box(context, building, 'washable-stone-foundation', [3.44, 0.18, 2.44], [0, 0.09, 0], stone, 'foundation');
  box(context, building, 'washable-process-floor', [3.18, 0.06, 2.18], [0, 0.21, 0], stainless, 'process-floor');
  box(context, building, 'rear-insulated-wall', [3.18, 1.58, 0.12], [0, 0.98, -1.1], panel, 'insulated-shell');
  box(context, building, 'left-insulated-wall', [0.12, 1.58, 2.14], [-1.53, 0.98, 0], panel, 'insulated-shell');
  box(context, building, 'right-insulated-wall', [0.12, 1.58, 2.14], [1.53, 0.98, 0], panel, 'insulated-shell');
  box(context, building, 'front-left-return', [0.5, 1.58, 0.12], [-1.34, 0.98, 1.1], panel, 'insulated-shell');
  box(context, building, 'front-right-return', [0.5, 1.58, 0.12], [1.34, 0.98, 1.1], panel, 'insulated-shell');
  box(context, building, 'open-workshop-header', [2.22, 0.24, 0.14], [0, 1.65, 1.1], iron, 'technical-frame');
  for (const x of [-1.55, -1.08, 1.08, 1.55]) box(context, building, `front-frame-post-${x}`, [0.1, 1.78, 0.1], [x, 0.99, 1.13], iron, 'technical-frame');
  for (const z of [-0.5, 0.5]) { const slope = box(context, building, `roof-slope-${z}`, [3.46, 0.09, 1.29], [0, 1.85, z], roof, 'roof'); slope.rotation.x = z < 0 ? -0.23 : 0.23; }
  box(context, building, 'roof-ridge', [3.3, 0.07, 0.12], [0, 1.99, 0], iron, 'roof');

  for (const x of [-0.88, 0.88]) beam(context, rail, `receiving-rail-support-${x}`, [x, 1.28, -0.72], [x, 1.28, 0.7], 0.07, 0.07, iron, 'receiving-rail');
  beam(context, rail, 'empty-overhead-receiving-rail', [-1.16, 1.32, 0.18], [1.16, 1.32, 0.18], 0.1, 0.12, stainless, 'receiving-rail');
  for (const x of [-0.86, -0.28, 0.3, 0.88]) { box(context, rail, `rail-control-carriage-${x}`, [0.14, 0.12, 0.18], [x, 1.28, 0.18], iron, 'receiving-rail'); box(context, rail, `rail-carriage-stop-${x}`, [0.06, 0.18, 0.08], [x, 1.17, 0.18], stainless, 'receiving-rail'); }

  function workTable(id, x, z) { box(context, workTables, `${id}-top`, [0.92, 0.08, 0.62], [x, 0.75, z], stainless, 'work-tables'); for (const [dx, dz] of [[-0.39, -0.24], [0.39, -0.24], [-0.39, 0.24], [0.39, 0.24]]) box(context, workTables, `${id}-leg-${dx}-${dz}`, [0.07, 0.52, 0.07], [x + dx, 0.47, z + dz], iron, 'work-tables'); box(context, workTables, `${id}-lower-brace`, [0.72, 0.06, 0.42], [x, 0.42, z], iron, 'work-tables'); }
  workTable('empty-work-table-left', -0.72, -0.18); workTable('empty-work-table-right', 0.65, 0.47);

  box(context, wash, 'wash-sink-basin', [0.72, 0.22, 0.48], [-1.12, 0.7, 0.64], stainless, 'wash-sink');
  box(context, wash, 'wash-sink-back', [0.72, 0.42, 0.08], [-1.12, 0.88, 0.85], stainless, 'wash-sink');
  for (const x of [-1.4, -0.84]) box(context, wash, `wash-sink-leg-${x}`, [0.07, 0.5, 0.07], [x, 0.43, 0.64], iron, 'wash-sink');
  const faucet = mesh(context, wash, 'wash-faucet-arch', new THREE.TorusGeometry(0.14, 0.025, 6, 12, Math.PI), stainless, 'wash-sink'); faucet.position.set(-1.12, 1.13, 0.84); faucet.rotation.x = Math.PI / 2;
  box(context, drain, 'square-floor-drain', [0.32, 0.025, 0.32], [0.1, 0.255, 0.08], iron, 'drain');
  for (const offset of [-0.1, 0, 0.1]) box(context, drain, `drain-slot-${offset}`, [0.035, 0.018, 0.25], [0.1 + offset, 0.273, 0.08], stainless, 'drain');

  box(context, coldRoom, 'cold-room-frame-top', [0.92, 0.1, 0.12], [0.78, 1.55, -1.02], iron, 'cold-room');
  box(context, coldRoom, 'cold-room-frame-left', [0.1, 1.28, 0.12], [0.35, 0.9, -1.02], iron, 'cold-room');
  box(context, coldRoom, 'cold-room-frame-right', [0.1, 1.28, 0.12], [1.21, 0.9, -1.02], iron, 'cold-room');
  const coldDoor = addPivot(context, coldRoom, 'hinged-cold-room-door', [0.4, 0.28, -0.95]);
  box(context, coldDoor, 'insulated-cold-room-door-panel', [0.78, 1.22, 0.1], [0.39, 0.61, 0], panel, 'cold-room-door');
  box(context, coldDoor, 'cold-room-door-edge', [0.08, 1.24, 0.13], [0.76, 0.61, 0], iron, 'cold-room-door');
  box(context, coldDoor, 'cold-room-door-handle', [0.06, 0.24, 0.08], [0.68, 0.64, 0.09], iron, 'cold-room-door');
  coldDoor.userData.attachment = { parentId: 'cold-room-access', parentSocket: 'cold-room-hinge', localStart: [0.4, 0.28, -0.95], localEnd: [0.4, 1.5, -0.95], contactType: 'hinge', overlap: 0.025, gapTolerance: 0.005, evidenceRefs: ['butcher concept: insulated interior cold-room door'] };
  addChannel(context, coldDoor, 'rotation', 'y', 1.0, 0.54, 0);

  box(context, output, 'output-shutter-frame-top', [0.82, 0.12, 0.14], [1.57, 1.28, -0.12], iron, 'output-bay');
  box(context, output, 'clean-output-shutter', [0.08, 0.64, 0.74], [1.58, 0.94, -0.12], roof, 'output-bay');
  box(context, output, 'empty-output-counter', [0.42, 0.12, 0.88], [1.72, 0.62, -0.12], stainless, 'output-bay');
  for (const y of [0.78, 0.94, 1.1]) box(context, output, `shutter-slat-${y}`, [0.05, 0.055, 0.62], [1.64, y, -0.12], iron, 'output-bay');

  box(context, ventilation, 'high-ventilation-louver-back', [0.72, 0.42, 0.05], [-0.46, 1.37, -1.17], iron, 'ventilation');
  for (const y of [1.24, 1.35, 1.46]) { const slat = box(context, ventilation, `ventilation-slat-${y}`, [0.62, 0.045, 0.08], [-0.46, y, -1.2], roof, 'ventilation'); slat.rotation.x = -0.28; }
  box(context, power, 'exterior-power-cabinet', [0.12, 0.58, 0.42], [-1.63, 0.86, -0.42], stainless, 'power-service');
  box(context, power, 'power-cabinet-face', [0.04, 0.44, 0.3], [-1.7, 0.86, -0.42], iron, 'power-service');

  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, rail, 'input', [0, 1.25, 1.36]);
  addSocket(context, workTables, 'work', [0, 0.82, 0.2]);
  addSocket(context, output, 'output', [1.95, 0.72, -0.12]);
  addSocket(context, coldRoom, 'cold-room', [0.8, 0.82, -1.2]);
  addSocket(context, wash, 'water', [-1.12, 1.05, 0.84]);
  addSocket(context, drain, 'drain', [0.1, 0.28, 0.08]);
  addSocket(context, power, 'power', [-1.82, 0.86, -0.42]);
  addSocket(context, ventilation, 'ventilation', [-0.46, 1.46, -1.28]);
  addSocket(context, coldDoor, 'service', [0.65, 0.68, 0.22]);
  addSocket(context, building, 'attachment', [0, 2.02, 0]);
  addSocket(context, building, 'adjacency-left', [-2.18, 0.1, 0]);
  addSocket(context, building, 'adjacency-right', [2.18, 0.1, 0]);
  addSocket(context, building, 'adjacency-front', [0, 0.1, 1.58]);

  addCollider(context, building, 'building', 'box', [0, 1, 0], { width: 3.24, height: 2.04, depth: 2.26, isTrigger: false });
  addCollider(context, rail, 'receiving-rail', 'box', [0, 1.27, 0.18], { width: 2.46, height: 0.24, depth: 0.2, isTrigger: false });
  addCollider(context, workTables, 'work-table-left', 'box', [-0.72, 0.52, -0.18], { width: 0.96, height: 0.58, depth: 0.66, isTrigger: false });
  addCollider(context, workTables, 'work-table-right', 'box', [0.65, 0.52, 0.47], { width: 0.96, height: 0.58, depth: 0.66, isTrigger: false });
  addCollider(context, wash, 'wash-sink', 'box', [-1.12, 0.7, 0.64], { width: 0.76, height: 0.72, depth: 0.54, isTrigger: false });
  addCollider(context, coldDoor, 'cold-room-door', 'box', [0.39, 0.61, 0], { width: 0.82, height: 1.24, depth: 0.14, isTrigger: false });
  addCollider(context, output, 'product-output-bay', 'box', [1.7, 0.95, -0.12], { width: 0.48, height: 0.8, depth: 0.92, isTrigger: false });
  addCollider(context, building, 'input-loading-zone', 'box', [0, 0.58, 1.32], { width: 2.3, height: 0.92, depth: 0.5, isTrigger: true });
  addCollider(context, building, 'processing-service-zone', 'box', [0, 0.58, 0.12], { width: 2.54, height: 0.92, depth: 1.42, isTrigger: true });

  const root = finishAsset(context);
  root.userData.artDirection = { concept: 'references/concepts/butcher.png', identity: ['compact non-graphic butcher workshop', 'empty overhead receiving rail', 'two empty work tables', 'wash sink and floor drain', 'insulated cold-room door', 'empty output shutter'], motion: 'Only the visibly hinged cold-room door rotates.', correctionPasses: 1 };
  Object.defineProperty(root.userData, 'butcherRig', { value: { building, rail, workTables, wash, drain, coldRoom, coldDoor, output, ventilation, power }, enumerable: false, configurable: true });
  return root;
}

export function animateButcher(root, timeSeconds) {
  const door = root?.userData?.butcherRig?.coldDoor;
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!door || !channel) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  door.rotation.y = channel.baseValue + Math.max(0, Math.sin(time * channel.frequency + channel.phase)) * channel.amplitude;
  return root;
}
