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

export const WATER_BARREL_PASSES = Object.freeze(['blockout', 'structure', 'material', 'interaction', 'optimization']);
const PASS_INDEX = new Map(WATER_BARREL_PASSES.map((id, index) => [id, index]));

function atLeast(passId, minimumPass) {
  return (PASS_INDEX.get(passId) ?? PASS_INDEX.get('optimization')) >= (PASS_INDEX.get(minimumPass) ?? 0);
}

function createWaterBarrelMaterials() {
  const make = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({
    name, color, roughness, metalness, flatShading: true, vertexColors: true,
  });
  return {
    wood: make('water-barrel-warm-wood-mat', '#9b5d28', 0.74),
    woodDark: make('water-barrel-end-grain-mat', '#6e3c18', 0.81),
    iron: make('water-barrel-charcoal-hoop-mat', '#3f423f', 0.57, 0.58),
    bung: make('water-barrel-bung-mat', '#303532', 0.62, 0.42),
    blockout: new THREE.MeshStandardMaterial({ name: 'water-barrel-blockout-mat', color: '#b6aaa0', roughness: 0.9, flatShading: true }),
  };
}

function mesh(context, pivot, id, geometry, material, group, minimumPass = 'blockout') {
  const result = new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material);
  return registerMesh(context, pivot, id, result, group, minimumPass);
}

function addBoltRing(context, parent, id, y, radius, count) {
  const pivot = addPivot(context, parent, id, [0, y, 0]);
  const geometry = faceted(new THREE.DodecahedronGeometry(0.027, 0), `${context.id}:${id}`);
  const bolts = new THREE.InstancedMesh(geometry, context.materials.iron, count);
  bolts.name = `${context.id}-${id}-mesh`;
  bolts.castShadow = true;
  bolts.receiveShadow = true;
  bolts.userData.minimumPass = 'structure';
  bolts.userData.destructionGroup = 'iron-hoops';
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + Math.PI / count;
    matrix.makeTranslation(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    bolts.setMatrixAt(index, matrix);
  }
  bolts.instanceMatrix.needsUpdate = true;
  pivot.add(bolts);
  context.nodes[bolts.name] = bolts;
  (context.destructionGroups['iron-hoops'] ??= []).push(bolts.name);
  return pivot;
}

function latheProfile(points, segments = 14) {
  return new THREE.LatheGeometry(points.map(([radius, y]) => new THREE.Vector2(radius, y)), segments, 0, Math.PI * 2);
}

export function createWaterBarrel(options = {}) {
  const passId = WATER_BARREL_PASSES.includes(options.passId) ? options.passId : 'optimization';
  const context = createAssetContext('water-barrel', {
    label: 'Water Barrel', targetHeightMetres: 1.15, passId,
    scaleNote: 'Art-direction scale inferred from the supplied concept sheet, not a measured vessel.',
  });
  context.materials = createWaterBarrelMaterials();
  const { model } = context;
  const visible = (node, minimumPass) => { node.visible = atLeast(passId, minimumPass); return node; };

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'storage-fill', [0, 1.13, 0]);
  const base = addPivot(context, model, 'base-ring', [0, 0.075, 0]);
  mesh(context, base, 'base-ring', new THREE.CylinderGeometry(0.385, 0.36, 0.15, 14, 1, false), context.materials.iron, 'iron-hoops');
  mesh(context, base, 'base-wood-line', new THREE.CylinderGeometry(0.337, 0.337, 0.04, 14, 1, false), context.materials.woodDark, 'wood-shell', 'structure');
  addCollider(context, base, 'base', 'cylinder', [0, 0, 0], { radius: 0.385, height: 0.15, isTrigger: false });

  const shell = addPivot(context, model, 'stave-shell', [0, 0.54, 0]);
  const shellProfile = [[0.335, -0.39], [0.37, -0.30], [0.39, -0.08], [0.39, 0.16], [0.365, 0.36], [0.33, 0.40]];
  mesh(context, shell, 'stave-shell', latheProfile(shellProfile), context.materials.wood, 'wood-shell');
  addCollider(context, shell, 'body', 'cylinder', [0, 0, 0], { radius: 0.39, height: 0.8, isTrigger: false });
  for (let index = 0; index < 14; index += 1) {
    const seam = addPivot(context, shell, `stave-seam-${String(index + 1).padStart(2, '0')}`, [0, 0, 0]);
    const angle = (index / 14) * Math.PI * 2;
    const radius = 0.395;
    const rail = mesh(context, seam, `stave-seam-${String(index + 1).padStart(2, '0')}`, new THREE.BoxGeometry(0.012, 0.72, 0.016), context.materials.woodDark, 'wood-shell', 'structure');
    rail.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    rail.rotation.y = -angle;
    visible(rail, 'structure');
  }

  const hoopHeights = [0.22, 0.54, 0.85];
  hoopHeights.forEach((height, index) => {
    const hoop = addPivot(context, model, `hoop-${index + 1}`, [0, height, 0]);
    visible(mesh(context, hoop, `hoop-${index + 1}`, new THREE.CylinderGeometry(0.407, 0.407, 0.07, 14, 1, true), context.materials.iron, 'iron-hoops', 'structure'), 'structure');
    addBoltRing(context, hoop, `hoop-${index + 1}-bolts`, 0, 0.415, 7);
  });

  const lid = addPivot(context, model, 'lid', [0, 0.985, 0]);
  visible(mesh(context, lid, 'lid', latheProfile([[0.335, -0.035], [0.37, -0.02], [0.365, 0.055], [0.32, 0.09], [0.17, 0.105], [0, 0.11]], 14), context.materials.wood, 'lid', 'structure'), 'structure');
  const lidRim = visible(mesh(context, lid, 'lid-rim', new THREE.TorusGeometry(0.332, 0.018, 4, 14), context.materials.woodDark, 'lid', 'material'), 'material');
  lidRim.rotation.x = Math.PI / 2;
  addSocket(context, lid, 'lid-center', [0, 0.11, 0]);
  addCollider(context, lid, 'lid', 'cylinder', [0, 0.045, 0], { radius: 0.37, height: 0.12, isTrigger: false });

  const bung = addPivot(context, lid, 'bung-control', [0, 0.13, 0]);
  visible(mesh(context, bung, 'bung-control', new THREE.CylinderGeometry(0.072, 0.082, 0.08, 8, 1, false), context.materials.bung, 'bung', 'structure'), 'structure');
  addSocket(context, bung, 'bung-grip', [0, 0.05, 0]);
  addCollider(context, bung, 'bung', 'cylinder', [0, 0.04, 0], { radius: 0.082, height: 0.08, isTrigger: true });
  addChannel(context, bung, 'rotation', 'y', 0.32, 0.72, 0);

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 1.15,
    note: 'Stylized low-poly approximation. The unseen interior, joinery, and sealing method are not modeled.',
    palette: ['warm wood', 'charcoal iron', 'dark bung'],
  };
  root.userData.applyPassState = (nextPassId) => applyWaterBarrelPassState(root, nextPassId);
  applyWaterBarrelPassState(root, passId);
  return root;
}

export function applyWaterBarrelPassState(root, passId = 'optimization') {
  const selectedPass = WATER_BARREL_PASSES.includes(passId) ? passId : 'optimization';
  root.userData.passId = selectedPass;
  const isBlockout = selectedPass === 'blockout';
  const rootNode = root.userData.sculptRuntime.nodes['water-barrel-root'];
  if (!rootNode.userData.blockoutMaterial) rootNode.userData.blockoutMaterial = contextlessBlockoutMaterial();
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = atLeast(selectedPass, node.userData.minimumPass ?? 'blockout');
    if (!node.userData.authoredMaterial) node.userData.authoredMaterial = node.material;
    node.material = isBlockout ? root.userData.sculptRuntime.nodes['water-barrel-root']?.userData.blockoutMaterial ?? node.material : node.userData.authoredMaterial;
  });
  return root;
}

function contextlessBlockoutMaterial() {
  return new THREE.MeshStandardMaterial({ name: 'water-barrel-blockout-mat', color: '#b6aaa0', roughness: 0.9, flatShading: true });
}

export function animateWaterBarrel(root, timeSeconds, intensity = 1) {
  const runtime = root?.userData?.sculptRuntime;
  if (!runtime) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const strength = Math.max(0, intensity);
  for (const channel of runtime.animationChannels) {
    channel.node[channel.property][channel.axis] = channel.baseValue + Math.sin(time * channel.frequency + channel.phase) * channel.amplitude * strength;
  }
  return root;
}
