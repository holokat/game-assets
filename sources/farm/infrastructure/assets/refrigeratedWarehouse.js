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

const material = (name, color, roughness = 0.64, metalness = 0) => new THREE.MeshStandardMaterial({
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

function attach(node, parentSocket, localStart, localEnd, contactType = 'surface-contact') {
  node.userData.attachment = {
    parentId: 'warehouse-building',
    parentSocket,
    localStart,
    localEnd,
    contactType,
    overlap: 0.025,
    gapTolerance: 0.01,
    evidenceRefs: ['four-view-concept'],
  };
}

export function createRefrigeratedWarehouse() {
  const context = createAssetContext('refrigerated-warehouse', {
    label: 'Refrigerated Warehouse',
    reusedReference: 'warehouse',
    targetHeightMetres: 1.95,
  });
  context.materials = {
    stone: material('refrigerated-warehouse-stone-foundation', '#887f72', 0.92),
    panel: material('refrigerated-warehouse-insulated-panel', '#d9d3c5', 0.78),
    roof: material('refrigerated-warehouse-galvanized-roof', '#6d797d', 0.48, 0.38),
    iron: material('refrigerated-warehouse-dark-iron-seal', '#30383a', 0.48, 0.58),
    equipment: material('refrigerated-warehouse-condenser-casing', '#9aa09d', 0.62, 0.28),
  };
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0, 0]);
  addSocket(context, model, 'loading', [0, 0.18, 1.2]);
  addSocket(context, model, 'cold-storage', [0, 0.72, 0]);
  addSocket(context, model, 'service', [1.92, 0.52, -0.3]);
  addSocket(context, model, 'refrigeration', [2.25, 0.65, 0.34]);
  addSocket(context, model, 'ventilation', [1.9, 1.25, 0]);
  addSocket(context, model, 'attachment', [0, 1.72, 0]);
  addSocket(context, model, 'adjacency-east', [2.55, 0, 0]);
  addSocket(context, model, 'dock', [0, 0.24, 1.45]);

  const building = addPivot(context, model, 'warehouse-building');
  const foundation = mesh(context, building, 'low-stone-foundation', box(3.72, 0.18, 1.74), context.materials.stone, 'building');
  foundation.position.y = 0.09;
  const shell = mesh(context, building, 'insulated-warehouse-shell', box(3.52, 1.18, 1.54), context.materials.panel, 'building');
  shell.position.y = 0.77;
  for (const x of [-1.62, -0.82, 0, 0.82, 1.62]) {
    const frontFrame = mesh(context, building, `front-frame-${x}`, box(0.06, 1.2, 0.06), context.materials.iron, 'frame');
    frontFrame.position.set(x, 0.78, 0.8);
    const rearFrame = mesh(context, building, `rear-frame-${x}`, box(0.06, 1.2, 0.06), context.materials.iron, 'frame');
    rearFrame.position.set(x, 0.78, -0.8);
  }
  for (const z of [-0.43, 0.43]) {
    const slope = mesh(context, building, `shallow-roof-${z}`, box(3.92, 0.09, 0.96), context.materials.roof, 'roof');
    slope.position.set(0, 1.48, z);
    slope.rotation.x = z < 0 ? 0.31 : -0.31;
  }
  const ridge = mesh(context, building, 'roof-ridge', box(3.9, 0.1, 0.11), context.materials.iron, 'roof');
  ridge.position.set(0, 1.64, 0);
  for (const x of [-1.34, 0, 1.34]) {
    const roofVent = mesh(context, building, `roof-vent-${x}`, box(0.26, 0.24, 0.26), context.materials.iron, 'ventilation');
    roofVent.position.set(x, 1.76, 0);
    const cap = mesh(context, building, `roof-vent-cap-${x}`, box(0.34, 0.06, 0.34), context.materials.roof, 'ventilation');
    cap.position.set(x, 1.91, 0);
  }
  addCollider(context, building, 'building', 'box', [0, 0.78, 0], {
    width: 3.54,
    height: 1.56,
    depth: 1.56,
    isTrigger: false,
  });

  for (const [id, x] of [['left', -0.68], ['right', 0.68]]) {
    const door = addPivot(context, building, `${id}-insulated-loading-door`, [x, 0.79, 0.825]);
    mesh(context, door, `${id}-door-panel`, box(1.28, 1.0, 0.09), context.materials.panel, 'doors');
    for (const [part, px, py, width, height] of [
      ['top-seal', 0, 0.46, 1.3, 0.07],
      ['bottom-seal', 0, -0.46, 1.3, 0.07],
      ['left-seal', -0.61, 0, 0.07, 0.92],
      ['right-seal', 0.61, 0, 0.07, 0.92],
    ]) {
      const seal = mesh(context, door, `${id}-${part}`, box(width, height, 0.07), context.materials.iron, 'doors');
      seal.position.set(px, py, 0.08);
    }
    const handle = mesh(context, door, `${id}-door-handle`, box(0.06, 0.24, 0.08), context.materials.iron, 'doors');
    handle.position.set(id === 'left' ? 0.48 : -0.48, 0, 0.09);
  }
  const track = mesh(context, building, 'loading-door-track', box(3.04, 0.06, 0.08), context.materials.iron, 'doors');
  track.position.set(0, 1.36, 0.85);
  for (const x of [-0.68, 0.68]) {
    const wheel = mesh(context, building, `door-wheel-${x}`, new THREE.CylinderGeometry(0.07, 0.07, 0.04, 8), context.materials.iron, 'doors');
    wheel.position.set(x, 1.31, 0.86);
    wheel.rotation.x = Math.PI / 2;
  }
  addCollider(context, building, 'loading-doors', 'box', [0, 0.79, 0.825], {
    width: 2.62,
    height: 1.02,
    depth: 0.13,
    isTrigger: false,
  });

  const serviceDoor = addPivot(context, building, 'insulated-service-door', [1.79, 0.59, -0.25]);
  const servicePanel = mesh(context, serviceDoor, 'service-door-panel', box(0.08, 0.86, 0.5), context.materials.panel, 'service');
  const serviceSeal = mesh(context, serviceDoor, 'service-door-seal', box(0.1, 0.94, 0.58), context.materials.iron, 'service');
  serviceSeal.position.x = -0.015;
  serviceSeal.renderOrder = -1;
  servicePanel.position.x = 0.02;
  const serviceHandle = mesh(context, serviceDoor, 'service-door-handle', box(0.08, 0.18, 0.06), context.materials.iron, 'service');
  serviceHandle.position.set(0.08, 0, 0.18);

  const dock = mesh(context, building, 'front-loading-dock', box(2.86, 0.28, 0.56), context.materials.stone, 'dock');
  dock.position.set(0, 0.14, 1.04);
  const ramp = mesh(context, building, 'short-dock-ramp', box(0.78, 0.12, 0.62), context.materials.stone, 'dock');
  ramp.position.set(0, 0.11453, 1.56);
  ramp.rotation.x = 0.18;
  addCollider(context, building, 'dock', 'box', [0, 0.14, 1.04], {
    width: 2.86,
    height: 0.28,
    depth: 0.58,
    isTrigger: false,
  });

  const ventilation = addPivot(context, building, 'wall-ventilation');
  for (const z of [-0.5, 0.5]) {
    const ventBack = mesh(context, ventilation, `vent-back-${z}`, box(0.07, 0.34, 0.38), context.materials.iron, 'ventilation');
    ventBack.position.set(1.79, 1.18, z);
    for (let index = 0; index < 3; index += 1) {
      const slat = mesh(context, ventilation, `vent-${z}-slat-${index}`, box(0.08, 0.06, 0.3), context.materials.equipment, 'ventilation');
      slat.position.set(1.84, 1.08 + index * 0.1, z);
      slat.rotation.z = -0.12;
    }
  }

  const condenser = addPivot(context, building, 'compact-condenser', [1.82, 0.4, 0.28]);
  const casing = mesh(context, condenser, 'condenser-casing', box(0.56, 0.54, 0.66), context.materials.equipment, 'refrigeration');
  casing.position.set(0.28, 0.27, 0);
  attach(casing, 'refrigeration', [1.76, 0.42, -0.05], [1.76, 0.94, 0.61], 'surface-contact');
  const guard = mesh(context, condenser, 'fan-guard', new THREE.TorusGeometry(0.2, 0.025, 4, 12), context.materials.iron, 'refrigeration');
  guard.position.set(0.58, 0.28, 0);
  guard.rotation.y = Math.PI / 2;
  const fan = addPivot(context, condenser, 'condenser-fan', [0.6, 0.28, 0]);
  for (let index = 0; index < 4; index += 1) {
    const blade = mesh(context, fan, `fan-blade-${index}`, box(0.05, 0.31, 0.075), context.materials.iron, 'refrigeration');
    blade.position.y = 0.14;
    blade.rotation.x = index * Math.PI / 2;
  }
  const hub = mesh(context, fan, 'fan-hub', new THREE.CylinderGeometry(0.075, 0.075, 0.08, 8), context.materials.iron, 'refrigeration');
  hub.rotation.z = Math.PI / 2;
  addChannel(context, fan, 'rotation', 'x', Math.PI * 2, 0.85, 0);
  addCollider(context, condenser, 'condenser', 'box', [0.28, 0.27, 0], {
    width: 0.62,
    height: 0.58,
    depth: 0.7,
    isTrigger: false,
  });

  const storage = addPivot(context, building, 'cold-storage-rack');
  for (const x of [-0.92, 0, 0.92]) {
    const post = mesh(context, storage, `rack-post-${x}`, box(0.05, 0.72, 0.05), context.materials.iron, 'storage');
    post.position.set(x, 0.56, 0.38);
    for (const y of [0.4, 0.73]) {
      const shelf = mesh(context, storage, `rack-shelf-${x}-${y}`, box(0.46, 0.05, 0.3), context.materials.equipment, 'storage');
      shelf.position.set(x - 0.18, y, 0.38);
    }
  }

  const root = finishAsset(context);
  root.userData.artDirection = {
    style: 'practical low-poly refrigerated farm warehouse',
    reuseReference: 'src/assets/warehouse.js',
    concept: 'references/concepts/refrigerated-warehouse.png',
    visibleMotion: 'Only the clearly modeled exterior condenser fan rotates.',
  };
  root.userData.refrigeratedWarehouseRig = { building, serviceDoor, ventilation, condenser, fan, storage };
  return root;
}

export function animateRefrigeratedWarehouse(root, timeSeconds) {
  const fan = root?.userData?.refrigeratedWarehouseRig?.fan;
  if (!fan) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  fan.rotation.x = time * Math.PI * 2 * 0.85;
  return root;
}
