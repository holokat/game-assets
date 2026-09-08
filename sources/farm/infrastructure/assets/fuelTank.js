import * as THREE from 'three';
import {
  addChannel,
  addCollider,
  addPivot,
  addSocket,
  createAssetContext,
  finishAsset,
  registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const FUEL_TANK_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);
const PASS_INDEX = new Map(FUEL_TANK_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
}

function makeMaterials() {
  return {
    tank: material('fuel-tank-muted-teal-steel-mat', '#546f70', 0.76, 0.24),
    galvanized: material('fuel-tank-pale-galvanized-mat', '#939a91', 0.72, 0.38),
    iron: material('fuel-tank-dark-iron-mat', '#303638', 0.58, 0.54),
    valve: material('fuel-tank-rust-valve-mat', '#92552f', 0.76, 0.2),
    gauge: material('fuel-tank-cream-gauge-mat', '#d2c290', 0.7, 0.08),
  };
}

function box(width, height, depth) {
  return new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
}

function xCylinder(radius, length, segments = 12) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function zCylinder(radius, length, segments = 8) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass);
}

export function createFuelTank(options = {}) {
  const passId = FUEL_TANK_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('fuel-tank', { label: 'Fuel Tank', targetHeightMetres: 2.0, passId });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'fuel-input', [0, 1.96, 0]);
  addSocket(context, model, 'fuel-output', [-0.82, 1.06, 1.0]);
  addSocket(context, model, 'service', [1.54, 1.22, 0]);
  addSocket(context, model, 'level-gauge', [0, 1.2, 0.76]);
  addSocket(context, model, 'spill-containment', [0, 0.16, 0]);
  addSocket(context, model, 'top-attachment', [0, 2.0, 0]);
  addSocket(context, model, 'rear-attachment', [0, 1.16, -0.72]);
  addSocket(context, model, 'adjacency-left', [-1.82, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [1.82, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 1.18]);
  addSocket(context, model, 'adjacency-rear', [0, 0.1, -1.18]);

  const tray = addPivot(context, model, 'containment-tray');
  const trayFloor = mesh(context, tray, 'containment-floor', box(3.45, 0.1, 2.05), context.materials.galvanized, 'containment-tray');
  trayFloor.position.y = 0.05;
  for (const [id, width, depth, x, z] of [
    ['front', 3.45, 0.12, 0, 0.965], ['rear', 3.45, 0.12, 0, -0.965],
    ['left', 0.12, 1.82, -1.665, 0], ['right', 0.12, 1.82, 1.665, 0],
  ]) {
    const lip = mesh(context, tray, `containment-${id}-lip`, box(width, 0.3, depth), context.materials.galvanized, 'containment-tray', 'structural-pass');
    lip.position.set(x, 0.2, z);
  }
  addCollider(context, tray, 'containment-tray', 'box', [0, 0.16, 0], { width: 3.45, height: 0.32, depth: 2.05, isTrigger: false });

  const supports = addPivot(context, model, 'cradle-supports');
  for (const [index, x] of [-0.86, 0.86].entries()) {
    const base = mesh(context, supports, `cradle-${index + 1}-base`, box(0.48, 0.18, 1.18), context.materials.galvanized, 'cradle-supports', 'structural-pass');
    base.position.set(x, 0.24, 0);
    for (const [side, z, rotationX] of [['front', 0.34, -0.46], ['rear', -0.34, 0.46]]) {
      const brace = mesh(context, supports, `cradle-${index + 1}-${side}-brace`, box(0.34, 0.76, 0.18), context.materials.galvanized, 'cradle-supports', 'structural-pass');
      brace.position.set(x, 0.58, z);
      brace.rotation.x = rotationX;
    }
  }
  addCollider(context, supports, 'cradle-supports', 'box', [0, 0.48, 0], { width: 2.25, height: 0.78, depth: 1.22, isTrigger: false });

  const vessel = addPivot(context, model, 'tank-vessel', [0, 1.24, 0]);
  const shell = mesh(context, vessel, 'tank-shell', xCylinder(0.66, 2.56, 12), context.materials.tank, 'tank-vessel');
  for (const [index, x] of [-0.82, 0.82].entries()) {
    const band = mesh(context, vessel, `support-band-${index + 1}`, new THREE.TorusGeometry(0.685, 0.035, 5, 12), context.materials.iron, 'support-bands', 'structural-pass');
    band.position.x = x;
    band.rotation.y = Math.PI / 2;
    const lug = mesh(context, vessel, `lifting-lug-${index + 1}`, new THREE.TorusGeometry(0.12, 0.035, 5, 8, Math.PI), context.materials.iron, 'support-bands', 'surface-pass');
    lug.position.set(x, 0.69, 0);
    lug.rotation.z = Math.PI;
  }
  addCollider(context, vessel, 'tank-vessel', 'cylinder', [0, 0, 0], { radius: 0.66, height: 2.56, axis: 'x', isTrigger: false });

  const filler = addPivot(context, vessel, 'fill-neck', [0, 0.62, 0]);
  const neck = mesh(context, filler, 'fill-neck-body', new THREE.CylinderGeometry(0.16, 0.18, 0.22, 8), context.materials.tank, 'fill-neck', 'form-refinement');
  neck.position.y = 0.1;
  const cap = mesh(context, filler, 'fill-cap', new THREE.CylinderGeometry(0.24, 0.24, 0.1, 8), context.materials.iron, 'fill-neck', 'surface-pass');
  cap.position.y = 0.26;
  addSocket(context, filler, 'fill-cap-grip', [0, 0.31, 0]);

  const gauge = addPivot(context, vessel, 'protected-level-gauge', [0, 0, 0.68]);
  for (const x of [-0.14, 0.14]) {
    const rail = mesh(context, gauge, `gauge-rail-${x}`, box(0.07, 0.78, 0.07), context.materials.iron, 'level-gauge', 'structural-pass');
    rail.position.set(x, 0, 0);
  }
  for (const y of [-0.38, 0.38]) {
    const rail = mesh(context, gauge, `gauge-end-${y}`, box(0.34, 0.07, 0.07), context.materials.iron, 'level-gauge', 'structural-pass');
    rail.position.set(0, y, 0);
  }
  const gaugeColumn = mesh(context, gauge, 'gauge-column', box(0.08, 0.62, 0.06), context.materials.gauge, 'level-gauge', 'form-refinement');
  gaugeColumn.position.z = 0.045;

  const outlet = addPivot(context, model, 'outlet-valve', [-0.82, 1.06, 0.62]);
  const flange = mesh(context, outlet, 'outlet-flange', zCylinder(0.18, 0.12, 8), context.materials.iron, 'outlet-valve', 'structural-pass');
  flange.position.z = 0.04;
  const pipe = mesh(context, outlet, 'outlet-pipe', zCylinder(0.1, 0.56, 8), context.materials.iron, 'outlet-valve', 'form-refinement');
  pipe.position.z = 0.28;
  const valveWheel = addPivot(context, outlet, 'valve-handwheel', [0, 0.2, 0.42]);
  const wheel = mesh(context, valveWheel, 'valve-wheel-rim', new THREE.TorusGeometry(0.19, 0.035, 5, 8), context.materials.valve, 'outlet-valve', 'interaction-pass');
  for (const rotationZ of [0, Math.PI / 2]) {
    const spoke = mesh(context, valveWheel, `valve-wheel-spoke-${rotationZ}`, box(0.34, 0.045, 0.045), context.materials.valve, 'outlet-valve', 'interaction-pass');
    spoke.rotation.z = rotationZ;
  }
  addChannel(context, valveWheel, 'rotation', 'z', 1.1, 0.72, 0);
  addSocket(context, valveWheel, 'valve-control', [0, 0, 0.06]);
  addCollider(context, outlet, 'outlet-valve', 'capsule-chain', [0, 0.1, 0.28], { radius: 0.2, height: 0.68, isTrigger: false });

  const service = addPivot(context, vessel, 'rear-service-hatch', [0.68, 0, -0.63]);
  const servicePlate = mesh(context, service, 'service-hatch-plate', zCylinder(0.25, 0.08, 8), context.materials.iron, 'service-hatch', 'form-refinement');
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const bolt = mesh(context, service, `service-hatch-bolt-${index + 1}`, zCylinder(0.035, 0.05, 6), context.materials.gauge, 'service-hatch', 'surface-pass');
    bolt.position.set(Math.cos(angle) * 0.17, Math.sin(angle) * 0.17, -0.06);
  }

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.0,
    note: 'Lean stylized low-poly Fuel Tank reconstructed from the generated four-view concept sheet.',
    cradleCount: 2,
    supportBandCount: 2,
    palette: ['muted teal steel', 'pale galvanized support', 'dark iron', 'rust valve', 'cream gauge'],
    motion: 'Only the visible outlet handwheel rotates.',
  };
  root.userData.fuelTankRig = { tray, supports, vessel, filler, gauge, outlet, valveWheel, service };
  root.userData.applyPassState = (nextPassId) => applyFuelTankPassState(root, nextPassId);
  applyFuelTankPassState(root, passId);
  return root;
}

export function applyFuelTankPassState(root, passId = 'optimization-pass') {
  const selectedPass = FUEL_TANK_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['fuel-tank-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'fuel-tank-blockout-mat', color: '#a49b8f', roughness: 0.93, flatShading: true,
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

export function animateFuelTank(root, timeSeconds, intensity = 1) {
  const valveWheel = root?.userData?.fuelTankRig?.valveWheel;
  if (!valveWheel) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  valveWheel.rotation.z = Math.sin(time * 0.72) * 1.1 * Math.max(0, intensity);
  return root;
}
