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

export const APIARY_FIELD_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(APIARY_FIELD_PASSES.map((id, index) => [id, index]));

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
    timber: material('apiary-honey-timber-mat', '#865d35', 0.86),
    metal: material('apiary-galvanized-lid-mat', '#7b878a', 0.7, 0.42),
    soil: material('apiary-dark-soil-mat', '#4e392b', 0.97),
    path: material('apiary-service-path-mat', '#9d886c', 0.96),
    flower: material('apiary-flower-strip-mat', '#c69b55', 0.9),
    iron: material('apiary-dark-iron-mat', '#343a3b', 0.64, 0.48),
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

function addHive(context, model, id, x, z) {
  const hive = addPivot(context, model, `${id}-hive`, [x, 0, z]);
  const stand = mesh(context, hive, `${id}-stand-platform`, box(1.0, 0.12, 1.0), context.materials.timber, 'hive-stands', 'structural-pass');
  stand.position.y = 0.48;
  for (const [legId, legX] of [['left', -0.34], ['right', 0.34]]) {
    const leg = mesh(context, hive, `${id}-${legId}-stand-leg`, box(0.16, 0.38, 0.16), context.materials.timber, 'hive-stands', 'structural-pass');
    leg.position.set(legX, 0.25, 0);
  }
  const body = mesh(context, hive, `${id}-hive-body`, box(0.82, 0.76, 0.82), context.materials.timber, 'hive-boxes');
  body.position.y = 0.92;
  for (const bandY of [0.68, 0.92, 1.16]) {
    const band = mesh(context, hive, `${id}-body-band-${bandY}`, box(0.88, 0.055, 0.87), context.materials.iron, 'hive-hardware', 'surface-pass');
    band.position.y = bandY;
  }
  const entrance = mesh(context, hive, `${id}-entrance-slot`, box(0.38, 0.08, 0.055), context.materials.iron, 'hive-entrances', 'form-refinement');
  entrance.position.set(0, 0.66, 0.438);
  const landing = mesh(context, hive, `${id}-landing-board`, box(0.5, 0.055, 0.2), context.materials.timber, 'hive-entrances', 'form-refinement');
  landing.position.set(0, 0.59, 0.5);
  for (const [roofId, roofX, rotationZ] of [['left', -0.23, 0.32], ['right', 0.23, -0.32]]) {
    const roof = mesh(context, hive, `${id}-${roofId}-lid`, box(0.58, 0.07, 1.0), context.materials.metal, 'hive-lids', 'structural-pass');
    roof.position.set(roofX, 1.38, 0);
    roof.rotation.z = rotationZ;
  }
  addSocket(context, hive, `${id}-harvest`, [0, 0.86, 0.52]);
  addCollider(context, hive, `${id}-hive`, 'box', [0, 0.85, 0], {
    width: 1.02,
    height: 1.46,
    depth: 1.04,
    isTrigger: false,
  });
  return hive;
}

function addFlowerStrip(context, parent, id, x) {
  const strip = addPivot(context, parent, `${id}-flower-strip`, [x, 0, 0]);
  const bed = mesh(context, strip, `${id}-flower-bed`, box(0.48, 0.09, 4.1), context.materials.soil, 'flower-strips');
  bed.position.y = 0.205;
  for (let index = 0; index < 7; index += 1) {
    const z = -1.7 + index * 0.57;
    const stem = mesh(context, strip, `${id}-flower-stem-${index + 1}`, new THREE.CylinderGeometry(0.025, 0.032, 0.18, 5), context.materials.flower, 'flower-strips', 'surface-pass');
    stem.position.set((index % 2 ? 1 : -1) * 0.08, 0.34, z);
    const blossom = mesh(context, strip, `${id}-flower-head-${index + 1}`, new THREE.OctahedronGeometry(0.09, 0), context.materials.flower, 'flower-strips', 'surface-pass');
    blossom.position.set((index % 2 ? 1 : -1) * 0.08, 0.46, z);
  }
  return strip;
}

export function createApiaryField(options = {}) {
  const passId = APIARY_FIELD_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('apiary-field', {
    label: 'Apiary Field',
    targetHeightMetres: 1.5,
    passId,
  });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.2, 0]);
  addSocket(context, model, 'pollination', [0, 1.1, 0]);
  addSocket(context, model, 'service', [0, 0.55, -2.15]);
  addSocket(context, model, 'harvest', [0, 0.72, 2.12]);
  addSocket(context, model, 'adjacency-left', [-2.16, 0.12, 0]);
  addSocket(context, model, 'adjacency-right', [2.16, 0.12, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.12, 2.48]);
  addSocket(context, model, 'adjacency-rear', [0, 0.12, -2.48]);

  const field = addPivot(context, model, 'field-module');
  const base = mesh(context, field, 'field-soil-base', box(4.18, 0.16, 4.72), context.materials.soil, 'field-module');
  base.position.y = 0.08;
  for (const [id, width, depth, x, z] of [
    ['left-edge', 0.14, 4.84, -2.02, 0],
    ['right-edge', 0.14, 4.84, 2.02, 0],
    ['front-edge', 4.18, 0.14, 0, 2.35],
    ['rear-edge', 4.18, 0.14, 0, -2.35],
  ]) {
    const rail = mesh(context, field, id, box(width, 0.24, depth), context.materials.timber, 'field-frame', 'structural-pass');
    rail.position.set(x, 0.12, z);
  }
  addCollider(context, field, 'field-module', 'box', [0, 0.1, 0], {
    width: 4.2,
    height: 0.2,
    depth: 4.74,
    isTrigger: false,
  });

  const path = addPivot(context, field, 'central-service-path');
  const pathSurface = mesh(context, path, 'service-path-surface', box(0.7, 0.055, 4.2), context.materials.path, 'service-path');
  pathSurface.position.y = 0.19;

  const flowers = addPivot(context, field, 'flower-strips');
  const leftFlowers = addFlowerStrip(context, flowers, 'left', -1.7);
  const rightFlowers = addFlowerStrip(context, flowers, 'right', 1.7);

  const hives = [
    addHive(context, field, 'front-left', -0.88, 1.12),
    addHive(context, field, 'rear-left', -0.88, -1.12),
    addHive(context, field, 'front-right', 0.88, 1.12),
    addHive(context, field, 'rear-right', 0.88, -1.12),
  ];

  const service = addPivot(context, field, 'smoker-tool-shelf', [0, 0, -1.92]);
  const shelfTop = mesh(context, service, 'smoker-shelf-top', box(0.64, 0.1, 0.44), context.materials.timber, 'smoker-shelf', 'structural-pass');
  shelfTop.position.y = 0.72;
  for (const x of [-0.24, 0.24]) {
    const leg = mesh(context, service, `smoker-shelf-leg-${x < 0 ? 'left' : 'right'}`, box(0.1, 0.55, 0.1), context.materials.timber, 'smoker-shelf', 'structural-pass');
    leg.position.set(x, 0.43, 0);
  }
  const smokerBody = mesh(context, service, 'smoker-body', new THREE.CylinderGeometry(0.12, 0.14, 0.32, 7), context.materials.iron, 'smoker-shelf', 'form-refinement');
  smokerBody.position.set(-0.1, 0.93, 0);
  const smokerSpout = mesh(context, service, 'smoker-spout', new THREE.ConeGeometry(0.11, 0.28, 7), context.materials.iron, 'smoker-shelf', 'form-refinement');
  smokerSpout.position.set(-0.1, 1.22, 0);
  const toolBox = mesh(context, service, 'tool-box', box(0.18, 0.28, 0.18), context.materials.timber, 'smoker-shelf', 'form-refinement');
  toolBox.position.set(0.2, 0.91, 0);
  addCollider(context, service, 'smoker-tool-shelf', 'box', [0, 0.65, 0], {
    width: 0.72,
    height: 1.16,
    depth: 0.5,
    isTrigger: false,
  });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 1.5,
    note: 'Static stylized low-poly Apiary Field reconstructed from the generated four-view concept sheet.',
    hiveCount: 4,
    flowerStripCount: 2,
    palette: ['honey timber', 'galvanized lids', 'dark soil', 'dusty path', 'muted ochre flowers', 'dark iron'],
    motion: 'Static asset. No bee, swarm, hive, flower, or tool animation is authored.',
  };
  root.userData.apiaryFieldRig = { field, path, flowers, leftFlowers, rightFlowers, hives, service };
  root.userData.applyPassState = (nextPassId) => applyApiaryFieldPassState(root, nextPassId);
  applyApiaryFieldPassState(root, passId);
  return root;
}

export function applyApiaryFieldPassState(root, passId = 'optimization-pass') {
  const selectedPass = APIARY_FIELD_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['apiary-field-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'apiary-field-blockout-mat',
    color: '#a49b8f',
    roughness: 0.93,
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
