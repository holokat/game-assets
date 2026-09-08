import * as THREE from 'three';
import {
  addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const GOAT_SHED_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);
const PASS_INDEX = new Map(GOAT_SHED_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
}
function makeMaterials() {
  return {
    timber: material('goat-shed-weathered-timber-mat', '#765034', 0.9),
    roof: material('goat-shed-galvanized-roof-mat', '#899397', 0.7, 0.4),
    stone: material('goat-shed-warm-stone-pier-mat', '#8d816d', 0.95),
    iron: material('goat-shed-dark-wire-iron-mat', '#34393a', 0.6, 0.5),
    fixture: material('goat-shed-blue-grey-fixture-mat', '#5e7476', 0.82, 0.12),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass);
}
function addBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return beam;
}

export function createGoatShed(options = {}) {
  const passId = GOAT_SHED_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('goat-shed', { label: 'Goat Shed', targetHeightMetres: 2.35, passId });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'animal-entry', [0, 0.12, 2.2]);
  addSocket(context, model, 'shelter', [0, 0.82, 0]);
  addSocket(context, model, 'climbing-ramp', [0, 0.42, 1.48]);
  addSocket(context, model, 'climbing-platform', [1.48, 0.82, 0]);
  addSocket(context, model, 'feeding', [2.0, 0.28, -0.35]);
  addSocket(context, model, 'watering', [2.0, 0.22, 0.55]);
  addSocket(context, model, 'service', [2.75, 0.16, 0]);
  addSocket(context, model, 'roof-attachment', [0, 2.34, 0]);
  addSocket(context, model, 'adjacency-left', [-1.7, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [2.85, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0.7, 0.1, 2.3]);
  addSocket(context, model, 'adjacency-rear', [0.7, 0.1, -1.3]);

  const supports = addPivot(context, model, 'six-stone-piers');
  for (const [row, z] of [['front', 0.66], ['rear', -0.66]]) {
    for (const [column, x] of [['left', -1], ['center', 0], ['right', 1]]) {
      const pier = mesh(context, supports, `${row}-${column}-stone-pier`, new THREE.CylinderGeometry(0.2, 0.27, 0.52, 4), context.materials.stone, 'stone-piers');
      pier.position.set(x, 0.26, z);
      pier.rotation.y = Math.PI / 4;
    }
  }

  const shelter = addPivot(context, model, 'raised-shelter');
  const floor = mesh(context, shelter, 'raised-timber-floor', box(2.5, 0.14, 1.75), context.materials.timber, 'raised-shelter');
  floor.position.y = 0.72;
  const rearWall = mesh(context, shelter, 'rear-windbreak-wall', box(2.34, 1.28, 0.14), context.materials.timber, 'raised-shelter', 'structural-pass');
  rearWall.position.set(0, 1.42, -0.8);
  for (const [id, x] of [['left', -1.17], ['right', 1.17]]) {
    const sideWall = mesh(context, shelter, `${id}-windbreak-wall`, box(0.14, 1.06, 1.45), context.materials.timber, 'raised-shelter', 'structural-pass');
    sideWall.position.set(x, 1.31, -0.08);
    const post = mesh(context, shelter, `${id}-front-post`, box(0.14, 1.42, 0.14), context.materials.timber, 'raised-shelter', 'structural-pass');
    post.position.set(x, 1.42, 0.76);
  }
  const roof = mesh(context, shelter, 'single-slope-roof', box(2.72, 0.12, 2.08), context.materials.roof, 'shed-roof', 'form-refinement');
  roof.position.set(0, 2.13, -0.02);
  roof.rotation.x = -0.11;
  addCollider(context, shelter, 'raised-shelter', 'box', [0, 1.35, -0.05], { width: 2.52, height: 1.86, depth: 1.82, isTrigger: false });

  const ramp = addPivot(context, model, 'cleated-climbing-ramp');
  const rampDeck = mesh(context, ramp, 'ramp-deck', box(1.0, 0.12, 1.65), context.materials.timber, 'climbing-ramp', 'structural-pass');
  rampDeck.position.set(-0.18, 0.42, 1.48);
  rampDeck.rotation.x = -0.44;
  for (let index = 0; index < 6; index += 1) {
    const z = 0.93 + index * 0.22;
    const cleat = mesh(context, ramp, `ramp-cleat-${index + 1}`, box(0.88, 0.075, 0.09), context.materials.timber, 'climbing-ramp', 'surface-pass');
    cleat.position.set(-0.18, 0.72 - (z - 0.78) * 0.45, z);
    cleat.rotation.x = -0.44;
  }
  addCollider(context, ramp, 'climbing-ramp', 'box', [-0.18, 0.42, 1.48], { width: 1.04, height: 0.22, depth: 1.68, rotationX: -0.44, isTrigger: false });

  const platform = addPivot(context, model, 'side-climbing-platform');
  const platformDeck = mesh(context, platform, 'platform-deck', box(0.65, 0.14, 0.95), context.materials.timber, 'climbing-platform', 'structural-pass');
  platformDeck.position.set(1.5, 0.76, 0.05);
  addBeam(context, platform, 'platform-front-brace', [1.24, 0.08, 0.4], [1.5, 0.72, 0.3], 0.1, 0.1, context.materials.timber, 'climbing-platform');
  addBeam(context, platform, 'platform-rear-brace', [1.24, 0.08, -0.4], [1.5, 0.72, -0.3], 0.1, 0.1, context.materials.timber, 'climbing-platform');

  const fence = addPivot(context, model, 'fenced-service-area');
  for (const [id, x, z] of [
    ['front-left', 1.25, 1.35], ['front-right', 2.7, 1.35],
    ['rear-left', 1.25, -1.05], ['rear-right', 2.7, -1.05],
  ]) {
    const post = mesh(context, fence, `${id}-pen-post`, box(0.13, 1.16, 0.13), context.materials.timber, 'service-fence', 'structural-pass');
    post.position.set(x, 0.58, z);
    const connector = mesh(context, fence, `${id}-module-connector`, box(0.2, 0.16, 0.2), context.materials.iron, 'fence-hardware', 'interaction-pass');
    connector.position.set(x, 0.08, z);
  }
  for (const [id, x1, x2, z] of [['rear', 1.25, 2.7, -1.05], ['front-right', 2.15, 2.7, 1.35]]) {
    for (const y of [0.36, 0.9]) {
      const rail = mesh(context, fence, `${id}-rail-${y}`, box(x2 - x1, 0.09, 0.09), context.materials.timber, 'service-fence', 'structural-pass');
      rail.position.set((x1 + x2) / 2, y, z);
    }
    for (let index = 1; index <= 4; index += 1) {
      const wire = mesh(context, fence, `${id}-wire-${index}`, box(0.025, 0.64, 0.025), context.materials.iron, 'wire-infill', 'surface-pass');
      wire.position.set(THREE.MathUtils.lerp(x1, x2, index / 5), 0.63, z);
    }
  }
  for (const [id, x] of [['left', 1.25], ['right', 2.7]]) {
    for (const y of [0.36, 0.9]) {
      const rail = mesh(context, fence, `${id}-side-rail-${y}`, box(0.09, 0.09, 2.4), context.materials.timber, 'service-fence', 'structural-pass');
      rail.position.set(x, y, 0.15);
    }
    for (let index = 1; index <= 5; index += 1) {
      const wire = mesh(context, fence, `${id}-side-wire-${index}`, box(0.025, 0.64, 0.025), context.materials.iron, 'wire-infill', 'surface-pass');
      wire.position.set(x, 0.63, THREE.MathUtils.lerp(-1.05, 1.35, index / 6));
    }
  }
  addCollider(context, fence, 'service-fence', 'box', [1.98, 0.58, 0.15], { width: 1.58, height: 1.18, depth: 2.54, hollow: true, isTrigger: false });

  const gate = addPivot(context, model, 'service-access-gate', [1.29, 0.08, 1.36]);
  for (const [id, width, height, x, y] of [
    ['left', 0.1, 1.0, 0.05, 0.5], ['right', 0.1, 1.0, 0.8, 0.5],
    ['top', 0.85, 0.1, 0.425, 0.95], ['bottom', 0.85, 0.1, 0.425, 0.05],
  ]) {
    const frame = mesh(context, gate, `gate-${id}-frame`, box(width, height, 0.1), context.materials.timber, 'service-gate', 'structural-pass');
    frame.position.set(x, y, 0);
  }
  addBeam(context, gate, 'gate-diagonal-brace', [0.08, 0.12, 0], [0.77, 0.88, 0], 0.08, 0.08, context.materials.timber, 'service-gate');
  const latch = mesh(context, gate, 'gate-latch', box(0.2, 0.09, 0.12), context.materials.iron, 'service-gate', 'interaction-pass');
  latch.position.set(0.77, 0.58, 0.1);
  addChannel(context, gate, 'rotation', 'y', 1.08, 0.68, 0);
  addSocket(context, gate, 'gate-control', [0.77, 0.58, 0.16]);
  addCollider(context, gate, 'service-gate', 'box', [0.425, 0.5, 0], { width: 0.88, height: 1.04, depth: 0.16, isTrigger: false });

  const fixtures = addPivot(context, model, 'feed-water-fixtures');
  const trough = mesh(context, fixtures, 'feed-trough', box(1.02, 0.3, 0.42), context.materials.timber, 'feed-fixture', 'form-refinement');
  trough.position.set(2.0, 0.28, -0.35);
  const basin = mesh(context, fixtures, 'water-basin', new THREE.CylinderGeometry(0.38, 0.46, 0.18, 8), context.materials.fixture, 'water-fixture', 'form-refinement');
  basin.position.set(2.0, 0.2, 0.55);
  addCollider(context, fixtures, 'feed-water-fixtures', 'box', [2, 0.28, 0.08], { width: 1.2, height: 0.56, depth: 1.5, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.35,
    note: 'Lean stylized low-poly Goat Shed reconstructed from the generated four-view concept sheet.',
    stonePierCount: 6,
    palette: ['weathered timber', 'galvanized roof', 'warm stone', 'dark wire iron', 'blue-grey fixture'],
    motion: 'Only the fenced service-area access gate rotates.',
  };
  root.userData.goatShedRig = { supports, shelter, ramp, platform, fence, gate, fixtures };
  root.userData.applyPassState = (nextPassId) => applyGoatShedPassState(root, nextPassId);
  applyGoatShedPassState(root, passId);
  return root;
}

export function applyGoatShedPassState(root, passId = 'optimization-pass') {
  const selectedPass = GOAT_SHED_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['goat-shed-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'goat-shed-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true,
  });
  root.userData.passId = selectedPass;
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateGoatShed(root, timeSeconds, intensity = 1) {
  const gate = root?.userData?.goatShedRig?.gate;
  if (!gate) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  gate.rotation.y = Math.sin(time * 0.68) * 1.08 * Math.max(0, intensity);
  return root;
}
