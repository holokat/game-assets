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
import { beamBetween, faceted, tubeThrough } from '../core/geometryLibrary.js';
import { createHandPumpMaterials } from '../core/materialLibrary.js';

export const HAND_PUMP_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(HAND_PUMP_PASSES.map((id, index) => [id, index]));

function passIndex(passId) {
  return PASS_INDEX.get(passId) ?? PASS_INDEX.get('optimization-pass');
}

function atLeast(passId, minimumPass) {
  return passIndex(passId) >= passIndex(minimumPass);
}

function mesh(context, pivot, id, geometry, material, group, minimumPass) {
  return registerMesh(context, pivot, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group, minimumPass);
}

function addBoltRing(context, parent, id, radius, y, count, minimumPass) {
  const pivot = addPivot(context, parent, id, [0, y, 0]);
  const geometry = faceted(new THREE.CylinderGeometry(0.018, 0.022, 0.022, 6, 1, false), `${context.id}:${id}`);
  const instances = new THREE.InstancedMesh(geometry, context.materials.iron, count);
  instances.name = `${context.id}-${id}-mesh`;
  instances.castShadow = true;
  instances.receiveShadow = true;
  instances.userData.minimumPass = minimumPass;
  instances.userData.destructionGroup = id;
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    matrix.makeTranslation(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    instances.setMatrixAt(index, matrix);
  }
  instances.instanceMatrix.needsUpdate = true;
  pivot.add(instances);
  context.nodes[instances.name] = instances;
  context.destructionGroups[id] = [instances.name];
  return pivot;
}

export function createHandPump(options = {}) {
  const passId = HAND_PUMP_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('hand-pump', {
    label: 'Hand Pump',
    targetHeightMetres: 1.2,
    scaleNote: 'Art-direction approximation from the supplied concept sheet, not a measured product dimension.',
    passId,
  });
  context.materials = createHandPumpMaterials();
  const { model } = context;
  const visible = (node, minimumPass) => { node.visible = atLeast(passId, minimumPass); return node; };

  addSocket(context, model, 'ground', [0, 0, 0]);
  const plinth = addPivot(context, model, 'plinth', [0, 0.08, 0]);
  mesh(context, plinth, 'plinth', new THREE.CylinderGeometry(0.27, 0.21, 0.16, 8, 1, false), context.materials.teal, 'plinth', 'blockout');
  addSocket(context, plinth, 'plinth-top', [0, 0.08, 0]);
  addCollider(context, plinth, 'plinth', 'cylinder', [0, 0, 0], { radius: 0.25, height: 0.16, isTrigger: false });

  const body = addPivot(context, model, 'body-shell', [0, 0.49, 0]);
  mesh(context, body, 'body-shell', new THREE.CylinderGeometry(0.15, 0.16, 0.66, 10, 1, false), context.materials.teal, 'body-shell', 'blockout');
  addSocket(context, body, 'spout-mount', [-0.15, 0.14, 0.02]);
  addSocket(context, body, 'cap-seat', [0, 0.33, 0]);
  addCollider(context, body, 'body', 'cylinder', [0, 0, 0], { radius: 0.16, height: 0.66, isTrigger: false });
  const bodySeam = addPivot(context, model, 'body-seam', [0, 0.47, 0]);
  visible(mesh(context, bodySeam, 'body-seam', new THREE.CylinderGeometry(0.163, 0.163, 0.016, 10, 1, false), context.materials.iron, 'body-shell', 'surface-pass'), 'surface-pass');

  const lowerFlange = addPivot(context, model, 'lower-flange', [0, 0.19, 0]);
  visible(mesh(context, lowerFlange, 'lower-flange', new THREE.CylinderGeometry(0.21, 0.21, 0.085, 10, 1, false), context.materials.tealLight, 'lower-flange', 'structural-pass'), 'structural-pass');
  addBoltRing(context, lowerFlange, 'base-fasteners', 0.17, 0.055, 8, 'structural-pass');

  const topFlange = addPivot(context, model, 'top-flange', [0, 0.85, 0]);
  visible(mesh(context, topFlange, 'top-flange', new THREE.CylinderGeometry(0.21, 0.19, 0.1, 10, 1, false), context.materials.tealLight, 'top-flange', 'structural-pass'), 'structural-pass');
  addBoltRing(context, topFlange, 'cap-fasteners', 0.17, 0.06, 8, 'structural-pass');
  addSocket(context, topFlange, 'rod-guide', [0, 0.07, 0]);
  addSocket(context, topFlange, 'hinge-seat', [0, 0.11, -0.04]);

  const spout = addPivot(context, body, 'spout', [-0.15, 0.14, 0.02]);
  const spoutPath = [[0, 0, 0], [-0.11, 0.025, 0.025], [-0.34, 0.0, 0.04], [-0.43, -0.13, 0.04]];
  mesh(context, spout, 'spout', tubeThrough(spoutPath, 0.085, 6), context.materials.teal, 'spout', 'blockout');
  const mouth = addPivot(context, spout, 'spout-mouth', [-0.43, -0.13, 0.04]);
  visible(mesh(context, mouth, 'spout-mouth', new THREE.CylinderGeometry(0.061, 0.061, 0.01, 6, 1, false), context.materials.iron, 'spout', 'form-refinement'), 'form-refinement');
  addSocket(context, mouth, 'spout-outlet', [0, 0.006, 0]);
  addSocket(context, mouth, 'water-fx', [0, -0.01, 0]);
  addCollider(context, spout, 'spout', 'capsule', [-0.23, -0.03, 0.02], { radius: 0.085, height: 0.55, isTrigger: false });

  const hinge = addPivot(context, topFlange, 'handle-hinge', [0, 0.1, -0.025]);
  mesh(context, topFlange, 'handle-bracket', beamBetween([0, -0.03, 0], [0, 0.1, -0.025], 0.048, 6), context.materials.teal, 'handle-hinge', 'blockout');
  const hingeVisual = visible(mesh(context, hinge, 'handle-hinge', new THREE.CylinderGeometry(0.062, 0.062, 0.14, 8, 1, false), context.materials.tealLight, 'handle-hinge', 'blockout'), 'blockout');
  hingeVisual.rotation.x = Math.PI / 2;
  const hingePin = visible(mesh(context, hinge, 'handle-hinge-pin', new THREE.CylinderGeometry(0.041, 0.041, 0.162, 8, 1, false), context.materials.iron, 'handle-hinge', 'structural-pass'), 'structural-pass');
  hingePin.rotation.x = Math.PI / 2;
  addSocket(context, hinge, 'handle-root', [0, 0, 0]);
  addSocket(context, hinge, 'piston-link', [0, -0.035, 0.04]);
  addCollider(context, hinge, 'handle-hinge', 'cylinder', [0, 0, 0], { radius: 0.052, height: 0.18, isTrigger: false });

  const handle = addPivot(context, hinge, 'handle-arm', [0, 0, 0]);
  const upperLinkPoint = [-0.08, 0.19, -0.02];
  const handleUpper = mesh(context, handle, 'handle-upper', beamBetween([0, 0, 0], upperLinkPoint, 0.048, 5), context.materials.teal, 'handle-arm', 'blockout');
  const handleLower = mesh(context, handle, 'handle-lower', beamBetween(upperLinkPoint, [0.57, -0.37, 0.02], 0.044, 5), context.materials.teal, 'handle-arm', 'blockout');
  const upperLink = addPivot(context, handle, 'upper-link-hinge', upperLinkPoint);
  const upperLinkBoss = visible(mesh(context, upperLink, 'upper-link-hinge', new THREE.CylinderGeometry(0.057, 0.057, 0.14, 8, 1, false), context.materials.tealLight, 'handle-arm', 'blockout'), 'blockout');
  upperLinkBoss.rotation.x = Math.PI / 2;
  const upperLinkPin = visible(mesh(context, upperLink, 'upper-link-pin', new THREE.CylinderGeometry(0.038, 0.038, 0.162, 8, 1, false), context.materials.iron, 'handle-arm', 'structural-pass'), 'structural-pass');
  upperLinkPin.rotation.x = Math.PI / 2;
  addSocket(context, upperLink, 'upper-link', [0, 0, 0]);
  addSocket(context, handle, 'grip-root', [0.57, -0.37, 0.02]);
  addCollider(context, handle, 'handle-arm', 'capsule', [0.31, -0.14, 0], { radius: 0.05, height: 0.69, isTrigger: false });

  const grip = addPivot(context, handle, 'wood-grip', [0, 0, 0]);
  const woodGrip = visible(mesh(context, grip, 'wood-grip', beamBetween([0.57, -0.37, 0.02], [0.78, -0.55, 0.02], 0.073, 6), context.materials.wood, 'wood-grip', 'form-refinement'), 'form-refinement');
  visible(mesh(context, grip, 'wood-grain-line', beamBetween([0.59, -0.385, 0.078], [0.755, -0.525, 0.078], 0.006, 5), context.materials.woodEnd, 'wood-grip', 'surface-pass'), 'surface-pass');
  const gripEnd = addPivot(context, grip, 'wood-grip-end', [0.78, -0.55, 0.02]);
  visible(mesh(context, gripEnd, 'wood-grip-end', new THREE.IcosahedronGeometry(0.066, 1), context.materials.woodEnd, 'wood-grip', 'form-refinement'), 'form-refinement');
  addSocket(context, grip, 'hand-grip', [0.68, -0.46, 0.02]);

  const rod = addPivot(context, topFlange, 'piston-rod', [-0.08, 0.06, 0.015]);
  const rodEnd = [0, 0.23, -0.06];
  visible(mesh(context, rod, 'piston-rod', beamBetween([0, 0, 0], rodEnd, 0.021, 6), context.materials.iron, 'piston-rod', 'structural-pass'), 'structural-pass');
  addSocket(context, rod, 'rod-link', rodEnd);
  addCollider(context, rod, 'piston-rod', 'capsule', [0, 0.115, -0.03], { radius: 0.022, height: 0.24, isTrigger: false });

  context.destructionGroups.handle = [handleUpper.name, handleLower.name, woodGrip.name];
  context.destructionGroups.spout ??= [];
  hinge.rotation.z = -0.04;
  addChannel(context, hinge, 'rotation', 'z', 0.22, 1.3, 0);
  addChannel(context, rod, 'position', 'y', 0.025, 1.3, Math.PI);

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 1.2,
    note: 'Plausible game-prop scale inferred from a stylized concept. This is not a measured real-world dimension.',
    palette: ['painted teal iron', 'dark iron', 'warm wood'],
  };
  root.userData.applyPassState = (nextPassId) => applyHandPumpPassState(root, nextPassId);
  applyHandPumpPassState(root, passId);
  return root;
}

export function applyHandPumpPassState(root, passId = 'optimization-pass') {
  const selectedPass = HAND_PUMP_PASSES.includes(passId) ? passId : 'optimization-pass';
  root.userData.passId = selectedPass;
  const isPreMaterial = passIndex(selectedPass) < passIndex('material-pass');
  root.traverse((node) => {
    if (!node.isMesh) return;
    const minimumPass = node.userData.minimumPass ?? 'blockout';
    node.visible = atLeast(selectedPass, minimumPass);
    if (!node.userData.authoredMaterial) node.userData.authoredMaterial = node.material;
    node.material = isPreMaterial ? root.userData.sculptRuntime.nodes['hand-pump-root']?.userData.blockoutMaterial ?? node.material : node.userData.authoredMaterial;
  });
  const blockoutMaterial = root.userData.sculptRuntime.nodes['hand-pump-root']?.userData.blockoutMaterial;
  if (!blockoutMaterial) {
    const material = new THREE.MeshStandardMaterial({ color: '#b6aaa0', roughness: 0.9, flatShading: true });
    root.userData.sculptRuntime.nodes['hand-pump-root'].userData.blockoutMaterial = material;
    if (isPreMaterial) applyHandPumpPassState(root, selectedPass);
  }
  return root;
}

export function animateHandPump(root, timeSeconds, intensity = 1) {
  const runtime = root?.userData?.sculptRuntime;
  if (!runtime) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const strength = Math.max(0, intensity);
  for (const channel of runtime.animationChannels) {
    channel.node[channel.property][channel.axis] = channel.baseValue
      + Math.sin(time * channel.frequency + channel.phase) * channel.amplitude * strength;
  }
  return root;
}
