import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group);
function box(context, parent, id, size, position, surface, group) { const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group); part.position.set(...position); return part; }
function addStallGate(context, parent, id, position, timber, iron, movable = false) {
  const gate = addPivot(context, parent, `${id}-stall-gate`, position);
  box(context, gate, `${id}-gate-left-frame`, [0.09, 0.78, 0.08], [0.045, 0.39, 0], iron, 'stalls');
  box(context, gate, `${id}-gate-right-frame`, [0.09, 0.78, 0.08], [0.905, 0.39, 0], iron, 'stalls');
  box(context, gate, `${id}-gate-top-frame`, [0.95, 0.09, 0.08], [0.475, 0.735, 0], iron, 'stalls');
  box(context, gate, `${id}-gate-bottom-frame`, [0.95, 0.09, 0.08], [0.475, 0.045, 0], iron, 'stalls');
  for (const x of [0.2, 0.37, 0.54, 0.71]) box(context, gate, `${id}-gate-slat-${x}`, [0.06, 0.58, 0.055], [x, 0.39, 0], timber, 'stalls');
  box(context, gate, `${id}-gate-latch`, [0.16, 0.07, 0.11], [0.88, 0.5, 0.08], iron, 'gate-hardware');
  if (movable) {
    gate.userData.attachment = { parentId: 'two-stall-milking-structure', parentSocket: 'left-stall-hinge', localStart: position, localEnd: [position[0], position[1] + 0.78, position[2]], contactType: 'hinge', overlap: 0.025, gapTolerance: 0.005, evidenceRefs: ['milking-shed concept: left front stall gate'] };
    addChannel(context, gate, 'rotation', 'y', 1.02, 0.62, 0);
  }
  return gate;
}

export function createMilkingShed() {
  const context = createAssetContext('milking-shed', { label: 'Milking Shed', style: 'small practical two-stall low-poly working shed' });
  const { model } = context;
  const stone = material('milking-shed-stone-curb', '#81796e', 0.9);
  const timber = material('milking-shed-weathered-timber', '#785a3d', 0.8);
  const roof = material('milking-shed-galvanized-roof', '#6e7b7e', 0.44, 0.2);
  const iron = material('milking-shed-dark-iron', '#343d3e', 0.5, 0.32);
  const service = material('milking-shed-clean-service-fixtures', '#a2a49a', 0.55, 0.08);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const shed = addPivot(context, model, 'two-stall-milking-structure');
  const leftStall = addPivot(context, shed, 'left-milking-stall');
  const rightStall = addPivot(context, shed, 'right-milking-stall');
  const aisle = addPivot(context, shed, 'central-service-aisle');
  const milkBay = addPivot(context, shed, 'milk-collection-storage-bay');
  const washBay = addPivot(context, shed, 'wash-service-zone');
  const ventilation = addPivot(context, shed, 'high-ventilation-system');

  box(context, shed, 'low-stone-foundation', [3.28, 0.16, 2.38], [0, 0.08, 0], stone, 'foundation');
  box(context, shed, 'rear-timber-wall', [3.08, 1.38, 0.12], [0, 0.86, -1.08], timber, 'structure');
  box(context, shed, 'left-timber-wall', [0.12, 1.38, 2.12], [-1.48, 0.86, 0], timber, 'structure');
  box(context, shed, 'right-timber-wall', [0.12, 1.38, 2.12], [1.48, 0.86, 0], timber, 'structure');
  for (const x of [-1.45, -0.5, 0.5, 1.45]) box(context, shed, `front-structural-post-${x}`, [0.11, 1.58, 0.11], [x, 0.89, 1.08], iron, 'frame');
  for (const x of [-0.42, 0.42]) box(context, shed, `stall-divider-${x}`, [0.09, 0.96, 1.58], [x, 0.58, -0.12], timber, 'stalls');

  const aisleFloor = box(context, aisle, 'central-washable-aisle-floor', [0.68, 0.06, 1.98], [0, 0.19, 0], service, 'aisle');
  aisleFloor.userData.surfaceIntent = 'washable central service aisle';
  box(context, leftStall, 'left-stall-floor', [0.9, 0.06, 1.82], [-0.94, 0.19, -0.06], stone, 'stalls');
  box(context, rightStall, 'right-stall-floor', [0.9, 0.06, 1.82], [0.94, 0.19, -0.06], stone, 'stalls');

  const leftGate = addStallGate(context, shed, 'left', [-1.42, 0.21, 1.1], timber, iron, true);
  const rightGate = addStallGate(context, shed, 'right', [0.5, 0.21, 1.1], timber, iron, false);

  for (const z of [-0.5, 0.5]) {
    const slope = box(context, shed, `shallow-roof-slope-${z}`, [3.4, 0.09, 1.28], [0, 1.72, z], roof, 'roof');
    slope.rotation.x = z < 0 ? 0.34 : -0.34;
  }
  box(context, ventilation, 'narrow-ridge-vent-base', [3.12, 0.1, 0.18], [0, 1.9, 0], iron, 'ventilation');
  box(context, ventilation, 'narrow-ridge-vent-cap', [3.28, 0.08, 0.3], [0, 2.0, 0], roof, 'ventilation');

  for (const x of [-0.78, 0.78]) {
    box(context, ventilation, `rear-louver-back-${x}`, [0.58, 0.4, 0.05], [x, 1.25, -1.15], iron, 'ventilation');
    for (const y of [1.12, 1.23, 1.34]) {
      const slat = box(context, ventilation, `rear-louver-${x}-${y}`, [0.5, 0.045, 0.08], [x, y, -1.19], roof, 'ventilation');
      slat.rotation.x = -0.28;
    }
  }

  box(context, milkBay, 'compact-milk-storage-cabinet', [0.58, 0.72, 0.5], [1.78, 0.46, 0.56], timber, 'milk-storage');
  box(context, milkBay, 'milk-cabinet-door', [0.44, 0.5, 0.05], [1.78, 0.46, 0.825], iron, 'milk-storage');
  const vessel = mesh(context, milkBay, 'small-lidded-milk-vessel', new THREE.CylinderGeometry(0.17, 0.2, 0.43, 10), service, 'milk-storage');
  vessel.position.set(1.78, 1.04, 0.56);
  const vesselLid = mesh(context, milkBay, 'milk-vessel-lid', new THREE.CylinderGeometry(0.11, 0.16, 0.08, 10), service, 'milk-storage');
  vesselLid.position.set(1.78, 1.295, 0.56);

  box(context, washBay, 'exterior-wash-basin', [0.55, 0.24, 0.38], [-1.77, 0.62, 0.5], service, 'wash-service');
  box(context, washBay, 'wash-basin-inset', [0.4, 0.06, 0.24], [-1.77, 0.77, 0.5], iron, 'wash-service');
  box(context, washBay, 'wash-tap-upright', [0.06, 0.34, 0.06], [-1.77, 0.97, 0.33], iron, 'wash-service');
  const serviceDoor = addPivot(context, washBay, 'side-service-door', [-1.55, 0.25, -0.25]);
  box(context, serviceDoor, 'service-door-panel', [0.06, 1.02, 0.62], [0, 0.51, 0], timber, 'wash-service');
  box(context, serviceDoor, 'service-door-brace', [0.08, 1.02, 0.08], [-0.04, 0.51, 0], iron, 'wash-service').rotation.x = -0.5;

  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, model, 'livestock-entry', [0, 0.15, 1.45]);
  addSocket(context, leftStall, 'stall-left', [-0.94, 0.3, 0]);
  addSocket(context, rightStall, 'stall-right', [0.94, 0.3, 0]);
  addSocket(context, aisle, 'aisle', [0, 0.25, 0.8]);
  addSocket(context, milkBay, 'milk-output', [1.78, 0.9, 0.9]);
  addSocket(context, milkBay, 'storage', [1.78, 0.5, 0.56]);
  addSocket(context, washBay, 'wash', [-1.77, 0.72, 0.5]);
  addSocket(context, washBay, 'service', [-1.82, 0.55, -0.25]);
  addSocket(context, ventilation, 'ventilation', [0, 1.95, 0]);
  addSocket(context, shed, 'attachment', [0, 2.02, 0]);
  addSocket(context, shed, 'adjacency-left', [-2.12, 0.1, 0]);
  addSocket(context, shed, 'adjacency-right', [2.12, 0.1, 0]);

  addCollider(context, shed, 'building', 'box', [0, 1.0, 0], { width: 3.18, height: 2, depth: 2.22, isTrigger: false });
  addCollider(context, leftStall, 'left-stall', 'box', [-0.94, 0.54, -0.06], { width: 0.94, height: 0.9, depth: 1.84, isTrigger: true });
  addCollider(context, rightStall, 'right-stall', 'box', [0.94, 0.54, -0.06], { width: 0.94, height: 0.9, depth: 1.84, isTrigger: true });
  addCollider(context, aisle, 'service-aisle', 'box', [0, 0.45, 0], { width: 0.7, height: 0.6, depth: 2, isTrigger: true });
  addCollider(context, leftGate, 'left-stall-gate', 'box', [0.475, 0.39, 0], { width: 0.95, height: 0.78, depth: 0.12, isTrigger: false });
  addCollider(context, milkBay, 'milk-storage', 'box', [1.78, 0.7, 0.56], { width: 0.62, height: 1.4, depth: 0.56, isTrigger: false });
  addCollider(context, washBay, 'wash-service', 'box', [-1.77, 0.65, 0.15], { width: 0.62, height: 1.3, depth: 1.4, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = { concept: 'references/concepts/milking-shed.png', identity: ['exactly two stalls', 'central service aisle', 'milk collection cabinet and vessel', 'wash basin and service door', 'louver and ridge ventilation'], motion: 'Only the left front stall gate rotates.', correctionPasses: 0 };
  Object.defineProperty(root.userData, 'milkingShedRig', { value: { shed, leftStall, rightStall, aisle, leftGate, rightGate, milkBay, washBay, ventilation }, enumerable: false, configurable: true });
  return root;
}

export function animateMilkingShed(root, timeSeconds) {
  const gate = root?.userData?.milkingShedRig?.leftGate; const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!gate || !channel) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  gate.rotation.y = channel.baseValue + Math.max(0, Math.sin(time * channel.frequency + channel.phase)) * channel.amplitude; return root;
}
