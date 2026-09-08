import * as THREE from 'three';
import {
  addCollider,
  addPivot,
  addSocket,
  createAssetContext,
  finishAsset,
  registerMesh,
} from '../core/assetContext.js';
import { faceted, tubeThrough } from '../core/geometryLibrary.js';

export const MELTWATER_COLLECTOR_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(MELTWATER_COLLECTOR_PASSES.map((id, index) => [id, index]));

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
    frame: material('meltwater-galvanized-frame-mat', '#718087', 0.72, 0.42),
    panel: material('meltwater-charcoal-panel-mat', '#252d34', 0.86, 0.12),
    tank: material('meltwater-insulated-tank-mat', '#596b7a', 0.8, 0.18),
    iron: material('meltwater-dark-iron-fitting-mat', '#303a3e', 0.68, 0.42),
    accent: material('meltwater-frost-blue-accent-mat', '#8eb9c9', 0.64, 0.24),
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

function zCylinder(radius, length, segments = 6) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function addBoxBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(midpoint);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return beam;
}

function addPanel(context, model, id, x) {
  const panel = addPivot(context, model, `${id}-panel`, [x, 1.75, 0.22]);
  panel.rotation.x = -0.45;
  mesh(context, panel, `${id}-collector-surface`, box(1.27, 1.55, 0.07), context.materials.panel, 'collector-panels');
  for (const [railId, railX] of [['left', -0.675], ['right', 0.675]]) {
    const rail = mesh(context, panel, `${id}-${railId}-rail`, box(0.08, 1.7, 0.11), context.materials.frame, 'panel-frames', 'structural-pass');
    rail.position.set(railX, 0, 0.015);
  }
  for (const [railId, railY] of [['lower', -0.815], ['upper', 0.815]]) {
    const rail = mesh(context, panel, `${id}-${railId}-rail`, box(1.43, 0.08, 0.11), context.materials.frame, 'panel-frames', 'structural-pass');
    rail.position.set(0, railY, 0.015);
  }
  addCollider(context, panel, `${id}-collector-panel`, 'box', [0, 0, 0], {
    width: 1.43,
    height: 1.7,
    depth: 0.12,
    isTrigger: false,
  });
  addSocket(context, panel, `${id}-panel-drain`, [0, -0.84, 0.05]);
  return panel;
}

export function createMeltwaterCollector(options = {}) {
  const passId = MELTWATER_COLLECTOR_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('meltwater-collector', {
    label: 'Meltwater Collector',
    targetHeightMetres: 2.78,
    passId,
  });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'trough-input', [0, 0.96, 0.78]);
  addSocket(context, model, 'tank-service', [0, 0.52, -0.18]);
  addSocket(context, model, 'water-output', [1.78, 0.42, 0.16]);

  const frame = addPivot(context, model, 'a-frame');
  for (const [side, x] of [['left', -1.45], ['right', 1.45]]) {
    const front = [x, 0.12, 0.72];
    const rear = [x, 0.12, -0.68];
    const apex = [x, 2.72, -0.15];
    addBoxBeam(context, frame, `${side}-front-leg`, front, apex, 0.13, 0.13, context.materials.frame, 'a-frame');
    addBoxBeam(context, frame, `${side}-rear-leg`, rear, apex, 0.13, 0.13, context.materials.frame, 'a-frame');
    for (const [footId, z] of [['front', 0.72], ['rear', -0.68]]) {
      const pad = mesh(context, frame, `${side}-${footId}-foot`, box(0.34, 0.12, 0.34), context.materials.iron, 'stabilizing-feet');
      pad.position.set(x, 0.06, z);
      const cap = mesh(context, frame, `${side}-${footId}-foot-cap`, new THREE.CylinderGeometry(0.15, 0.21, 0.18, 4), context.materials.accent, 'stabilizing-feet', 'form-refinement');
      cap.position.set(x, 0.2, z);
      cap.rotation.y = Math.PI / 4;
    }
  }
  for (const [id, y, z] of [['lower', 0.32, -0.32], ['middle', 0.94, 0.2], ['apex', 2.7, -0.15]]) {
    const crossRail = mesh(context, frame, `${id}-cross-rail`, box(3.03, 0.11, 0.11), context.materials.frame, 'a-frame', 'structural-pass');
    crossRail.position.set(0, y, z);
  }
  addCollider(context, frame, 'a-frame', 'box', [0, 1.38, 0.02], {
    width: 3.18,
    height: 2.76,
    depth: 1.55,
    isTrigger: false,
  });

  addPanel(context, model, 'left', -0.72);
  addPanel(context, model, 'right', 0.72);

  const trough = addPivot(context, model, 'front-trough', [0, 0.9, 0.78]);
  const troughBase = mesh(context, trough, 'trough-base', box(3.2, 0.08, 0.36), context.materials.frame, 'front-trough');
  troughBase.position.y = -0.15;
  for (const [id, z] of [['front', 0.23], ['rear', -0.23]]) {
    const wall = mesh(context, trough, `trough-${id}-wall`, box(3.2, 0.35, 0.08), context.materials.frame, 'front-trough');
    wall.position.set(0, 0, z);
    wall.rotation.x = id === 'front' ? -0.18 : 0.18;
  }
  for (const [id, x] of [['left', -1.56], ['right', 1.56]]) {
    const end = mesh(context, trough, `trough-${id}-end`, box(0.08, 0.34, 0.52), context.materials.accent, 'front-trough', 'form-refinement');
    end.position.set(x, -0.01, 0);
  }
  addCollider(context, trough, 'front-trough', 'box', [0, 0, 0], {
    width: 3.24,
    height: 0.38,
    depth: 0.56,
    isTrigger: false,
  });

  const tank = addPivot(context, model, 'holding-tank', [0, 0.53, -0.18]);
  mesh(context, tank, 'holding-tank-shell', xCylinder(0.39, 2.12, 8), context.materials.tank, 'holding-tank');
  for (const [id, x] of [['left', -0.73], ['right', 0.73]]) {
    const strap = mesh(context, tank, `${id}-tank-strap`, new THREE.TorusGeometry(0.41, 0.035, 4, 8), context.materials.iron, 'tank-straps', 'structural-pass');
    strap.position.x = x;
    strap.rotation.y = Math.PI / 2;
  }
  for (const x of [-0.74, 0.74]) {
    const cradle = mesh(context, tank, `tank-cradle-${x < 0 ? 'left' : 'right'}`, box(0.12, 0.12, 0.82), context.materials.frame, 'tank-supports', 'structural-pass');
    cradle.position.set(x, -0.39, 0);
  }
  addCollider(context, tank, 'holding-tank', 'cylinder', [0, 0, 0], {
    radius: 0.41,
    height: 2.12,
    axis: 'x',
    isTrigger: false,
  });

  const downpipe = addPivot(context, model, 'downpipe');
  const upperPipe = mesh(context, downpipe, 'trough-downpipe', new THREE.CylinderGeometry(0.055, 0.055, 0.5, 6), context.materials.iron, 'downpipe', 'form-refinement');
  upperPipe.position.set(1.38, 0.63, 0.72);
  const tankFeed = mesh(context, downpipe, 'tank-feed-bend', tubeThrough([
    [1.38, 0.39, 0.72],
    [1.38, 0.33, 0.46],
    [1.08, 0.45, 0.18],
  ], 0.055, 6), context.materials.iron, 'downpipe', 'form-refinement');
  tankFeed.position.set(0, 0, 0);
  for (const y of [0.48, 0.76]) {
    const collar = mesh(context, downpipe, `downpipe-collar-${y}`, new THREE.TorusGeometry(0.067, 0.014, 4, 6), context.materials.accent, 'downpipe', 'surface-pass');
    collar.position.set(1.38, y, 0.72);
    collar.rotation.x = Math.PI / 2;
  }
  addCollider(context, downpipe, 'downpipe', 'capsule-chain', [1.3, 0.55, 0.5], {
    radius: 0.07,
    height: 0.72,
    isTrigger: false,
  });

  const valve = addPivot(context, model, 'outlet-valve', [1.08, 0.42, 0.16]);
  const outletPipe = mesh(context, valve, 'outlet-pipe', xCylinder(0.075, 0.62, 8), context.materials.iron, 'outlet-valve', 'form-refinement');
  outletPipe.position.x = 0.3;
  const valveBody = mesh(context, valve, 'valve-body', xCylinder(0.13, 0.2, 8), context.materials.accent, 'outlet-valve', 'form-refinement');
  valveBody.position.x = 0.42;
  const outletNozzle = mesh(context, valve, 'outlet-nozzle', xCylinder(0.065, 0.2, 6), context.materials.iron, 'outlet-valve', 'form-refinement');
  outletNozzle.position.x = 0.69;
  const handle = addPivot(context, valve, 'outlet-handle', [0.42, 0.16, 0]);
  const stem = mesh(context, handle, 'valve-stem', new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), context.materials.iron, 'outlet-valve', 'surface-pass');
  stem.position.y = -0.08;
  const handleX = mesh(context, handle, 'valve-handle-x', box(0.28, 0.045, 0.06), context.materials.iron, 'outlet-valve', 'surface-pass');
  const handleZ = mesh(context, handle, 'valve-handle-z', box(0.06, 0.045, 0.28), context.materials.iron, 'outlet-valve', 'surface-pass');
  handleX.position.y = 0.02;
  handleZ.position.y = 0.02;
  addSocket(context, handle, 'outlet-control', [0, 0.02, 0]);
  addCollider(context, valve, 'outlet-valve', 'box', [0.38, 0.08, 0], {
    width: 0.88,
    height: 0.44,
    depth: 0.34,
    isTrigger: false,
  });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.78,
    note: 'Stylized low-poly approximation reconstructed from the supplied four-view concept sheet.',
    palette: ['galvanized blue-grey frame', 'charcoal collectors', 'insulated blue-grey tank', 'dark iron fittings', 'frost-blue accents'],
    motion: 'Static asset. No panel, water, or valve animation is authored.',
  };
  root.userData.meltwaterCollectorRig = { frame, trough, tank, downpipe, valve, handle };
  root.userData.applyPassState = (nextPassId) => applyMeltwaterCollectorPassState(root, nextPassId);
  applyMeltwaterCollectorPassState(root, passId);
  return root;
}

export function applyMeltwaterCollectorPassState(root, passId = 'optimization-pass') {
  const selectedPass = MELTWATER_COLLECTOR_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['meltwater-collector-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'meltwater-collector-blockout-mat',
    color: '#a69e95',
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
