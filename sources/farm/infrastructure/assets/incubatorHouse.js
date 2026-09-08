import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.68, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group);
function box(context, parent, id, size, position, surface, group) { const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group); part.position.set(...position); return part; }

function addCabinetBank(context, parent, id, x, panel, iron) {
  const bank = addPivot(context, parent, `${id}-incubator-cabinet-bank`);
  box(context, bank, `${id}-cabinet-body`, [0.7, 1.26, 0.48], [x, 0.86, 0.38], panel, 'incubator-cabinets');
  box(context, bank, `${id}-cabinet-front-frame`, [0.58, 1.12, 0.05], [x, 0.86, 0.635], iron, 'incubator-cabinets');
  box(context, bank, `${id}-cabinet-recess`, [0.46, 0.96, 0.035], [x, 0.85, 0.67], panel, 'incubator-cabinets');
  for (let index = 0; index < 7; index += 1) {
    const y = 0.48 + index * 0.125;
    box(context, bank, `${id}-tray-slot-${index + 1}`, [0.43, 0.035, 0.07], [x, y, 0.705], iron, 'incubator-cabinets');
  }
  for (const footX of [x - 0.24, x + 0.24]) box(context, bank, `${id}-cabinet-foot-${footX}`, [0.08, 0.16, 0.08], [footX, 0.18, 0.38], iron, 'incubator-cabinets');
  bank.userData.equipmentIntent = 'empty incubator cabinet bank with visible shallow tray slots';
  return bank;
}

export function createIncubatorHouse() {
  const context = createAssetContext('incubator-house', { label: 'Incubator House', style: 'compact climate-controlled low-poly incubation building' });
  const { model } = context;
  const stone = material('incubator-house-stone-curb', '#80796e', 0.9);
  const panel = material('incubator-house-insulated-panel', '#c9c9bd', 0.76);
  const roof = material('incubator-house-galvanized-roof-hvac', '#6c787c', 0.44, 0.2);
  const iron = material('incubator-house-dark-technical-trim', '#343d40', 0.5, 0.28);
  const equipment = material('incubator-house-clean-equipment', '#989b95', 0.58, 0.08);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const building = addPivot(context, model, 'climate-controlled-building');
  const openSection = addPivot(context, building, 'open-incubator-service-section');
  const leftBank = addCabinetBank(context, openSection, 'left', -0.46, equipment, iron);
  const rightBank = addCabinetBank(context, openSection, 'right', 0.46, equipment, iron);
  const ventilation = addPivot(context, building, 'ventilation-hvac-system');
  const powerService = addPivot(context, building, 'power-service-access');

  box(context, building, 'narrow-stone-foundation', [3.16, 0.18, 2.26], [0, 0.09, 0], stone, 'foundation');
  box(context, building, 'rear-insulated-wall', [2.94, 1.52, 0.12], [0, 0.94, -1.02], panel, 'insulated-shell');
  box(context, building, 'left-insulated-wall', [0.12, 1.52, 1.98], [-1.42, 0.94, 0], panel, 'insulated-shell');
  box(context, building, 'right-insulated-wall', [0.12, 1.52, 1.98], [1.42, 0.94, 0], panel, 'insulated-shell');
  box(context, building, 'front-left-insulated-return', [0.72, 1.52, 0.12], [-1.08, 0.94, 1.02], panel, 'insulated-shell');
  box(context, building, 'front-right-insulated-return', [0.72, 1.52, 0.12], [1.08, 0.94, 1.02], panel, 'insulated-shell');
  box(context, building, 'front-service-header', [1.5, 0.26, 0.16], [0, 1.57, 1.02], iron, 'technical-frame');
  for (const x of [-1.44, -0.74, 0.74, 1.44]) box(context, building, `vertical-technical-post-${x}`, [0.1, 1.72, 0.1], [x, 0.95, 1.05], iron, 'technical-frame');
  const roofSlab = box(context, building, 'shallow-galvanized-roof', [3.2, 0.1, 2.28], [0, 1.82, -0.02], roof, 'roof');
  roofSlab.rotation.z = -0.035;
  box(context, building, 'front-loading-threshold', [1.5, 0.08, 0.5], [0, 0.22, 1.13], equipment, 'service-floor');
  box(context, openSection, 'dark-service-bay-back', [1.44, 1.36, 0.08], [0, 0.9, 0.08], iron, 'technical-frame');

  for (const x of [-0.52, 0.52]) {
    box(context, ventilation, `upper-louver-back-${x}`, [0.42, 0.34, 0.05], [x, 1.31, -1.1], iron, 'ventilation-hvac');
    for (const y of [1.2, 1.3, 1.4]) {
      const slat = box(context, ventilation, `upper-louver-${x}-${y}`, [0.34, 0.04, 0.08], [x, y, -1.14], roof, 'ventilation-hvac');
      slat.rotation.x = -0.28;
    }
  }
  box(context, ventilation, 'compact-condenser-body', [0.7, 0.62, 0.36], [-1.68, 0.62, -0.22], equipment, 'ventilation-hvac');
  const fanGuard = mesh(context, ventilation, 'condenser-fan-guard', new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), iron, 'ventilation-hvac');
  fanGuard.position.set(-1.875, 0.64, -0.22); fanGuard.rotation.z = Math.PI / 2;
  for (const offset of [-0.1, 0, 0.1]) box(context, ventilation, `condenser-vent-${offset}`, [0.04, 0.43, 0.04], [-1.91, 0.64, -0.22 + offset], roof, 'ventilation-hvac');
  box(context, ventilation, 'condenser-support', [0.78, 0.08, 0.46], [-1.66, 0.29, -0.22], iron, 'ventilation-hvac');

  box(context, powerService, 'power-service-panel', [0.12, 0.52, 0.4], [1.52, 0.88, -0.38], equipment, 'power-service');
  box(context, powerService, 'power-panel-face', [0.04, 0.38, 0.28], [1.59, 0.88, -0.38], iron, 'power-service');

  const serviceDoor = addPivot(context, building, 'side-service-door', [1.5, 0.24, 0.72]);
  box(context, serviceDoor, 'service-door-panel', [0.08, 1.24, 0.68], [0, 0.62, -0.34], panel, 'service-door');
  box(context, serviceDoor, 'service-door-frame', [0.11, 1.3, 0.08], [0.02, 0.65, -0.67], iron, 'service-door');
  box(context, serviceDoor, 'service-door-handle', [0.12, 0.24, 0.06], [-0.07, 0.66, -0.1], iron, 'service-door');
  serviceDoor.userData.attachment = { parentId: 'climate-controlled-building', parentSocket: 'side-service-hinge', localStart: [1.5, 0.24, 0.72], localEnd: [1.5, 1.48, 0.72], contactType: 'hinge', overlap: 0.025, gapTolerance: 0.005, evidenceRefs: ['incubator-house concept: side service door'] };
  addChannel(context, serviceDoor, 'rotation', 'y', 1.0, 0.56, 0);

  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, openSection, 'egg-input', [-0.48, 0.36, 1.4]);
  addSocket(context, openSection, 'hatch-output', [0.48, 0.36, 1.4]);
  addSocket(context, powerService, 'power', [1.72, 0.88, -0.38]);
  addSocket(context, ventilation, 'ventilation', [-1.92, 0.72, -0.22]);
  addSocket(context, serviceDoor, 'service', [0.14, 0.56, -0.34]);
  addSocket(context, building, 'attachment', [0, 1.88, 0]);
  addSocket(context, building, 'adjacency-left', [-2.02, 0.1, 0]);
  addSocket(context, building, 'adjacency-right', [2.02, 0.1, 0]);

  addCollider(context, building, 'building', 'box', [0, 0.98, 0], { width: 3.0, height: 1.88, depth: 2.12, isTrigger: false });
  addCollider(context, leftBank, 'left-incubator-bank', 'box', [-0.46, 0.86, 0.38], { width: 0.74, height: 1.3, depth: 0.52, isTrigger: false });
  addCollider(context, rightBank, 'right-incubator-bank', 'box', [0.46, 0.86, 0.38], { width: 0.74, height: 1.3, depth: 0.52, isTrigger: false });
  addCollider(context, serviceDoor, 'service-door', 'box', [0, 0.62, -0.34], { width: 0.12, height: 1.24, depth: 0.68, isTrigger: false });
  addCollider(context, ventilation, 'condenser', 'box', [-1.68, 0.62, -0.22], { width: 0.76, height: 0.7, depth: 0.44, isTrigger: false });
  addCollider(context, openSection, 'input-output-service-zone', 'box', [0, 0.55, 1.22], { width: 1.5, height: 0.7, depth: 0.5, isTrigger: true });

  const root = finishAsset(context);
  root.userData.artDirection = { concept: 'references/concepts/incubator-house.png', identity: ['compact climate-controlled insulated shell', 'open service section with two organized incubator cabinet banks', 'compact condenser and paired louvers', 'power service access'], motion: 'Only the side service door rotates.', correctionPasses: 0 };
  Object.defineProperty(root.userData, 'incubatorHouseRig', { value: { building, openSection, leftBank, rightBank, ventilation, powerService, serviceDoor }, enumerable: false, configurable: true });
  return root;
}

export function animateIncubatorHouse(root, timeSeconds) {
  const door = root?.userData?.incubatorHouseRig?.serviceDoor; const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!door || !channel) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  door.rotation.y = channel.baseValue + Math.max(0, Math.sin(time * channel.frequency + channel.phase)) * channel.amplitude; return root;
}
