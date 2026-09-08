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

const material = (name, color, roughness = 0.78, metalness = 0) => new THREE.MeshStandardMaterial({
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

function addGable(context, parent, id, z) {
  const shape = new THREE.Shape();
  shape.moveTo(-1.58, 0);
  shape.lineTo(0, 0.72);
  shape.lineTo(1.58, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, steps: 1 });
  const gable = mesh(context, parent, `${id}-gable`, geometry, context.materials.timber, 'shell');
  gable.position.set(0, 2.35, z - 0.05);
  return gable;
}

function markAttachment(node, parentSocket, localStart, localEnd, contactType = 'surface-contact') {
  node.userData.attachment = {
    parentId: 'storehouse-body',
    parentSocket,
    localStart,
    localEnd,
    contactType,
    overlap: 0.03,
    gapTolerance: 0.01,
    evidenceRefs: ['four-view-concept'],
  };
}

export function createProduceStorehouse() {
  const context = createAssetContext('produce-storehouse', {
    label: 'Produce Storehouse',
    targetHeightMetres: 3.18,
  });
  context.materials = {
    timber: material('produce-storehouse-warm-timber', '#8b633e', 0.86),
    frame: material('produce-storehouse-dark-frame', '#54402d', 0.84),
    stone: material('produce-storehouse-stone', '#8f8778', 0.92),
    roof: material('produce-storehouse-galvanized-roof', '#737f83', 0.52, 0.38),
    iron: material('produce-storehouse-dark-iron', '#30383a', 0.48, 0.58),
  };
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, model, 'loading', [0, 0.38, 2.02]);
  addSocket(context, model, 'storage', [0, 1.18, 0]);
  addSocket(context, model, 'ventilation', [0, 2.28, 0.9]);
  addSocket(context, model, 'service', [1.96, 0.98, 0.12]);
  addSocket(context, model, 'attachment', [0, 3.18, 0]);
  addSocket(context, model, 'adjacency', [-2.08, 0, 0]);

  const body = addPivot(context, model, 'storehouse-body');
  for (const [id, x, z] of [
    ['front-left', -1.42, 0.92],
    ['front-right', 1.42, 0.92],
    ['rear-left', -1.42, -0.92],
    ['rear-right', 1.42, -0.92],
    ['platform-left', -1.42, 1.72],
    ['platform-right', 1.42, 1.72],
  ]) {
    const footing = mesh(context, body, `${id}-footing`, box(0.28, 0.22, 0.28), context.materials.stone, 'foundation');
    footing.position.set(x, 0.11, z);
  }

  const floor = mesh(context, body, 'raised-floor', box(3.26, 0.18, 2.12), context.materials.frame, 'floor');
  floor.position.set(0, 0.35, 0);
  for (const [id, x, z] of [
    ['front-left', -1.48, 0.94], ['front-right', 1.48, 0.94],
    ['rear-left', -1.48, -0.94], ['rear-right', 1.48, -0.94],
  ]) {
    const post = mesh(context, body, `${id}-post`, box(0.16, 2.1, 0.16), context.materials.frame, 'frame');
    post.position.set(x, 1.39, z);
  }

  const frontWall = mesh(context, body, 'front-wall', box(3.06, 1.92, 0.12), context.materials.timber, 'shell');
  frontWall.position.set(0, 1.38, 0.94);
  const rearWall = mesh(context, body, 'rear-wall', box(3.06, 1.92, 0.12), context.materials.timber, 'shell');
  rearWall.position.set(0, 1.38, -0.94);
  const westWall = mesh(context, body, 'west-wall', box(0.12, 1.92, 1.76), context.materials.timber, 'shell');
  westWall.position.set(-1.48, 1.38, 0);
  const eastWall = mesh(context, body, 'east-wall', box(0.12, 1.92, 1.76), context.materials.timber, 'shell');
  eastWall.position.set(1.48, 1.38, 0);
  addGable(context, body, 'front', 1.0);
  addGable(context, body, 'rear', -0.9);

  for (const [id, y] of [['lower', 0.54], ['upper', 2.28]]) {
    const frontBeam = mesh(context, body, `front-${id}-beam`, box(3.24, 0.15, 0.15), context.materials.frame, 'frame');
    frontBeam.position.set(0, y, 1.01);
    const rearBeam = mesh(context, body, `rear-${id}-beam`, box(3.24, 0.15, 0.15), context.materials.frame, 'frame');
    rearBeam.position.set(0, y, -1.01);
  }
  addCollider(context, body, 'building', 'box', [0, 1.58, 0], {
    width: 3.3,
    height: 2.76,
    depth: 2.12,
    isTrigger: false,
  });

  const roof = addPivot(context, model, 'pitched-roof');
  for (const [id, x, rotationZ] of [['west', -0.86, 0.43], ['east', 0.86, -0.43]]) {
    const panel = mesh(context, roof, `${id}-roof-panel`, box(1.95, 0.1, 2.48), context.materials.roof, 'roof');
    panel.position.set(x, 2.75, 0);
    panel.rotation.z = rotationZ;
  }
  const ridge = mesh(context, roof, 'roof-ridge', box(0.16, 0.14, 2.58), context.materials.iron, 'roof');
  ridge.position.set(0, 3.14, 0);

  const platform = addPivot(context, model, 'loading-platform');
  const deck = mesh(context, platform, 'platform-deck', box(3.64, 0.18, 0.78), context.materials.timber, 'platform');
  deck.position.set(0, 0.35, 1.48);
  markAttachment(deck, 'loading', [-1.82, 0.35, 1.09], [1.82, 0.35, 1.87], 'overlap');
  const awning = mesh(context, platform, 'platform-awning', box(3.48, 0.09, 0.86), context.materials.roof, 'platform');
  awning.position.set(0, 2.25, 1.38);
  awning.rotation.x = 0.11;
  markAttachment(awning, 'loading', [-1.74, 2.25, 1.0], [1.74, 2.25, 1.78], 'hinge');
  for (const x of [-1.58, 1.58]) {
    const support = mesh(context, platform, `awning-support-${x < 0 ? 'left' : 'right'}`, box(0.11, 1.58, 0.11), context.materials.frame, 'platform');
    support.position.set(x, 1.41, 1.73);
    markAttachment(support, 'loading', [x, 0.53, 1.73], [x, 2.2, 1.73], 'embedded');
  }
  addCollider(context, platform, 'platform', 'box', [0, 0.35, 1.48], {
    width: 3.64,
    height: 0.22,
    depth: 0.8,
    isTrigger: false,
  });

  const slidingDoor = addPivot(context, model, 'sliding-loading-door', [-0.5, 0.48, 1.09]);
  const loadingDoor = mesh(context, slidingDoor, 'loading-door-leaf', box(1.48, 1.68, 0.1), context.materials.timber, 'doors');
  loadingDoor.position.set(0, 0.84, 0);
  for (const y of [0.34, 1.32]) {
    const brace = mesh(context, slidingDoor, `door-brace-${y}`, box(1.32, 0.09, 0.08), context.materials.frame, 'doors');
    brace.position.set(0, y, 0.08);
  }
  for (const x of [-0.52, 0.52]) {
    const hanger = mesh(context, slidingDoor, `door-hanger-${x}`, box(0.12, 0.24, 0.08), context.materials.iron, 'doors');
    hanger.position.set(x, 1.75, 0.08);
  }
  const track = mesh(context, body, 'sliding-door-track', box(2.55, 0.1, 0.1), context.materials.iron, 'doors');
  track.position.set(-0.18, 2.27, 1.09);
  addChannel(context, slidingDoor, 'position', 'x', 1.12, 0.32, 0);
  addCollider(context, slidingDoor, 'door', 'box', [0, 0.84, 0], {
    width: 1.5,
    height: 1.7,
    depth: 0.13,
    isTrigger: false,
  });

  const serviceDoor = addPivot(context, body, 'service-door', [1.56, 0.5, 0.3]);
  const serviceLeaf = mesh(context, serviceDoor, 'service-door-leaf', box(0.1, 1.42, 0.66), context.materials.timber, 'service');
  serviceLeaf.position.y = 0.71;
  for (const y of [0.34, 1.08]) {
    const hinge = mesh(context, serviceDoor, `service-hinge-${y}`, box(0.08, 0.09, 0.25), context.materials.iron, 'service');
    hinge.position.set(0.08, y, -0.2);
  }
  const handle = mesh(context, serviceDoor, 'service-handle', box(0.08, 0.18, 0.08), context.materials.iron, 'service');
  handle.position.set(0.08, 0.72, 0.22);

  const ventilation = addPivot(context, body, 'louvered-ventilation');
  for (const [side, x, z, rotationY] of [
    ['front', 0, 1.08, 0],
    ['west', -1.56, -0.18, Math.PI / 2],
  ]) {
    const ventFrame = mesh(context, ventilation, `${side}-vent-frame`, box(side === 'front' ? 1.08 : 0.1, 0.54, side === 'front' ? 0.1 : 1.08), context.materials.frame, 'ventilation');
    ventFrame.position.set(x, 2.55, z);
    for (let index = 0; index < 4; index += 1) {
      const slat = mesh(context, ventilation, `${side}-vent-slat-${index + 1}`, box(0.92, 0.07, 0.08), context.materials.iron, 'ventilation');
      slat.position.set(x, 2.36 + index * 0.12, z + (side === 'west' ? 0.02 : 0.06));
      slat.rotation.y = rotationY;
      slat.rotation.x = -0.14;
    }
  }

  const rack = addPivot(context, body, 'exterior-crate-rack');
  for (const y of [0.72, 1.18, 1.64]) {
    const shelf = mesh(context, rack, `rack-shelf-${y}`, box(0.58, 0.08, 0.9), context.materials.frame, 'rack');
    shelf.position.set(-1.79, y, -0.22);
    markAttachment(shelf, 'storage', [-1.52, y, -0.67], [-1.52, y, 0.23], 'surface-contact');
  }
  for (const z of [-0.64, 0.2]) {
    const upright = mesh(context, rack, `rack-upright-${z}`, box(0.1, 1.02, 0.1), context.materials.frame, 'rack');
    upright.position.set(-1.82, 1.18, z);
    markAttachment(upright, 'storage', [-1.52, 0.67, z], [-1.52, 1.69, z], 'surface-contact');
  }
  const rackCover = mesh(context, rack, 'rack-cover', box(0.74, 0.08, 1.04), context.materials.roof, 'rack');
  rackCover.position.set(-1.82, 1.79, -0.22);
  rackCover.rotation.z = 0.12;
  markAttachment(rackCover, 'storage', [-1.52, 1.72, -0.74], [-1.52, 1.72, 0.3], 'hinge');

  const root = finishAsset(context);
  root.userData.artDirection = {
    style: 'stylized low-poly game asset',
    reference: 'references/concepts/produce-storehouse.png',
    note: 'Approximate procedural reconstruction from a generated four-view concept sheet.',
    visibleMotion: 'Only the wide front sliding loading door translates along its iron track.',
  };
  root.userData.produceStorehouseRig = { body, roof, platform, slidingDoor, serviceDoor, ventilation, rack };
  return root;
}

export function animateProduceStorehouse(root, timeSeconds) {
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (!channel) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  channel.node.position.x = channel.baseValue + Math.sin(time * channel.frequency + channel.phase) * channel.amplitude;
  return root;
}
