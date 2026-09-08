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
import { faceted } from '../core/geometryLibrary.js';

export const CISTERN_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);

const PASS_INDEX = new Map(CISTERN_PASSES.map((id, index) => [id, index]));

function makeMaterials() {
  const make = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({
    name, color, roughness, metalness, flatShading: true, vertexColors: true,
  });
  return {
    concrete: make('cistern-warm-concrete-mat', '#a79d8a', 0.9),
    concreteDark: make('cistern-cutaway-concrete-mat', '#514d45', 0.92),
    tank: make('cistern-tank-grey-mat', '#77756a', 0.86, 0.04),
    iron: make('cistern-charcoal-hatch-mat', '#393936', 0.65, 0.34),
  };
}

function mesh(context, parent, id, geometry, material, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group, minimumPass);
}

function box(width, height, depth, radius = 0.025) {
  return new RoundedBoxGeometry(width, height, depth, 1, radius);
}

function xCylinder(radius, length, segments = 10) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

export function createCistern(options = {}) {
  const passId = CISTERN_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('cistern', { label: 'Cistern', targetHeightMetres: 2.18, passId });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'front-module', [0, 0.56, 1.25]);
  addSocket(context, model, 'rear-module', [0, 0.56, -1.25]);
  addSocket(context, model, 'access', [0, 2.18, 0]);

  const shell = addPivot(context, model, 'concrete-shell', [0, 0, 0]);
  const base = mesh(context, shell, 'base-plinth', box(3.92, 0.18, 2.62, 0.035), context.materials.concrete, 'concrete-shell');
  base.position.y = 0.09;
  const baseInset = mesh(context, shell, 'base-inset', box(3.58, 0.13, 2.35, 0.02), context.materials.concreteDark, 'concrete-shell', 'structural-pass');
  baseInset.position.y = 0.205;
  const rear = mesh(context, shell, 'rear-wall', box(3.64, 1.73, 0.27, 0.025), context.materials.concrete, 'concrete-shell');
  rear.position.set(0, 1.015, -1.095);
  const leftWall = mesh(context, shell, 'left-wall', box(0.3, 1.73, 2.2, 0.025), context.materials.concrete, 'concrete-shell');
  leftWall.position.set(-1.67, 1.015, 0);
  const rightWall = mesh(context, shell, 'right-wall', box(0.3, 1.73, 2.2, 0.025), context.materials.concrete, 'concrete-shell');
  rightWall.position.set(1.67, 1.015, 0);
  const top = mesh(context, shell, 'top-slab', box(3.98, 0.32, 2.6, 0.035), context.materials.concrete, 'concrete-shell');
  top.position.y = 1.96;
  const frontLintel = mesh(context, shell, 'front-lintel', box(3.42, 0.35, 0.34, 0.035), context.materials.concrete, 'concrete-shell', 'structural-pass');
  frontLintel.position.set(0, 1.69, 1.065);
  for (const [side, x] of [['left', -1.55], ['right', 1.55]]) {
    const pier = mesh(context, shell, `${side}-reveal-pier`, box(0.28, 1.29, 0.34, 0.025), context.materials.concrete, 'concrete-shell', 'structural-pass');
    pier.position.set(x, 0.85, 1.065);
    const innerEdge = mesh(context, shell, `${side}-reveal-edge`, box(0.13, 1.16, 0.12, 0.015), context.materials.concreteDark, 'concrete-shell', 'form-refinement');
    innerEdge.position.set(x * 0.92, 0.84, 1.13);
  }
  const sill = mesh(context, shell, 'reveal-sill', box(3.18, 0.19, 0.34, 0.025), context.materials.concrete, 'concrete-shell', 'structural-pass');
  sill.position.set(0, 0.39, 1.065);
  addCollider(context, shell, 'cistern-volume', 'box', [0, 1.05, 0], { width: 3.95, height: 2.1, depth: 2.62, isTrigger: false });

  const tank = addPivot(context, model, 'buried-tank', [0, 0.98, -0.08]);
  const vessel = mesh(context, tank, 'tank-vessel', xCylinder(0.62, 2.9, 12), context.materials.tank, 'buried-tank');
  for (const [side, x] of [['left', -1.47], ['right', 1.47]]) {
    const cap = mesh(context, tank, `${side}-tank-cap`, xCylinder(0.5, 0.11, 10), context.materials.tank, 'buried-tank', 'form-refinement');
    cap.position.x = x;
  }
  for (const [index, x] of [-0.88, 0, 0.88].entries()) {
    const band = mesh(context, tank, `retaining-band-${index + 1}`, box(0.18, 1.32, 1.08, 0.028), context.materials.concrete, 'retaining-bands', 'structural-pass');
    band.position.x = x;
  }
  for (const [index, x] of [-1.14, -0.38, 0.38, 1.14].entries()) {
    const seam = mesh(context, tank, `tank-seam-${index + 1}`, box(0.028, 1.07, 1.05, 0.004), context.materials.concreteDark, 'buried-tank', 'surface-pass');
    seam.position.x = x;
  }
  addCollider(context, tank, 'tank-vessel', 'cylinder', [0, 0, 0], { radius: 0.62, height: 2.9, axis: 'x', isTrigger: false });

  const hatch = addPivot(context, model, 'hatch-control', [0, 2.145, 0]);
  const curb = mesh(context, hatch, 'hatch-curb', box(0.73, 0.11, 0.73, 0.018), context.materials.concreteDark, 'hatch-control', 'form-refinement');
  curb.position.y = 0.035;
  const cap = mesh(context, hatch, 'hatch-cap', new THREE.CylinderGeometry(0.3, 0.34, 0.12, 8), context.materials.iron, 'hatch-control', 'form-refinement');
  cap.position.y = 0.135;
  const grip = mesh(context, hatch, 'hatch-grip', box(0.28, 0.045, 0.075, 0.012), context.materials.iron, 'hatch-control', 'surface-pass');
  grip.position.y = 0.215;
  for (const [index, x] of [-0.22, 0.22].entries()) {
    const hinge = mesh(context, hatch, `hatch-hinge-${index + 1}`, box(0.12, 0.09, 0.09, 0.015), context.materials.iron, 'hardware', 'surface-pass');
    hinge.position.set(x, 0.08, -0.29);
  }
  addChannel(context, hatch, 'rotation', 'y', Math.PI * 0.33, 0.7, 0);
  addSocket(context, hatch, 'hatch-grip', [0, 0.23, 0.2]);
  addCollider(context, hatch, 'hatch-control', 'box', [0, 0.13, 0], { width: 0.76, height: 0.24, depth: 0.76, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.18,
    note: 'Practical low-poly cutaway cistern inferred from the supplied concept sheet.',
    palette: ['warm concrete', 'dark cutaway concrete', 'muted tank grey', 'charcoal hatch'],
  };
  root.userData.cisternRig = { hatch };
  root.userData.applyPassState = (nextPassId) => applyCisternPassState(root, nextPassId);
  applyCisternPassState(root, passId);
  return root;
}

export function applyCisternPassState(root, passId = 'optimization-pass') {
  const selectedPass = CISTERN_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['cistern-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'cistern-blockout-mat', color: '#aaa090', roughness: 0.92, flatShading: true,
  });
  root.userData.passId = selectedPass;
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass) ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateCistern(root, timeSeconds, intensity = 1) {
  const hatch = root?.userData?.cisternRig?.hatch;
  if (!hatch) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  hatch.rotation.y = Math.sin(time * 0.7) * Math.PI * 0.33 * Math.max(0, intensity);
  return root;
}
