import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const mat = (name, color) => new THREE.MeshStandardMaterial({ name, color, roughness: .62, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, material, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group);

export function createWheelbarrow() {
  const context = createAssetContext('wheelbarrow');
  const { model } = context;
  const steel = mat('wheelbarrow-galvanized-tray', '#a0a7a4');
  const wood = mat('wheelbarrow-timber-handles', '#76583e');
  const iron = mat('wheelbarrow-dark-wheel', '#354145');
  const wheelY = .3518909215927124;

  addSocket(context, model, 'ground', [0, 0, 0]);
  const barrow = addPivot(context, model, 'lean-farm-wheelbarrow', [0, 0, 0]);
  const tray = mesh(context, barrow, 'empty-faceted-tray', new THREE.BoxGeometry(1.2, .42, .78), steel, 'tray');
  tray.position.set(-.2, .72, 0);
  const axle = mesh(context, barrow, 'wheel-axle', new THREE.CylinderGeometry(.06, .06, .68, 6), iron, 'wheel');
  axle.position.set(-.8, wheelY, 0);
  axle.rotation.z = Math.PI / 2;
  const wheelPivot = addPivot(context, barrow, 'visible-wheel-pivot', [-.8, wheelY, 0]);
  const wheel = mesh(context, wheelPivot, 'single-wheel', new THREE.TorusGeometry(.3, .07, 5, 10), iron, 'wheel');
  wheel.rotation.y = Math.PI / 2;
  addChannel(context, wheelPivot, 'rotation', 'x', Math.PI, .7, 0);

  for (const z of [-.25, .25]) {
    const handle = mesh(context, barrow, 'slender-timber-handle', new THREE.BoxGeometry(1.45, .08, .1), wood, 'frame');
    handle.position.set(.65, .45, z);
    handle.rotation.z = -.16;
    const leg = mesh(context, barrow, 'support-leg', new THREE.BoxGeometry(.08, .45, .08), iron, 'frame');
    leg.position.set(.25, .23, z);
  }

  addSocket(context, barrow, 'terrain-anchor', [0, 0, 0]);
  addSocket(context, barrow, 'load', [0, .92, 0]);
  addSocket(context, barrow, 'handle', [1.35, .5, 0]);
  addSocket(context, barrow, 'attachment', [-.8, wheelY, 0]);
  addSocket(context, barrow, 'ground', [0, 0, 0]);
  addCollider(context, barrow, 'tray', 'box', [-.2, .72, 0], { width: 1.2, height: .42, depth: .78, isTrigger: false });
  addCollider(context, barrow, 'wheel', 'box', [-.8, wheelY, 0], { width: .15, height: .62, depth: .62, isTrigger: false });
  return finishAsset(context);
}

export function animateWheelbarrow(root, time) {
  for (const channel of root.userData.sculptRuntime.animationChannels) channel.node.rotation.x = channel.baseValue + Math.sin(time * channel.frequency) * channel.amplitude;
  return root;
}
