import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  addChannel,
  addCollider,
  addPivot,
  addSocket,
  createAssetContext,
  finishAsset,
  registerMesh,
} from '../core/assetContext.js';
import { faceted, tubeThrough } from '../core/geometryLibrary.js';

export const WATER_TANK_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(WATER_TANK_PASSES.map((id, index) => [id, index]));

function atLeast(passId, minimumPass) {
  return (PASS_INDEX.get(passId) ?? 7) >= (PASS_INDEX.get(minimumPass) ?? 0);
}

function makeMaterials() {
  const make = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness,
    flatShading: true,
    vertexColors: true,
  });
  return {
    tank: make('water-tank-blue-grey-mat', '#64777a', 0.74, 0.22),
    tankDark: make('water-tank-dark-grey-mat', '#495b5e', 0.78, 0.18),
    timber: make('water-tank-timber-mat', '#7a532f', 0.78),
    iron: make('water-tank-iron-mat', '#555650', 0.64, 0.42),
    brass: make('water-tank-brass-mat', '#8a6842', 0.58, 0.48),
    handle: make('water-tank-valve-handle-mat', '#9a5b2f', 0.72),
  };
}

function mesh(context, parent, id, geometry, material, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group, minimumPass);
}

function xCylinder(radius, length, segments = 12, openEnded = false) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, openEnded);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function zCylinder(radius, length, segments = 8) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function addBolt(context, parent, id, position, rotation, material, minimumPass = 'surface-pass') {
  const bolt = mesh(context, parent, id, new THREE.CylinderGeometry(0.042, 0.042, 0.045, 6), material, 'hardware', minimumPass);
  bolt.position.set(...position);
  bolt.rotation.set(...rotation);
  return bolt;
}

export function createWaterTank(options = {}) {
  const passId = WATER_TANK_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('water-tank', {
    label: 'Water Tank',
    targetHeightMetres: 1.55,
    passId,
  });
  context.materials = makeMaterials();
  const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'fill-input', [0, 1.53, 0]);
  addSocket(context, model, 'water-output', [0, 0.53, 0.77]);

  const frame = addPivot(context, model, 'support-frame', [0, 0, 0]);
  for (const z of [-0.36, 0.36]) {
    const rail = mesh(context, frame, `skid-${z < 0 ? 'rear' : 'front'}`, new RoundedBoxGeometry(1.65, 0.14, 0.15, 1, 0.025), context.materials.timber, 'support-frame');
    rail.position.set(0, 0.17, z);
  }
  for (const [side, x] of [['left', -0.58], ['right', 0.58]]) {
    for (const [depth, z] of [['rear', -0.36], ['front', 0.36]]) {
      const foot = mesh(context, frame, `${side}-${depth}-foot`, new RoundedBoxGeometry(0.3, 0.2, 0.26, 1, 0.035), context.materials.timber, 'support-frame');
      foot.position.set(x, 0.1, z);
    }
    const saddle = mesh(context, frame, `${side}-saddle`, new RoundedBoxGeometry(0.22, 0.3, 0.82, 1, 0.035), context.materials.timber, 'support-frame', 'structural-pass');
    saddle.position.set(x, 0.35, 0);
    addBolt(context, frame, `${side}-front-upper-bolt`, [x, 0.4, 0.425], [Math.PI / 2, 0, 0], context.materials.iron);
    addBolt(context, frame, `${side}-front-lower-bolt`, [x, 0.2, 0.425], [Math.PI / 2, 0, 0], context.materials.iron);
  }
  addCollider(context, frame, 'support-frame', 'box', [0, 0.2, 0], { width: 1.85, height: 0.4, depth: 0.9, isTrigger: false });

  const vessel = addPivot(context, model, 'tank-vessel', [0, 0.9, 0]);
  const shell = mesh(context, vessel, 'tank-shell', xCylinder(0.56, 1.48, 14), context.materials.tank, 'tank-vessel');
  for (const [id, x] of [['left', -0.77], ['right', 0.77]]) {
    const endHub = mesh(context, vessel, `${id}-service-cap`, xCylinder(0.1, 0.07, 8), context.materials.iron, 'tank-vessel', 'structural-pass');
    endHub.position.x = x;
  }
  for (const [index, x] of [-0.5, 0.5].entries()) {
    const strap = mesh(context, vessel, `retaining-strap-${index + 1}`, new THREE.TorusGeometry(0.585, 0.026, 5, 14), context.materials.iron, 'retaining-straps', 'structural-pass');
    strap.rotation.y = Math.PI / 2;
    strap.position.x = x;
  }
  addCollider(context, vessel, 'tank-vessel', 'cylinder', [0, 0, 0], { radius: 0.56, height: 1.48, axis: 'x', isTrigger: false });

  const filler = addPivot(context, vessel, 'filler-neck', [0, 0.53, 0]);
  const neck = mesh(context, filler, 'filler-neck', new THREE.CylinderGeometry(0.13, 0.14, 0.2, 10), context.materials.tankDark, 'filler-neck', 'structural-pass');
  neck.position.y = 0.09;
  const cap = mesh(context, filler, 'filler-cap', new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), context.materials.iron, 'filler-neck', 'form-refinement');
  cap.position.y = 0.24;
  addSocket(context, filler, 'filler-cap-grip', [0, 0.29, 0]);

  const outlet = addPivot(context, model, 'outlet-valve', [0, 0.53, 0.55]);
  const flange = mesh(context, outlet, 'outlet-flange', zCylinder(0.12, 0.08, 8), context.materials.iron, 'outlet-valve', 'structural-pass');
  flange.position.z = 0.015;
  const spout = mesh(context, outlet, 'outlet-spout', tubeThrough([[0, 0, 0.04], [0, 0, 0.15], [0, -0.12, 0.2]], 0.035, 6), context.materials.brass, 'outlet-valve', 'form-refinement');
  const valveHandle = addPivot(context, outlet, 'valve-handle', [0, 0.09, 0.13]);
  const handleStem = mesh(context, valveHandle, 'valve-handle-stem', new THREE.CylinderGeometry(0.02, 0.02, 0.09, 6), context.materials.brass, 'outlet-valve', 'structural-pass');
  handleStem.position.y = -0.02;
  const handleBar = mesh(context, valveHandle, 'valve-handle-bar', xCylinder(0.018, 0.22, 6), context.materials.handle, 'outlet-valve', 'form-refinement');
  handleBar.position.y = 0.035;
  addChannel(context, valveHandle, 'rotation', 'y', Math.PI * 0.42, 0.72, 0);
  addSocket(context, valveHandle, 'valve-control', [0, 0.035, 0]);
  addCollider(context, outlet, 'outlet-valve', 'capsule-chain', [0, -0.05, 0.12], { radius: 0.05, height: 0.3, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 1.55,
    note: 'Practical low-poly game-prop proportions inferred from the supplied four-view concept sheet.',
    palette: ['muted blue-grey tank', 'warm timber', 'dark iron', 'aged brass', 'wood valve handle'],
  };
  root.userData.waterTankRig = { valveHandle };
  root.userData.applyPassState = (nextPassId) => applyWaterTankPassState(root, nextPassId);
  applyWaterTankPassState(root, passId);
  return root;
}

export function applyWaterTankPassState(root, passId = 'optimization-pass') {
  const selectedPass = WATER_TANK_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['water-tank-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'water-tank-blockout-mat',
    color: '#b6aaa0',
    roughness: 0.9,
    flatShading: true,
  });
  root.userData.passId = selectedPass;
  root.traverse((node) => {
    if (!node.isMesh) return;
    const minimumPass = node.userData.minimumPass ?? 'blockout';
    node.visible = selectedIndex >= (PASS_INDEX.get(minimumPass) ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateWaterTank(root, timeSeconds, intensity = 1) {
  const rig = root?.userData?.waterTankRig;
  if (!rig) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  rig.valveHandle.rotation.y = Math.sin(time * 0.72) * Math.PI * 0.42 * Math.max(0, intensity);
  return root;
}
