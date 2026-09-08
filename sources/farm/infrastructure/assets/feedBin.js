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

const material = (name, color, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({
  name,
  color,
  roughness,
  metalness,
  flatShading: true,
  vertexColors: true,
});
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth);
const mesh = (context, parent, id, geometry, materialValue, group) => registerMesh(
  context,
  parent,
  id,
  new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue),
  group,
  'structure',
);

function attach(node, parentSocket, localStart, localEnd, contactType = 'embedded') {
  node.userData.attachment = {
    parentId: 'feed-bin-frame',
    parentSocket,
    localStart,
    localEnd,
    contactType,
    overlap: 0.025,
    gapTolerance: 0.01,
    evidenceRefs: ['four-view-concept'],
  };
}

function beamBetween(context, parent, id, start, end, width, materialValue, group) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const beam = mesh(context, parent, id, box(width, direction.length(), width), materialValue, group);
  beam.position.copy(from).add(to).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  attach(beam, 'frame', start, end);
  return beam;
}

export function createFeedBin() {
  const context = createAssetContext('feed-bin', { label: 'Feed Bin', targetHeightMetres: 3.46 });
  context.materials = {
    galvanized: material('feed-bin-galvanized-shell', '#829094', 0.58, 0.42),
    hopper: material('feed-bin-dark-hopper', '#596468', 0.66, 0.38),
    iron: material('feed-bin-dark-iron', '#30383a', 0.48, 0.62),
    stone: material('feed-bin-stone-pads', '#8b8373', 0.94),
  };
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, model, 'fill', [0, 3.5, 0]);
  addSocket(context, model, 'feed-output', [0, 1.05, 0.82]);
  addSocket(context, model, 'service', [0.92, 2.4, 0]);
  addSocket(context, model, 'attachment', [0, 3.52, -0.42]);
  addSocket(context, model, 'adjacency', [-1.15, 0, 0]);

  const frame = addPivot(context, model, 'feed-bin-frame');
  for (const [id, x, z] of [
    ['front-left', -0.68, 0.48],
    ['front-right', 0.68, 0.48],
    ['rear-left', -0.68, -0.48],
    ['rear-right', 0.68, -0.48],
  ]) {
    const pad = mesh(context, frame, `${id}-pad`, box(0.26, 0.16, 0.26), context.materials.stone, 'foundation');
    pad.position.set(x, 0.08, z);
    const leg = mesh(context, frame, `${id}-leg`, box(0.1, 1.78, 0.1), context.materials.iron, 'frame');
    leg.position.set(x, 1.03, z);
    attach(leg, 'terrain', [x, 0.14, z], [x, 1.92, z]);
  }

  for (const z of [-0.5, 0.5]) {
    beamBetween(context, frame, `brace-a-${z}`, [-0.65, 0.38, z], [0.65, 1.42, z], 0.055, context.materials.iron, 'braces');
    beamBetween(context, frame, `brace-b-${z}`, [0.65, 0.38, z], [-0.65, 1.42, z], 0.055, context.materials.iron, 'braces');
  }

  const hopper = addPivot(context, model, 'tapered-hopper');
  const hopperGeometry = new THREE.CylinderGeometry(0.9, 0.22, 0.76, 4, 1, false);
  hopperGeometry.rotateY(Math.PI / 4);
  hopperGeometry.scale(1, 1, 0.78);
  const hopperBody = mesh(context, hopper, 'hopper-body', hopperGeometry, context.materials.hopper, 'hopper');
  hopperBody.position.y = 1.72;
  const neck = mesh(context, hopper, 'hopper-neck', box(0.32, 0.2, 0.32), context.materials.hopper, 'hopper');
  neck.position.set(0, 1.24, 0.04);
  addCollider(context, hopper, 'hopper', 'box', [0, 1.68, 0], {
    width: 1.56,
    height: 0.86,
    depth: 1.2,
    isTrigger: false,
  });

  const body = addPivot(context, model, 'upper-container');
  const shell = mesh(context, body, 'rectangular-shell', box(1.5, 1.48, 1.16), context.materials.galvanized, 'shell');
  shell.position.y = 2.78;
  for (const y of [2.1, 2.52, 2.94, 3.36]) {
    const frontBand = mesh(context, body, `front-band-${y}`, box(1.62, 0.07, 0.07), context.materials.iron, 'bands');
    frontBand.position.set(0, y, 0.61);
    const rearBand = mesh(context, body, `rear-band-${y}`, box(1.62, 0.07, 0.07), context.materials.iron, 'bands');
    rearBand.position.set(0, y, -0.61);
    const leftBand = mesh(context, body, `left-band-${y}`, box(0.07, 0.07, 1.16), context.materials.iron, 'bands');
    leftBand.position.set(-0.78, y, 0);
    const rightBand = mesh(context, body, `right-band-${y}`, box(0.07, 0.07, 1.16), context.materials.iron, 'bands');
    rightBand.position.set(0.78, y, 0);
  }
  for (const [id, x, z] of [
    ['front-left', -0.74, 0.56], ['front-right', 0.74, 0.56],
    ['rear-left', -0.74, -0.56], ['rear-right', 0.74, -0.56],
  ]) {
    const corner = mesh(context, body, `${id}-corner`, box(0.11, 1.56, 0.11), context.materials.iron, 'bands');
    corner.position.set(x, 2.78, z);
  }
  addCollider(context, body, 'container', 'box', [0, 2.78, 0], {
    width: 1.62,
    height: 1.56,
    depth: 1.24,
    isTrigger: false,
  });

  const lid = addPivot(context, model, 'fill-lid', [0, 3.56, -0.58]);
  const lidPanel = mesh(context, lid, 'fill-lid-panel', box(1.62, 0.09, 1.28), context.materials.galvanized, 'lid');
  lidPanel.position.set(0, 0, 0.58);
  for (const x of [-0.52, 0.52]) {
    const hinge = mesh(context, lid, `lid-hinge-${x}`, box(0.18, 0.08, 0.14), context.materials.iron, 'lid');
    hinge.position.set(x, 0.02, 0.02);
  }
  const handle = mesh(context, lid, 'lid-handle', new THREE.TorusGeometry(0.14, 0.025, 4, 8, Math.PI), context.materials.iron, 'lid');
  handle.position.set(0, 0.08, 0.58);
  handle.rotation.x = Math.PI / 2;

  const gate = addPivot(context, hopper, 'dispensing-gate', [0, 1.28, 0.7]);
  const gatePlate = mesh(context, gate, 'gate-plate', box(0.48, 0.44, 0.08), context.materials.iron, 'dispense');
  gatePlate.position.y = 0.22;
  const gateHandle = mesh(context, gate, 'gate-handle', box(0.22, 0.06, 0.08), context.materials.galvanized, 'dispense');
  gateHandle.position.set(0, 0.3, 0.08);
  addChannel(context, gate, 'position', 'y', 0.38, 0.55, 0);
  addCollider(context, gate, 'dispensing-gate', 'box', [0, 0.22, 0], {
    width: 0.5,
    height: 0.46,
    depth: 0.12,
    isTrigger: false,
  });
  const chute = mesh(context, hopper, 'feed-chute', box(0.48, 0.12, 0.46), context.materials.galvanized, 'dispense');
  chute.position.set(0, 1.13, 0.83);
  chute.rotation.x = -0.42;
  attach(chute, 'feed-output', [-0.24, 1.26, 0.63], [0.24, 1.02, 1.03], 'hinge');

  addCollider(context, frame, 'support-frame', 'box', [0, 0.98, 0], {
    width: 1.46,
    height: 1.8,
    depth: 1.08,
    isTrigger: false,
  });

  const root = finishAsset(context);
  root.userData.artDirection = {
    style: 'lean practical low-poly farm infrastructure',
    reference: 'references/concepts/feed-bin.png',
    note: 'Approximate procedural reconstruction from a generated four-view concept sheet.',
    visibleMotion: 'Only the front dispensing slide gate translates vertically.',
  };
  root.userData.feedBinRig = { frame, hopper, body, lid, gate };
  return root;
}

export function animateFeedBin(root, timeSeconds) {
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!channel) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  channel.node.position.y = channel.baseValue + Math.sin(time * channel.frequency + channel.phase) * channel.amplitude;
  return root;
}
