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

export const RAIN_BARREL_PASSES = Object.freeze(['blockout', 'structure', 'material', 'interaction', 'optimization']);
const PASS_INDEX = new Map(RAIN_BARREL_PASSES.map((id, index) => [id, index]));

const atLeast = (passId, minimumPass) => (PASS_INDEX.get(passId) ?? 4) >= (PASS_INDEX.get(minimumPass) ?? 0);
const lathe = (points, segments = 14) => new THREE.LatheGeometry(points.map(([radius, y]) => new THREE.Vector2(radius, y)), segments, 0, Math.PI * 2);

function materials() {
  const make = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
  return {
    wood: make('rain-barrel-aged-wood-mat', '#94612f', 0.82),
    woodDark: make('rain-barrel-end-grain-mat', '#60391d', 0.86),
    iron: make('rain-barrel-dark-iron-mat', '#3a423e', 0.56, 0.62),
    teal: make('rain-barrel-muted-teal-fitting-mat', '#3e7472', 0.47, 0.42),
    blockout: new THREE.MeshStandardMaterial({ name: 'rain-barrel-blockout-mat', color: '#b4aaa0', roughness: 0.9, flatShading: true }),
  };
}

function mesh(context, parent, id, geometry, material, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group, minimumPass);
}

function beam(context, parent, id, size, position, material, group, minimumPass = 'structure') {
  const item = mesh(context, parent, id, new THREE.BoxGeometry(...size), material, group, minimumPass);
  item.position.set(...position);
  return item;
}

function boltRing(context, parent, id, y, radius, count) {
  const pivot = addPivot(context, parent, id, [0, y, 0]);
  const bolts = new THREE.InstancedMesh(faceted(new THREE.DodecahedronGeometry(0.022, 0), `${context.id}:${id}`), context.materials.iron, count);
  bolts.name = `${context.id}-${id}-mesh`;
  bolts.castShadow = true; bolts.receiveShadow = true;
  bolts.userData.minimumPass = 'structure'; bolts.userData.destructionGroup = 'iron-hoops';
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + Math.PI / count;
    matrix.makeTranslation(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    bolts.setMatrixAt(index, matrix);
  }
  bolts.instanceMatrix.needsUpdate = true;
  pivot.add(bolts); context.nodes[bolts.name] = bolts;
  (context.destructionGroups['iron-hoops'] ??= []).push(bolts.name);
}

export function createRainBarrel(options = {}) {
  const passId = RAIN_BARREL_PASSES.includes(options.passId) ? options.passId : 'optimization';
  const context = createAssetContext('rain-barrel', {
    label: 'Rain Barrel', targetHeightMetres: 1.52, passId,
    scaleNote: 'Stylized low-poly farm collector with a practical slim barrel and low wood stand.',
  });
  context.materials = materials();
  const { model } = context;
  const visible = (node, minimumPass) => { node.visible = atLeast(passId, minimumPass); return node; };

  addSocket(context, model, 'ground', [0, 0, 0]);
  const stand = addPivot(context, model, 'wooden-stand', [0, 0, 0]);
  beam(context, stand, 'stand-front-left-leg', [0.12, 0.25, 0.12], [-0.29, 0.125, 0.23], context.materials.woodDark, 'wooden-stand');
  beam(context, stand, 'stand-front-right-leg', [0.12, 0.25, 0.12], [0.29, 0.125, 0.23], context.materials.woodDark, 'wooden-stand');
  beam(context, stand, 'stand-rear-left-leg', [0.12, 0.25, 0.12], [-0.29, 0.125, -0.23], context.materials.woodDark, 'wooden-stand');
  beam(context, stand, 'stand-rear-right-leg', [0.12, 0.25, 0.12], [0.29, 0.125, -0.23], context.materials.woodDark, 'wooden-stand');
  beam(context, stand, 'stand-front-rail', [0.76, 0.12, 0.11], [0, 0.19, 0.13], context.materials.wood, 'wooden-stand');
  beam(context, stand, 'stand-rear-rail', [0.76, 0.12, 0.11], [0, 0.19, -0.13], context.materials.wood, 'wooden-stand');
  const braceA = beam(context, stand, 'stand-cross-brace-a', [0.08, 0.08, 0.72], [0, 0.12, 0.23], context.materials.woodDark, 'wooden-stand', 'material'); braceA.rotation.y = Math.PI / 4;
  const braceB = beam(context, stand, 'stand-cross-brace-b', [0.08, 0.08, 0.72], [0, 0.12, -0.23], context.materials.woodDark, 'wooden-stand', 'material'); braceB.rotation.y = -Math.PI / 4;
  addSocket(context, stand, 'barrel-seat', [0, 0.26, 0]);
  addCollider(context, stand, 'stand', 'box', [0, 0.125, 0], { width: 0.76, height: 0.25, depth: 0.58, isTrigger: false });

  const barrelBaseY = 0.26;
  const base = addPivot(context, model, 'base-ring', [0, barrelBaseY + 0.055, 0]);
  mesh(context, base, 'base-ring', new THREE.CylinderGeometry(0.335, 0.35, 0.11, 14), context.materials.iron, 'iron-hoops');
  const body = addPivot(context, model, 'stave-shell', [0, barrelBaseY + 0.59, 0]);
  mesh(context, body, 'stave-shell', lathe([[0.325, -0.54], [0.355, -0.48], [0.385, -0.22], [0.39, 0.12], [0.365, 0.46], [0.335, 0.53]]), context.materials.wood, 'wood-shell');
  addCollider(context, body, 'barrel', 'cylinder', [0, 0, 0], { radius: 0.39, height: 1.08, isTrigger: false });
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    const seam = mesh(context, body, `stave-seam-${String(index + 1).padStart(2, '0')}`, new THREE.BoxGeometry(0.011, 0.94, 0.012), context.materials.woodDark, 'wood-shell', 'structure');
    seam.position.set(Math.sin(angle) * 0.389, -0.005, Math.cos(angle) * 0.389); seam.rotation.y = -angle;
    visible(seam, 'structure');
  }
  [0.35, 0.66, 0.98].forEach((y, index) => {
    const hoop = addPivot(context, model, `hoop-${index + 1}`, [0, y, 0]);
    visible(mesh(context, hoop, `hoop-${index + 1}`, new THREE.CylinderGeometry(0.407, 0.407, 0.06, 14, 1, true), context.materials.iron, 'iron-hoops', 'structure'), 'structure');
    boltRing(context, hoop, `hoop-${index + 1}-bolts`, 0, 0.414, 7);
  });

  const lid = addPivot(context, model, 'fitted-lid', [0, 1.35, 0]);
  visible(mesh(context, lid, 'lid', lathe([[0.34, -0.045], [0.37, -0.02], [0.355, 0.055], [0.27, 0.09], [0, 0.095]]), context.materials.wood, 'lid', 'structure'), 'structure');
  const lidRim = visible(mesh(context, lid, 'lid-rim', new THREE.TorusGeometry(0.34, 0.017, 4, 14), context.materials.woodDark, 'lid', 'material'), 'material'); lidRim.rotation.x = Math.PI / 2;
  addCollider(context, lid, 'lid', 'cylinder', [0, 0.04, 0], { radius: 0.37, height: 0.1, isTrigger: false });
  const inlet = addPivot(context, lid, 'screened-inlet', [0, 0.095, 0]);
  visible(mesh(context, inlet, 'inlet-collar', new THREE.CylinderGeometry(0.115, 0.13, 0.055, 12), context.materials.teal, 'fittings', 'structure'), 'structure');
  visible(mesh(context, inlet, 'inlet-screen', new THREE.CylinderGeometry(0.105, 0.105, 0.025, 12, 1, false), context.materials.iron, 'fittings', 'material'), 'material');
  addSocket(context, inlet, 'fill-inlet', [0, 0.05, 0]);

  const overflow = addPivot(context, body, 'overflow-fitting', [0.37, 0.36, -0.05]);
  visible(mesh(context, overflow, 'overflow-collar', new THREE.CylinderGeometry(0.072, 0.072, 0.065, 8), context.materials.teal, 'fittings', 'structure'), 'structure');
  const overflowPipe = visible(mesh(context, overflow, 'overflow-pipe', new THREE.CylinderGeometry(0.05, 0.05, 0.18, 8), context.materials.teal, 'fittings', 'structure'), 'structure');
  overflowPipe.rotation.z = Math.PI / 2; overflowPipe.position.x = 0.115;
  addSocket(context, overflow, 'overflow-outlet', [0.21, 0, 0]);
  addCollider(context, overflow, 'overflow', 'cylinder', [0.11, 0, 0], { radius: 0.072, height: 0.22, isTrigger: false });

  const spigot = addPivot(context, body, 'spigot-body', [0, -0.25, 0.37]);
  const spigotPipe = visible(mesh(context, spigot, 'spigot-pipe', new THREE.CylinderGeometry(0.065, 0.065, 0.22, 8), context.materials.teal, 'fittings', 'structure'), 'structure');
  spigotPipe.rotation.x = Math.PI / 2; spigotPipe.position.z = 0.11;
  visible(mesh(context, spigot, 'spigot-collar', new THREE.CylinderGeometry(0.092, 0.092, 0.055, 8), context.materials.iron, 'fittings', 'structure'), 'structure').rotation.x = Math.PI / 2;
  const tap = addPivot(context, spigot, 'tap-handle', [0, 0.02, 0.205]);
  const handleStem = visible(mesh(context, tap, 'tap-stem', new THREE.CylinderGeometry(0.027, 0.027, 0.09, 6), context.materials.iron, 'fittings', 'interaction'), 'interaction');
  handleStem.rotation.x = Math.PI / 2;
  visible(beam(context, tap, 'tap-grip', [0.22, 0.046, 0.042], [0, 0, 0.045], context.materials.iron, 'fittings', 'interaction'), 'interaction');
  addSocket(context, spigot, 'spigot-outlet', [0, -0.04, 0.25]);
  addCollider(context, spigot, 'spigot', 'cylinder', [0, 0, 0.12], { radius: 0.09, height: 0.24, isTrigger: false });
  addChannel(context, tap, 'rotation', 'z', 0.48, 1.3, 0);

  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 1.52, note: 'Stylized low-poly rain collector. The hidden interior, water level, and gutter connection are intentionally not modeled.', palette: ['aged wood', 'dark iron', 'muted teal'] };
  root.userData.applyPassState = (nextPassId) => applyRainBarrelPassState(root, nextPassId);
  applyRainBarrelPassState(root, passId);
  return root;
}

export function applyRainBarrelPassState(root, passId = 'optimization') {
  const selectedPass = RAIN_BARREL_PASSES.includes(passId) ? passId : 'optimization';
  root.userData.passId = selectedPass;
  if (!root.userData.blockoutMaterial) root.userData.blockoutMaterial = new THREE.MeshStandardMaterial({ name: 'rain-barrel-blockout-mat', color: '#b4aaa0', roughness: 0.9, flatShading: true });
  root.traverse((node) => {
    if (!node.isMesh && !node.isInstancedMesh) return;
    node.visible = atLeast(selectedPass, node.userData.minimumPass ?? 'blockout');
    if (!node.userData.authoredMaterial) node.userData.authoredMaterial = node.material;
    node.material = selectedPass === 'blockout' ? root.userData.blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateRainBarrel(root, timeSeconds, intensity = 1) {
  const runtime = root?.userData?.sculptRuntime;
  if (!runtime) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  for (const channel of runtime.animationChannels) channel.node[channel.property][channel.axis] = channel.baseValue + Math.sin(time * channel.frequency + channel.phase) * channel.amplitude * Math.max(0, intensity);
  return root;
}
