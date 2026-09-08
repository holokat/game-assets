import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';

export const IRRIGATION_CANAL_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);

function material(name, color, roughness, metalness = 0) { return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: false }); }
function mesh(context, parent, id, geometry, mat, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(geometry, mat), group, minimumPass); }
function applyPass(root, passId) { root.traverse((node) => { if (node.isMesh) node.visible = true; }); root.userData.passId = passId; return root; }

export function createIrrigationCanal(options = {}) {
  const passId = IRRIGATION_CANAL_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('irrigation-canal', { label: 'Irrigation Canal', targetLengthMetres: 3.8, passId });
  context.materials = { stone: material('irrigation-canal-warm-masonry-mat', '#918a7c', 0.82), inner: material('irrigation-canal-dry-channel-mat', '#625e55', 0.9), iron: material('irrigation-canal-dark-gate-iron-mat', '#30393a', 0.58, 0.42) };
  const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'north-tile-socket', [0, 0.35, 1.9]); addSocket(context, model, 'south-tile-socket', [0, 0.35, -1.9]);

  const canal = addPivot(context, model, 'canal-body');
  const bed = addPivot(context, canal, 'dry-channel-bed');
  mesh(context, bed, 'dry-channel-bed', new THREE.BoxGeometry(1.42, 0.13, 3.78), context.materials.inner, 'dry-channel-bed'); bed.position.y = 0.065;
  addCollider(context, bed, 'dry-channel-bed', 'box', [0, 0.065, 0], { width: 1.42, height: 0.13, depth: 3.78, isTrigger: false });
  const leftWall = addPivot(context, canal, 'left-wall'); const rightWall = addPivot(context, canal, 'right-wall');
  for (const [side, x, wall] of [['left', -0.86, leftWall], ['right', 0.86, rightWall]]) {
    for (let row = 0; row < 2; row += 1) for (let index = 0; index < 8; index += 1) {
      const block = mesh(context, wall, `${side}-wall-block-${row + 1}-${index + 1}`, new THREE.BoxGeometry(0.24, 0.28, 0.46), context.materials.stone, `${side}-wall`, 'structural-pass');
      block.position.set(x, 0.22 + row * 0.28, -1.65 + index * 0.47 + (row ? 0.05 : 0));
    }
    for (let index = 0; index < 8; index += 1) {
      const cap = mesh(context, wall, `${side}-cap-${index + 1}`, new THREE.BoxGeometry(0.31, 0.15, 0.46), context.materials.stone, `${side}-wall`, 'form-refinement');
      cap.position.set(x, 0.63, -1.65 + index * 0.47);
    }
    addCollider(context, wall, `${side}-wall`, 'box', [x, 0.35, 0], { width: 0.31, height: 0.7, depth: 3.8, isTrigger: false });
  }
  const endSockets = addPivot(context, canal, 'end-socket-frames');
  for (const [end, z] of [['north', 1.9], ['south', -1.9]]) {
    const frame = addPivot(context, endSockets, `${end}-end-frame`, [0, 0, z]);
    for (const [side, x] of [['left', -0.86], ['right', 0.86]]) {
      const post = mesh(context, frame, `${end}-${side}-socket-post`, new THREE.BoxGeometry(0.34, 0.92, 0.22), context.materials.stone, 'end-socket-frames', 'structural-pass'); post.position.set(x, 0.46, 0);
      const recess = mesh(context, frame, `${end}-${side}-socket-recess`, new THREE.BoxGeometry(0.08, 0.45, 0.025), context.materials.inner, 'end-socket-frames', 'surface-pass'); recess.position.set(x, 0.48, end === 'north' ? 0.116 : -0.116);
    }
    const header = mesh(context, frame, `${end}-socket-header`, new THREE.BoxGeometry(2.05, 0.14, 0.22), context.materials.stone, 'end-socket-frames', 'form-refinement'); header.position.y = 0.85;
    addSocket(context, frame, `${end}-module-join`, [0, 0.34, end === 'north' ? 0.12 : -0.12]);
  }
  addCollider(context, endSockets, 'end-socket-frames', 'compound-boxes', [0, 0.45, 0], { isTrigger: false });

  const sluice = addPivot(context, canal, 'sluice-assembly', [0, 0, -1.47]);
  const guideLeft = mesh(context, sluice, 'sluice-guide-left', new THREE.BoxGeometry(0.13, 0.75, 0.13), context.materials.iron, 'sluice-frame', 'structural-pass'); guideLeft.position.set(-0.38, 0.45, 0);
  const guideRight = mesh(context, sluice, 'sluice-guide-right', new THREE.BoxGeometry(0.13, 0.75, 0.13), context.materials.iron, 'sluice-frame', 'structural-pass'); guideRight.position.set(0.38, 0.45, 0);
  const upper = mesh(context, sluice, 'sluice-upper-rail', new THREE.BoxGeometry(0.92, 0.13, 0.14), context.materials.iron, 'sluice-frame', 'structural-pass'); upper.position.set(0, 0.80, 0);
  const gate = addPivot(context, sluice, 'sluice-gate', [0, 0.35, 0]);
  mesh(context, gate, 'sluice-gate-panel', new THREE.BoxGeometry(0.68, 0.54, 0.10), context.materials.iron, 'sluice-gate', 'structural-pass');
  for (const x of [-0.22, 0.22]) { const rib = mesh(context, gate, `sluice-gate-rib-${x < 0 ? 'left' : 'right'}`, new THREE.BoxGeometry(0.07, 0.6, 0.125), context.materials.iron, 'sluice-gate', 'surface-pass'); rib.position.x = x; }
  const spindle = addPivot(context, sluice, 'sluice-spindle', [0, 0.83, 0]);
  mesh(context, spindle, 'sluice-spindle', new THREE.CylinderGeometry(0.035, 0.035, 0.40, 8), context.materials.iron, 'sluice-spindle', 'structural-pass').position.y = 0.20;
  const wheel = addPivot(context, spindle, 'sluice-wheel', [0, 0.48, 0]);
  const wheelRim = mesh(context, wheel, 'sluice-wheel-rim', new THREE.TorusGeometry(0.19, 0.027, 6, 12), context.materials.iron, 'sluice-wheel', 'structural-pass');
  for (let index = 0; index < 6; index += 1) { const spoke = mesh(context, wheel, `sluice-wheel-spoke-${index + 1}`, new THREE.BoxGeometry(0.032, 0.34, 0.032), context.materials.iron, 'sluice-wheel', 'structural-pass'); spoke.rotation.z = index * Math.PI / 3; }
  addSocket(context, sluice, 'gate-control', [0, 0.83, 0]); addSocket(context, gate, 'gate-lift-anchor', [0, 0, 0]);
  addCollider(context, sluice, 'sluice-assembly', 'compound-boxes', [0, 0.5, 0], { isTrigger: false }); addCollider(context, gate, 'sluice-gate', 'box', [0, 0, 0], { width: 0.68, height: 0.54, depth: 0.1, isTrigger: false });
  addChannel(context, wheel, 'rotation', 'z', Math.PI * 1.3, 0.55, 0); addChannel(context, gate, 'position', 'y', 0.19, 0.55, 0);
  const root = finishAsset(context);
  root.userData.artDirection = { lengthMetres: 3.8, forwardAxis: '+Z', note: 'Dry, tileable low-poly irrigation canal approximation from the supplied concept sheet.' };
  root.userData.irrigationCanalRig = { wheel, gate };
  root.userData.applyPassState = (nextPass) => applyPass(root, nextPass);
  applyPass(root, passId);
  return root;
}

export function animateIrrigationCanal(root, elapsedSeconds, intensity = 1) {
  const rig = root.userData.irrigationCanalRig; if (!rig) return root;
  const phase = elapsedSeconds * 0.55 * Math.PI * 2;
  rig.wheel.rotation.z = Math.sin(phase) * Math.PI * 1.3 * intensity;
  rig.gate.position.y = 0.35 + ((Math.sin(phase) + 1) * 0.5) * 0.19 * intensity;
  return root;
}
