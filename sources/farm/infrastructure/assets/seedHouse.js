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

export const SEED_HOUSE_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(SEED_HOUSE_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness,
    flatShading: true,
    vertexColors: true,
  });
}

function makeMaterials() {
  return {
    timber: material('seed-house-warm-timber-mat', '#765033', 0.88),
    frame: material('seed-house-dark-timber-frame-mat', '#463425', 0.86),
    metal: material('seed-house-galvanized-roof-mat', '#778287', 0.72, 0.42),
    bin: material('seed-house-cream-bin-mat', '#b5a37f', 0.9),
    iron: material('seed-house-dark-iron-mat', '#303437', 0.62, 0.5),
  };
}

function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(
    context,
    parent,
    id,
    new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue),
    group,
    minimumPass,
  );
}

function box(width, height, depth) {
  return new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
}

function xCylinder(radius, length, segments = 8, openEnded = false) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, openEnded);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function addGable(context, parent, id, z) {
  const shape = new THREE.Shape();
  shape.moveTo(-1.08, 0);
  shape.lineTo(0, 0.5);
  shape.lineTo(1.08, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, steps: 1 });
  const gable = mesh(context, parent, `${id}-gable`, geometry, context.materials.timber, 'building-shell', 'structural-pass');
  gable.position.set(0, 2.25, z - 0.04);
  return gable;
}

export function createSeedHouse(options = {}) {
  const passId = SEED_HOUSE_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('seed-house', {
    label: 'Seed House',
    targetHeightMetres: 2.84,
    passId,
  });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, model, 'service', [2.08, 1.5, 0.16]);
  addSocket(context, model, 'loading', [2.08, 0.98, 0.16]);
  addSocket(context, model, 'roof-attachment', [0, 2.83, 0]);
  addSocket(context, model, 'rear-attachment', [0, 1.1, -1.04]);
  addSocket(context, model, 'adjacency-left', [-1.36, 0.18, 0]);
  addSocket(context, model, 'adjacency-right', [2.22, 0.18, 0]);

  const building = addPivot(context, model, 'building-shell');
  const floor = mesh(context, building, 'floor', box(2.2, 0.14, 1.8), context.materials.frame, 'building-shell');
  floor.position.y = 0.23;
  for (const [id, x, z] of [
    ['front-left', -1.0, 0.82],
    ['front-right', 1.0, 0.82],
    ['rear-left', -1.0, -0.82],
    ['rear-right', 1.0, -0.82],
  ]) {
    const foot = mesh(context, building, `${id}-foot`, box(0.24, 0.28, 0.24), context.materials.frame, 'building-frame');
    foot.position.set(x, 0.14, z);
    const post = mesh(context, building, `${id}-post`, box(0.15, 2.18, 0.15), context.materials.frame, 'building-frame', 'structural-pass');
    post.position.set(x, 1.35, z);
  }

  const frontWall = mesh(context, building, 'front-wall', box(2.0, 1.98, 0.12), context.materials.timber, 'building-shell');
  frontWall.position.set(0, 1.31, 0.82);
  const rearWall = mesh(context, building, 'rear-wall', box(2.0, 1.98, 0.12), context.materials.timber, 'building-shell');
  rearWall.position.set(0, 1.31, -0.82);
  const leftWall = mesh(context, building, 'left-wall', box(0.12, 1.98, 1.52), context.materials.timber, 'building-shell');
  leftWall.position.set(-1, 1.31, 0);
  const rightWall = mesh(context, building, 'right-wall', box(0.12, 1.98, 1.52), context.materials.timber, 'building-shell');
  rightWall.position.set(1, 1.31, 0);
  addGable(context, building, 'front', 0.86);
  addGable(context, building, 'rear', -0.86);
  addCollider(context, building, 'building-body', 'box', [0, 1.3, 0], {
    width: 2.2,
    height: 2.6,
    depth: 1.86,
    isTrigger: false,
  });

  const roof = addPivot(context, model, 'pitched-roof');
  for (const [id, x, rotationZ] of [['left', -0.62, 0.42], ['right', 0.62, -0.42]]) {
    const panel = mesh(context, roof, `${id}-roof-panel`, box(1.45, 0.09, 2.08), context.materials.metal, 'pitched-roof');
    panel.position.set(x, 2.5, 0);
    panel.rotation.z = rotationZ;
  }
  const ridge = mesh(context, roof, 'roof-ridge', box(0.14, 0.12, 2.14), context.materials.iron, 'pitched-roof', 'surface-pass');
  ridge.position.set(0, 2.82, 0);
  addCollider(context, roof, 'pitched-roof', 'box', [0, 2.53, 0], {
    width: 2.55,
    height: 0.68,
    depth: 2.16,
    isTrigger: false,
  });

  const door = addPivot(context, model, 'front-door', [-0.82, 0.34, 0.9]);
  const doorLeaf = mesh(context, door, 'front-door-leaf', box(0.88, 1.78, 0.09), context.materials.timber, 'front-door', 'form-refinement');
  doorLeaf.position.set(0.44, 0.89, 0);
  for (const y of [0.55, 1.42]) {
    const hinge = mesh(context, door, `door-hinge-${y}`, box(0.28, 0.06, 0.06), context.materials.iron, 'front-door', 'surface-pass');
    hinge.position.set(0.13, y, 0.07);
  }
  const latch = mesh(context, door, 'door-latch', box(0.08, 0.2, 0.08), context.materials.iron, 'front-door', 'surface-pass');
  latch.position.set(0.76, 0.88, 0.08);
  addSocket(context, door, 'door-control', [0.76, 0.88, 0.1]);
  addCollider(context, door, 'front-door', 'box', [0.44, 0.89, 0], {
    width: 0.9,
    height: 1.8,
    depth: 0.12,
    isTrigger: false,
  });

  const vent = addPivot(context, model, 'side-vent', [-1.08, 1.55, -0.1]);
  const ventBack = mesh(context, vent, 'vent-back', box(0.06, 0.7, 0.72), context.materials.iron, 'side-vent', 'form-refinement');
  for (let index = 0; index < 4; index += 1) {
    const slat = mesh(context, vent, `vent-slat-${index + 1}`, box(0.1, 0.08, 0.58), context.materials.frame, 'side-vent', 'surface-pass');
    slat.position.set(-0.04, -0.24 + index * 0.16, 0);
    slat.rotation.z = -0.12;
  }

  const service = addPivot(context, model, 'service-bay');
  const shelf = mesh(context, service, 'loading-shelf', box(1.02, 0.13, 1.48), context.materials.frame, 'service-bay', 'structural-pass');
  shelf.position.set(1.5, 0.98, 0.08);
  const awning = mesh(context, service, 'service-awning', box(1.18, 0.09, 1.72), context.materials.metal, 'service-bay', 'structural-pass');
  awning.position.set(1.5, 2.18, 0.04);
  awning.rotation.z = -0.2;
  for (const z of [-0.68, 0.68]) {
    const support = mesh(context, service, `awning-support-${z < 0 ? 'rear' : 'front'}`, box(0.12, 1.12, 0.12), context.materials.frame, 'service-bay', 'structural-pass');
    support.position.set(1.95, 1.57, z);
  }
  addCollider(context, service, 'service-bay', 'box', [1.55, 1.15, 0.04], {
    width: 1.15,
    height: 2.25,
    depth: 1.62,
    isTrigger: false,
  });

  const bins = addPivot(context, service, 'seed-bins');
  for (const [index, z] of [-0.48, 0, 0.48].entries()) {
    const binBody = mesh(context, bins, `seed-bin-${index + 1}`, box(0.6, 0.5, 0.4), context.materials.bin, 'seed-bins', 'form-refinement');
    binBody.position.set(1.5, 0.66, z);
    const rim = mesh(context, bins, `seed-bin-${index + 1}-rim`, box(0.64, 0.06, 0.44), context.materials.iron, 'seed-bins', 'surface-pass');
    rim.position.set(1.5, 0.92, z);
  }

  const cleaner = addPivot(context, service, 'cleaner-drum', [1.49, 1.55, 0.12]);
  mesh(context, cleaner, 'cleaner-drum-shell', xCylinder(0.32, 0.68, 10), context.materials.timber, 'cleaner-drum', 'form-refinement');
  for (const x of [-0.29, 0.29]) {
    const band = mesh(context, cleaner, `cleaner-band-${x < 0 ? 'left' : 'right'}`, new THREE.TorusGeometry(0.33, 0.025, 4, 10), context.materials.iron, 'cleaner-drum', 'surface-pass');
    band.position.x = x;
    band.rotation.y = Math.PI / 2;
  }
  const axle = mesh(context, cleaner, 'cleaner-axle', xCylinder(0.055, 0.92, 8), context.materials.iron, 'cleaner-drum', 'structural-pass');
  const crankArm = mesh(context, cleaner, 'crank-arm', box(0.08, 0.36, 0.08), context.materials.iron, 'cleaner-drum', 'surface-pass');
  crankArm.position.set(0.51, -0.18, 0);
  const crankGrip = mesh(context, cleaner, 'crank-grip', xCylinder(0.045, 0.22, 6), context.materials.iron, 'cleaner-drum', 'surface-pass');
  crankGrip.position.set(0.61, -0.36, 0);
  addChannel(context, cleaner, 'rotation', 'x', Math.PI * 2, 0.4, 0);
  addSocket(context, cleaner, 'crank-control', [0.62, -0.36, 0]);
  addCollider(context, cleaner, 'cleaner-drum', 'cylinder', [0, 0, 0], {
    radius: 0.35,
    height: 1.08,
    axis: 'x',
    isTrigger: false,
  });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.84,
    note: 'Compact stylized Seed House reconstructed from the generated four-view concept sheet.',
    seedBinCount: 3,
    palette: ['warm timber', 'dark timber frame', 'galvanized roof', 'cream seed bins', 'dark iron hardware'],
    motion: 'Only the exposed manual cleaner drum and attached crank rotate.',
  };
  root.userData.seedHouseRig = { building, roof, door, vent, service, bins, cleaner };
  root.userData.applyPassState = (nextPassId) => applySeedHousePassState(root, nextPassId);
  applySeedHousePassState(root, passId);
  return root;
}

export function applySeedHousePassState(root, passId = 'optimization-pass') {
  const selectedPass = SEED_HOUSE_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['seed-house-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'seed-house-blockout-mat',
    color: '#a49b8f',
    roughness: 0.92,
    flatShading: true,
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

export function animateSeedHouse(root, timeSeconds, intensity = 1) {
  const cleaner = root?.userData?.seedHouseRig?.cleaner;
  if (!cleaner) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  cleaner.rotation.x = time * Math.PI * 0.8 * Math.max(0, intensity);
  return root;
}
