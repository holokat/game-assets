import * as THREE from 'three';
import {
  addCollider,
  addPivot,
  addSocket,
  createAssetContext,
  finishAsset,
  registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const TERRACE_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(TERRACE_PASSES.map((id, index) => [id, index]));

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
    earth: material('terrace-compacted-earth-mat', '#725238', 0.96),
    furrow: material('terrace-dark-tilled-soil-mat', '#493326', 0.98),
    stone: material('terrace-warm-retaining-stone-mat', '#a2845b', 0.9),
    metal: material('terrace-blue-grey-drainage-mat', '#61757d', 0.72, 0.36),
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

const PLATFORM_SPECS = [
  { id: 'front', z: 1.1, topY: 0.18 },
  { id: 'middle', z: 0, topY: 0.5 },
  { id: 'rear', z: -1.1, topY: 0.82 },
];

function addRetainingStones(context, platform, spec) {
  const riserZ = 0.54;
  const groundLift = spec.id === 'front' ? 0.065 : 0;
  for (let index = 0; index < 8; index += 1) {
    const stone = mesh(
      context,
      platform,
      `${spec.id}-riser-stone-${index + 1}`,
      box(0.43, 0.24, 0.18),
      context.materials.stone,
      'retaining-walls',
      'structural-pass',
    );
    stone.position.set(-1.53 + index * 0.44, spec.topY - 0.12 + groundLift, riserZ);
    stone.rotation.x = -0.055;
    stone.rotation.y = (index % 2 ? 1 : -1) * 0.018;
  }
  for (const [side, x] of [['left', -1.86], ['right', 1.86]]) {
    for (let index = 0; index < 3; index += 1) {
      const cheek = mesh(
        context,
        platform,
        `${spec.id}-${side}-cheek-${index + 1}`,
        box(0.18, 0.24, 0.34),
        context.materials.stone,
        'retaining-walls',
        'structural-pass',
      );
      cheek.position.set(x, spec.topY - 0.12 + groundLift, -0.34 + index * 0.34);
      cheek.rotation.z = side === 'left' ? -0.045 : 0.045;
    }
  }
}

function addPlatform(context, model, spec) {
  const platform = addPivot(context, model, `${spec.id}-platform`, [0, 0, spec.z]);
  const earth = mesh(
    context,
    platform,
    `${spec.id}-earth-platform`,
    box(3.62, spec.topY, 1.02),
    context.materials.earth,
    'terrain-platforms',
  );
  earth.position.y = spec.topY * 0.5;
  for (let index = 0; index < 4; index += 1) {
    const furrow = mesh(
      context,
      platform,
      `${spec.id}-furrow-${index + 1}`,
      box(0.18, 0.035, 0.76),
      context.materials.furrow,
      'tilled-furrows',
      'form-refinement',
    );
    furrow.position.set(-1.2 + index * 0.8, spec.topY + 0.0175, 0);
  }
  addRetainingStones(context, platform, spec);
  addSocket(context, platform, `${spec.id}-terrain`, [0, spec.topY + 0.04, 0]);
  addCollider(context, platform, `${spec.id}-step`, 'box', [0, spec.topY * 0.5, 0], {
    width: 3.72,
    height: spec.topY,
    depth: 1.08,
    isTrigger: false,
  });
  return platform;
}

export function createTerrace(options = {}) {
  const passId = TERRACE_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('terrace', {
    label: 'Terrace',
    targetHeightMetres: 0.95,
    passId,
  });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'adjacency-left', [-2.04, 0.5, 0]);
  addSocket(context, model, 'adjacency-right', [2.04, 0.5, 0]);

  const steps = addPivot(context, model, 'terrace-steps');
  const platforms = PLATFORM_SPECS.map((spec) => addPlatform(context, steps, spec));

  const drain = addPivot(context, model, 'side-drain');
  const channelBottom = mesh(context, drain, 'drain-channel-bottom', box(0.24, 0.07, 3.48), context.materials.metal, 'side-drain', 'form-refinement');
  channelBottom.position.set(-2.04, 0.545, 0);
  channelBottom.rotation.x = -0.28;
  for (const [id, x] of [['inner', -1.9], ['outer', -2.18]]) {
    const rail = mesh(context, drain, `drain-${id}-rail`, box(0.07, 0.18, 3.5), context.materials.metal, 'side-drain', 'form-refinement');
    rail.position.set(x, 0.585, 0);
    rail.rotation.x = -0.28;
  }
  const drainMouth = mesh(context, drain, 'drain-mouth', box(0.38, 0.28, 0.3), context.materials.metal, 'side-drain', 'surface-pass');
  drainMouth.position.set(-2.04, 0.17, 1.78);
  addSocket(context, drain, 'drain-inlet', [-2.04, 0.9, -1.68]);
  addSocket(context, drain, 'drain-outlet', [-2.04, 0.17, 1.94]);
  addCollider(context, drain, 'side-drain', 'box', [-2.04, 0.48, 0], {
    width: 0.44,
    height: 0.28,
    depth: 3.64,
    isTrigger: false,
  });

  const connectors = addPivot(context, model, 'modular-connectors');
  for (const [index, y] of [0.2, 0.52, 0.84].entries()) {
    const plate = mesh(context, connectors, `connector-plate-${index + 1}`, box(0.12, 0.24, 0.32), context.materials.metal, 'modular-connectors', 'structural-pass');
    plate.position.set(1.92, y, -1.1 + index * 1.1);
    const tongue = mesh(context, connectors, `connector-tongue-${index + 1}`, box(0.3, 0.12, 0.16), context.materials.metal, 'modular-connectors', 'form-refinement');
    tongue.position.set(2.1, y, -1.1 + index * 1.1);
    addSocket(context, connectors, `adjacency-level-${index + 1}`, [2.26, y, -1.1 + index * 1.1]);
  }
  addCollider(context, connectors, 'modular-connectors', 'box', [2.04, 0.52, 0], {
    width: 0.5,
    height: 0.94,
    depth: 2.55,
    isTrigger: false,
  });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 0.95,
    note: 'Static stylized low-poly terrace reconstructed from the generated four-view concept sheet.',
    platformCount: 3,
    furrowsPerPlatform: 4,
    palette: ['muted compacted earth', 'dark tilled soil', 'warm retaining stone', 'blue-grey drainage metal'],
    motion: 'Static asset. No soil, stone, drainage, or connector animation is authored.',
  };
  root.userData.terraceRig = { steps, platforms, drain, connectors };
  root.userData.applyPassState = (nextPassId) => applyTerracePassState(root, nextPassId);
  applyTerracePassState(root, passId);
  return root;
}

export function applyTerracePassState(root, passId = 'optimization-pass') {
  const selectedPass = TERRACE_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['terrace-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'terrace-blockout-mat',
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
