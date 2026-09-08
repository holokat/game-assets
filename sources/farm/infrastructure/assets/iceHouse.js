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

export const ICE_HOUSE_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(ICE_HOUSE_PASSES.map((id, index) => [id, index]));

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
    stone: material('ice-house-warm-stone-mat', '#8c7a60', 0.95),
    timber: material('ice-house-pale-insulated-timber-mat', '#b7a680', 0.9),
    earth: material('ice-house-packed-earth-roof-mat', '#6f6036', 0.98),
    iron: material('ice-house-dark-iron-mat', '#303536', 0.58, 0.52),
    trim: material('ice-house-cream-edge-trim-mat', '#d0bf97', 0.88),
  };
}

function box(width, height, depth) {
  return new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
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

function addGable(context, parent, id, z) {
  const shape = new THREE.Shape();
  shape.moveTo(-1.34, 0);
  shape.lineTo(0, 0.55);
  shape.lineTo(1.34, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false, steps: 1 });
  const gable = mesh(context, parent, `${id}-gable`, geometry, context.materials.timber, 'upper-shell', 'structural-pass');
  gable.position.set(0, 2.0, z - 0.045);
  return gable;
}

export function createIceHouse(options = {}) {
  const passId = ICE_HOUSE_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('ice-house', {
    label: 'Ice House',
    targetHeightMetres: 2.86,
    passId,
  });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'loading', [1.88, 1.08, -0.12]);
  addSocket(context, model, 'storage', [0, 1.1, 0]);
  addSocket(context, model, 'cooling', [0, 0.72, -0.82]);
  addSocket(context, model, 'ventilation-left', [0, 2.82, 0.56]);
  addSocket(context, model, 'ventilation-right', [0, 2.82, -0.56]);
  addSocket(context, model, 'service', [0, 0.14, 1.58]);
  addSocket(context, model, 'roof-attachment', [0, 2.86, 0]);
  addSocket(context, model, 'rear-attachment', [0, 1.2, -1.13]);
  addSocket(context, model, 'adjacency-left', [-1.72, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [2.08, 0.1, 0]);

  const lowerWalls = addPivot(context, model, 'stone-lower-walls');
  const stoneBase = mesh(context, lowerWalls, 'stone-wall-block', box(2.8, 1.1, 2.2), context.materials.stone, 'stone-lower-walls');
  stoneBase.position.y = 0.55;
  for (const [id, x, z] of [
    ['front-left', -1.3, 1.0], ['front-right', 1.3, 1.0],
    ['rear-left', -1.3, -1.0], ['rear-right', 1.3, -1.0],
  ]) {
    const corner = mesh(context, lowerWalls, `${id}-stone-corner`, new THREE.CylinderGeometry(0.18, 0.24, 1.06, 4), context.materials.stone, 'stone-lower-walls', 'form-refinement');
    corner.position.set(x, 0.53, z);
    corner.rotation.y = Math.PI / 4;
  }

  const shell = addPivot(context, model, 'insulated-upper-shell');
  const upper = mesh(context, shell, 'upper-shell-block', box(2.68, 0.9, 2.08), context.materials.timber, 'upper-shell');
  upper.position.y = 1.55;
  addGable(context, shell, 'front', 1.09);
  addGable(context, shell, 'rear', -1.09);
  for (const x of [-1.03, -0.52, 0, 0.52, 1.03]) {
    const strip = mesh(context, shell, `front-board-strip-${x}`, box(0.055, 0.88, 0.055), context.materials.trim, 'upper-shell', 'surface-pass');
    strip.position.set(x, 1.55, 1.075);
  }
  const belt = mesh(context, shell, 'insulation-belt', box(2.84, 0.1, 2.22), context.materials.trim, 'upper-shell', 'surface-pass');
  belt.position.y = 1.1;
  addCollider(context, shell, 'building', 'box', [0, 1.0, 0], {
    width: 2.84,
    height: 2.0,
    depth: 2.22,
    isTrigger: false,
  });

  const roof = addPivot(context, model, 'earth-insulated-roof');
  for (const [id, x, rotationZ] of [['left', -0.72, 0.39], ['right', 0.72, -0.39]]) {
    const earthPanel = mesh(context, roof, `${id}-earth-roof-panel`, box(1.62, 0.18, 2.48), context.materials.earth, 'earth-roof');
    earthPanel.position.set(x, 2.34, 0);
    earthPanel.rotation.z = rotationZ;
    const fascia = mesh(context, roof, `${id}-roof-fascia`, box(1.63, 0.12, 0.11), context.materials.trim, 'earth-roof', 'surface-pass');
    fascia.position.set(x, 2.34, 1.22);
    fascia.rotation.z = rotationZ;
  }
  const ridge = mesh(context, roof, 'roof-ridge', box(0.16, 0.14, 2.5), context.materials.trim, 'earth-roof', 'surface-pass');
  ridge.position.y = 2.72;

  const vents = addPivot(context, model, 'roof-vents');
  for (const [index, z] of [0.56, -0.56].entries()) {
    const stack = mesh(context, vents, `roof-vent-${index + 1}-stack`, box(0.24, 0.34, 0.24), context.materials.iron, 'roof-vents', 'form-refinement');
    stack.position.set(0, 2.69, z);
    const cap = mesh(context, vents, `roof-vent-${index + 1}-cap`, new THREE.CylinderGeometry(0.24, 0.18, 0.12, 4), context.materials.iron, 'roof-vents', 'form-refinement');
    cap.position.set(0, 2.9, z);
    cap.rotation.y = Math.PI / 4;
  }

  const door = addPivot(context, model, 'heavy-front-door', [-0.55, 0.15, 1.135]);
  const doorLeaf = mesh(context, door, 'door-leaf', box(1.1, 1.7, 0.12), context.materials.timber, 'front-door', 'form-refinement');
  doorLeaf.position.set(0.55, 0.85, 0);
  for (const [index, y] of [0.35, 1.35].entries()) {
    const strap = mesh(context, door, `door-strap-${index + 1}`, box(0.86, 0.11, 0.08), context.materials.iron, 'front-door', 'surface-pass');
    strap.position.set(0.48, y, 0.1);
    const pin = mesh(context, door, `door-hinge-pin-${index + 1}`, new THREE.CylinderGeometry(0.055, 0.055, 0.2, 6), context.materials.iron, 'front-door', 'surface-pass');
    pin.position.set(0, y, 0.1);
  }
  const handle = mesh(context, door, 'door-handle', box(0.08, 0.28, 0.1), context.materials.iron, 'front-door', 'interaction-pass');
  handle.position.set(0.91, 0.86, 0.12);
  addChannel(context, door, 'rotation', 'y', 1.05, 0.7, 0);
  addSocket(context, door, 'door-control', [0.91, 0.86, 0.16]);
  addCollider(context, door, 'door', 'box', [0.55, 0.85, 0], {
    width: 1.12,
    height: 1.72,
    depth: 0.16,
    isTrigger: false,
  });

  const threshold = addPivot(context, model, 'raised-threshold');
  const thresholdStone = mesh(context, threshold, 'threshold-stone', box(1.42, 0.18, 0.46), context.materials.stone, 'raised-threshold', 'structural-pass');
  thresholdStone.position.set(0, 0.09, 1.32);

  const chute = addPivot(context, model, 'covered-loading-chute', [1.4, 0, -0.12]);
  const chuteBody = mesh(context, chute, 'loading-chute-body', box(0.88, 0.5, 0.72), context.materials.timber, 'loading-chute', 'form-refinement');
  chuteBody.position.set(0.42, 0.98, 0);
  chuteBody.rotation.z = -0.16;
  const chuteMouth = mesh(context, chute, 'loading-chute-mouth', box(0.13, 0.54, 0.78), context.materials.iron, 'loading-chute', 'surface-pass');
  chuteMouth.position.set(0.84, 0.91, 0);
  const cover = mesh(context, chute, 'loading-chute-cover', box(1.02, 0.12, 0.88), context.materials.earth, 'loading-chute', 'structural-pass');
  cover.position.set(0.43, 1.34, 0);
  cover.rotation.z = -0.13;
  for (const z of [-0.32, 0.32]) {
    const post = mesh(context, chute, `loading-chute-post-${z}`, box(0.1, 0.9, 0.1), context.materials.timber, 'loading-chute', 'structural-pass');
    post.position.set(0.84, 0.45, z);
  }
  addCollider(context, chute, 'loading-chute', 'box', [0.45, 0.83, 0], {
    width: 1.02,
    height: 1.54,
    depth: 0.92,
    isTrigger: false,
  });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.96,
    note: 'Lean stylized low-poly Ice House reconstructed from the generated four-view concept sheet.',
    roofVentCount: 2,
    palette: ['warm stone', 'pale insulated timber', 'packed earth roof', 'dark iron', 'cream trim'],
    motion: 'Only the heavy front door rotates on its visible hinge side.',
  };
  root.userData.iceHouseRig = { lowerWalls, shell, roof, vents, door, threshold, chute };
  root.userData.applyPassState = (nextPassId) => applyIceHousePassState(root, nextPassId);
  applyIceHousePassState(root, passId);
  return root;
}

export function applyIceHousePassState(root, passId = 'optimization-pass') {
  const selectedPass = ICE_HOUSE_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['ice-house-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'ice-house-blockout-mat',
    color: '#a49b8f',
    roughness: 0.94,
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

export function animateIceHouse(root, timeSeconds, intensity = 1) {
  const door = root?.userData?.iceHouseRig?.door;
  if (!door) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  door.rotation.y = Math.sin(time * 0.7) * 1.05 * Math.max(0, intensity);
  return root;
}
