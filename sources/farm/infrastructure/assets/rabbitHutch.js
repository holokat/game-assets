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

const material = (name, color, roughness = 0.66, metalness = 0) => new THREE.MeshStandardMaterial({
  name,
  color,
  roughness,
  metalness,
  flatShading: true,
  vertexColors: true,
});

const mesh = (context, parent, id, geometry, surface, group) => registerMesh(
  context,
  parent,
  id,
  new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface),
  group,
);

function box(context, parent, id, size, position, surface, group) {
  const part = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group);
  part.position.set(...position);
  return part;
}

function addMeshDoor(context, parent, id, x, timber, iron) {
  const door = addPivot(context, parent, `${id}-mesh-door`, [x, 1.26, 0.505]);
  door.userData.attachment = {
    parentId: 'raised-hutch-structure',
    parentSocket: `${id}-door-frame`,
    localStart: [x - 0.31, 1.0, 0.505],
    localEnd: [x + 0.31, 1.52, 0.505],
    contactType: 'hinge',
    overlap: 0.025,
    gapTolerance: 0.006,
    evidenceRefs: ['rabbit-hutch concept: front and three-quarter views'],
  };
  box(context, door, `${id}-door-left-frame`, [0.055, 0.56, 0.055], [-0.285, 0, 0], timber, 'doors');
  box(context, door, `${id}-door-right-frame`, [0.055, 0.56, 0.055], [0.285, 0, 0], timber, 'doors');
  box(context, door, `${id}-door-top-frame`, [0.62, 0.055, 0.055], [0, 0.252, 0], timber, 'doors');
  box(context, door, `${id}-door-bottom-frame`, [0.62, 0.055, 0.055], [0, -0.252, 0], timber, 'doors');
  for (const offset of [-0.18, -0.06, 0.06, 0.18]) {
    box(context, door, `${id}-mesh-vertical-${offset}`, [0.018, 0.46, 0.018], [offset, 0, 0.032], iron, 'doors');
  }
  for (const offset of [-0.15, 0, 0.15]) {
    box(context, door, `${id}-mesh-horizontal-${offset}`, [0.5, 0.018, 0.018], [0, offset, 0.034], iron, 'doors');
  }
  for (const y of [-0.16, 0.16]) {
    box(context, door, `${id}-hinge-${y}`, [0.075, 0.09, 0.035], [0.325, y, 0.04], iron, 'hardware');
  }
  box(context, door, `${id}-latch`, [0.08, 0.055, 0.045], [-0.23, 0, 0.045], iron, 'hardware');
  return door;
}

function addRunPanel(context, parent, id, center, size, axis, timber, iron) {
  const [width, height] = size;
  if (axis === 'front') {
    for (const x of [-width / 2, 0, width / 2]) box(context, parent, `${id}-vertical-${x}`, [0.035, height, 0.035], [center[0] + x, center[1], center[2]], iron, 'run');
    for (const y of [-height / 2, 0, height / 2]) box(context, parent, `${id}-horizontal-${y}`, [width, 0.035, 0.035], [center[0], center[1] + y, center[2]], y === -height / 2 ? timber : iron, 'run');
  } else {
    for (const z of [-width / 2, 0, width / 2]) box(context, parent, `${id}-vertical-${z}`, [0.035, height, 0.035], [center[0], center[1], center[2] + z], iron, 'run');
    for (const y of [-height / 2, 0, height / 2]) box(context, parent, `${id}-horizontal-${y}`, [0.035, 0.035, width], [center[0], center[1] + y, center[2]], y === -height / 2 ? timber : iron, 'run');
  }
}

export function createRabbitHutch() {
  const context = createAssetContext('rabbit-hutch', {
    target: 'compact practical raised rabbit hutch',
    style: 'stylized low-poly textureless real-time prop',
  });
  const { model } = context;
  const stone = material('rabbit-hutch-stone-feet', '#817b71', 0.86);
  const timber = material('rabbit-hutch-warm-timber', '#806145', 0.72);
  const roof = material('rabbit-hutch-galvanized-shed-roof', '#707d80', 0.43, 0.22);
  const iron = material('rabbit-hutch-dark-wire-mesh', '#30393a', 0.5, 0.28);
  const shelter = material('rabbit-hutch-shelter-panel', '#9b744c', 0.76);

  addSocket(context, model, 'ground', [0, 0, 0]);
  const hutch = addPivot(context, model, 'raised-hutch-structure', [0, 0, 0]);
  const run = addPivot(context, hutch, 'sheltered-ground-run', [0, 0, 0]);
  const cabinet = addPivot(context, hutch, 'elongated-hutch-cabinet', [0, 0, 0]);
  const sleepBox = addPivot(context, cabinet, 'enclosed-sleeping-compartment', [-0.83, 0, 0]);

  box(context, run, 'ground-run-floor', [3.12, 0.06, 0.92], [0.25, 0.03, 0], timber, 'run');
  for (const x of [-1.2, 1.2, 1.8]) {
    for (const z of [-0.4, 0.4]) {
      box(context, run, `stone-foot-${x}-${z}`, [0.22, 0.12, 0.22], [x, 0.06, z], stone, 'foundation');
      box(context, run, `slender-leg-${x}-${z}`, [0.095, 0.72, 0.095], [x, 0.48, z], timber, 'frame');
    }
  }
  addRunPanel(context, run, 'front-under-hutch-mesh', [-0.02, 0.43, 0.47], [2.4, 0.68], 'front', timber, iron);
  addRunPanel(context, run, 'front-side-run-mesh', [1.5, 0.43, 0.47], [0.6, 0.68], 'front', timber, iron);
  addRunPanel(context, run, 'right-side-run-mesh', [1.84, 0.43, 0], [0.9, 0.68], 'side', timber, iron);
  box(context, run, 'side-run-awning', [0.72, 0.065, 1.02], [1.53, 0.86, 0], roof, 'run');

  box(context, cabinet, 'raised-cabinet-floor', [2.52, 0.12, 1.0], [0, 0.87, 0], timber, 'cabinet');
  box(context, cabinet, 'cabinet-back-panel', [2.52, 0.62, 0.08], [0, 1.23, -0.46], timber, 'cabinet');
  box(context, cabinet, 'cabinet-left-wall', [0.08, 0.68, 1.0], [-1.22, 1.22, 0], timber, 'cabinet');
  box(context, cabinet, 'cabinet-right-wall', [0.08, 0.68, 1.0], [1.22, 1.22, 0], timber, 'cabinet');
  box(context, cabinet, 'cabinet-top-rail', [2.52, 0.08, 1.0], [0, 1.56, 0], timber, 'cabinet');
  box(context, cabinet, 'front-lower-rail', [2.52, 0.08, 0.08], [0, 0.96, 0.49], timber, 'frame');
  box(context, cabinet, 'sleeping-box-front-panel', [0.78, 0.58, 0.07], [-0.83, 1.25, 0.49], shelter, 'shelter');
  box(context, cabinet, 'sleeping-box-divider', [0.07, 0.62, 0.94], [-0.4, 1.25, 0], timber, 'shelter');

  const roofPanel = box(context, cabinet, 'shallow-single-slope-roof', [2.8, 0.085, 1.14], [0, 1.68, 0], roof, 'roof');
  roofPanel.rotation.x = -0.1;
  box(context, cabinet, 'high-roof-edge', [2.8, 0.075, 0.075], [0, 1.74, -0.53], iron, 'roof');
  box(context, cabinet, 'low-roof-edge', [2.8, 0.075, 0.075], [0, 1.63, 0.53], iron, 'roof');

  addMeshDoor(context, cabinet, 'centre', 0.03, timber, iron);
  addMeshDoor(context, cabinet, 'right', 0.82, timber, iron);

  const hatch = addPivot(context, sleepBox, 'fold-down-service-hatch', [0, 1.03, 0.535]);
  hatch.userData.attachment = {
    parentId: 'enclosed-sleeping-compartment',
    parentSocket: 'service-hatch-lower-hinge',
    localStart: [-0.83, 1.03, 0.535],
    localEnd: [-0.83, 1.45, 0.535],
    contactType: 'hinge',
    overlap: 0.025,
    gapTolerance: 0.005,
    evidenceRefs: ['rabbit-hutch concept: visible front service hatch'],
  };
  box(context, hatch, 'solid-service-hatch-panel', [0.56, 0.42, 0.06], [0, 0.21, 0], shelter, 'access');
  box(context, hatch, 'service-hatch-top-brace', [0.48, 0.045, 0.075], [0, 0.36, 0.025], timber, 'access');
  for (const x of [-0.21, 0.21]) box(context, hatch, `service-hatch-hinge-${x}`, [0.075, 0.08, 0.04], [x, 0.02, 0.045], iron, 'hardware');
  box(context, hatch, 'service-hatch-latch', [0.08, 0.06, 0.045], [0, 0.33, 0.05], iron, 'hardware');
  addChannel(context, hatch, 'rotation', 'x', 1.02, 0.65, 0);

  addSocket(context, hutch, 'terrain', [0, 0, 0]);
  addSocket(context, hutch, 'feed', [0.35, 0.16, 0.54]);
  addSocket(context, hutch, 'water', [1.3, 0.3, 0.5]);
  addSocket(context, hutch, 'shelter', [-0.83, 1.22, 0]);
  addSocket(context, hutch, 'run', [0.4, 0.32, 0]);
  addSocket(context, hutch, 'service', [-0.83, 0.96, 0.82]);
  addSocket(context, hutch, 'attachment', [0, 1.72, -0.5]);
  addSocket(context, hutch, 'adjacency-east', [2.05, 0, 0]);
  addSocket(context, hutch, 'waste-cleanout', [-1.34, 0.42, -0.25]);

  addCollider(context, hutch, 'hutch-cabinet', 'box', [0, 1.25, 0], { width: 2.52, height: 0.76, depth: 1, isTrigger: false });
  addCollider(context, hutch, 'sheltered-run', 'box', [0.3, 0.43, 0], { width: 3.15, height: 0.74, depth: 0.96, isTrigger: true });
  addCollider(context, hatch, 'service-hatch', 'box', [0, 0.21, 0], { width: 0.56, height: 0.42, depth: 0.08, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    concept: 'references/concepts/rabbit-hutch.png',
    silhouette: 'lean elongated cabinet with a shallow shed roof and a run beneath and beside it',
    identity: ['asymmetrical enclosed sleeping compartment', 'two mesh-front doors', 'fold-down service hatch', 'sheltered run'],
    correctionPasses: 0,
  };
  Object.defineProperty(root.userData, 'rabbitHutchRig', {
    value: { hatch, cabinet, run },
    enumerable: false,
    configurable: true,
  });
  return root;
}

export function animateRabbitHutch(root, timeSeconds) {
  const rig = root?.userData?.rabbitHutchRig;
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!rig?.hatch || !channel) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const openPhase = Math.max(0, Math.sin(time * channel.frequency + channel.phase));
  rig.hatch.rotation.x = channel.baseValue + openPhase * channel.amplitude;
  return root;
}
