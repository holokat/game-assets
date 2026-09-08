import * as THREE from 'three';

export function createAssetContext(id, metadata = {}) {
  const root = new THREE.Group();
  root.name = `${id}-root`;
  const model = new THREE.Group();
  model.name = `${id}-model`;
  root.add(model);

  const context = {
    id,
    root,
    model,
    nodes: { [root.name]: root, [model.name]: model },
    pivots: { root },
    sockets: {},
    colliders: {},
    destructionGroups: {},
    animationChannels: [],
    metadata,
  };

  root.userData.assetId = id;
  root.userData.forwardAxis = '+Z';
  root.userData.unit = 'metre';
  root.userData.groundY = 0;
  return context;
}

export function addPivot(context, parent, id, position = [0, 0, 0]) {
  const pivot = new THREE.Group();
  pivot.name = `${context.id}-${id}`;
  pivot.position.set(...position);
  parent.add(pivot);
  context.nodes[pivot.name] = pivot;
  context.pivots[id] = pivot;
  return pivot;
}

export function addSocket(context, parent, id, position = [0, 0, 0]) {
  const socket = new THREE.Object3D();
  socket.name = `${context.id}-${id}-socket`;
  socket.position.set(...position);
  socket.userData.socket = { id, assetId: context.id };
  parent.add(socket);
  context.nodes[socket.name] = socket;
  context.sockets[id] = socket;
  return socket;
}

export function addCollider(context, parent, id, type, position, params) {
  const collider = new THREE.Object3D();
  collider.name = `${context.id}-collider-${id}`;
  collider.position.set(...position);
  collider.visible = false;
  collider.userData.collider = { id, type, space: 'parent-local', ...params };
  parent.add(collider);
  context.nodes[collider.name] = collider;
  context.colliders[id] = collider;
  return collider;
}

export function registerMesh(context, pivot, id, mesh, group, minimumPass = 'blockout') {
  mesh.name = `${context.id}-${id}-mesh`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.minimumPass = minimumPass;
  mesh.userData.destructionGroup = group;
  pivot.add(mesh);
  context.nodes[mesh.name] = mesh;
  (context.destructionGroups[group] ??= []).push(mesh.name);
  return mesh;
}

export function addChannel(context, node, property, axis, amplitude, frequency, phase = 0) {
  context.animationChannels.push({
    node,
    property,
    axis,
    baseValue: node[property][axis],
    amplitude,
    frequency,
    phase,
  });
}

export function finishAsset(context) {
  const runtime = {
    version: 1,
    assetId: context.id,
    pivots: context.pivots,
    sockets: context.sockets,
    colliders: context.colliders,
    nodes: context.nodes,
    destructionGroups: context.destructionGroups,
    animationChannels: context.animationChannels,
    dispose() {
      const geometries = new Set();
      const materials = new Set();
      context.root.traverse((node) => {
        if (!node.isMesh) return;
        geometries.add(node.geometry);
        (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry?.dispose());
      materials.forEach((material) => material?.dispose());
    },
  };
  Object.defineProperty(context.root.userData, 'sculptRuntime', {
    value: runtime,
    enumerable: false,
    configurable: true,
  });
  return context.root;
}
