import * as THREE from 'three';
import {
  addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const AUTOMATED_MILKING_PARLOR_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);
const PASS_INDEX = new Map(AUTOMATED_MILKING_PARLOR_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
}
function makeMaterials() {
  return {
    concrete: material('automated-milking-parlor-pale-concrete-mat', '#aaa59a', 0.94),
    galvanized: material('automated-milking-parlor-galvanized-mat', '#879194', 0.68, 0.42),
    iron: material('automated-milking-parlor-dark-iron-mat', '#34393a', 0.58, 0.52),
    equipment: material('automated-milking-parlor-muted-teal-equipment-mat', '#4f7272', 0.76, 0.24),
    sanitary: material('automated-milking-parlor-cream-sanitary-line-mat', '#d0c49d', 0.68, 0.14),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function zCylinder(radius, length, segments = 8) { const geometry = new THREE.CylinderGeometry(radius, radius, length, segments); geometry.rotateX(Math.PI / 2); return geometry; }
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass);
}
function addBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end);
  const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5)); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return beam;
}

export function createAutomatedMilkingParlor(options = {}) {
  const passId = AUTOMATED_MILKING_PARLOR_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('automated-milking-parlor', { label: 'Automated Milking Parlor', targetHeightMetres: 2.72, passId });
  context.materials = makeMaterials(); const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'animal-entry', [-1.3, 0.14, 2.65]); addSocket(context, model, 'animal-exit', [1.3, 0.14, 2.65]);
  addSocket(context, model, 'milk-output', [2.25, 0.7, -1.85]); addSocket(context, model, 'power-input', [2.25, 1.1, -2.1]);
  addSocket(context, model, 'water-input', [-1.9, 1.25, -2.0]); addSocket(context, model, 'wash-service', [-1.75, 1.0, -1.95]);
  addSocket(context, model, 'drain', [0, 0.12, 0]); addSocket(context, model, 'operator-service', [0, 0.16, 1.7]);
  addSocket(context, model, 'pump-control', [1.75, 1.25, -1.9]); addSocket(context, model, 'roof-attachment', [0, 2.7, -1.55]);
  addSocket(context, model, 'adjacency-left', [-2.45, 0.1, 0]); addSocket(context, model, 'adjacency-right', [2.45, 0.1, 0]);

  const slab = addPivot(context, model, 'concrete-platform');
  const base = mesh(context, slab, 'parlor-slab', box(4.6, 0.14, 5.0), context.materials.concrete, 'concrete-platform'); base.position.y = 0.07;
  for (const [id, x] of [['left', -1.22], ['right', 1.22]]) {
    const platform = mesh(context, slab, `${id}-stall-platform`, box(1.45, 0.24, 4.35), context.materials.concrete, 'concrete-platform', 'structural-pass');
    platform.position.set(x, 0.24, 0);
  }
  const lane = mesh(context, slab, 'central-operator-lane', box(0.92, 0.08, 4.12), context.materials.iron, 'operator-lane', 'form-refinement'); lane.position.set(0, 0.16, 0);
  for (let index = 0; index < 9; index += 1) {
    const bar = mesh(context, slab, `drain-grate-bar-${index + 1}`, box(0.58, 0.055, 0.055), context.materials.galvanized, 'floor-drain', 'surface-pass');
    bar.position.set(0, 0.22, -0.28 + index * 0.07);
  }
  addCollider(context, slab, 'concrete-platform', 'box', [0, 0.13, 0], { width: 4.6, height: 0.28, depth: 5, isTrigger: false });

  const stalls = addPivot(context, model, 'herringbone-stall-rails');
  const stallZ = [-1.5, -0.5, 0.5, 1.5];
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    for (const y of [0.54, 1.02]) {
      const innerRail = mesh(context, stalls, `${side}-inner-long-rail-${y}`, box(0.08, 0.08, 4.1), context.materials.galvanized, 'stall-rails', 'structural-pass');
      innerRail.position.set(sign * 0.62, y, 0);
    }
    for (const [index, z] of stallZ.entries()) {
      const post = mesh(context, stalls, `${side}-stall-${index + 1}-post`, box(0.1, 1.25, 0.1), context.materials.galvanized, 'stall-posts', 'structural-pass');
      post.position.set(sign * 1.78, 0.78, z + 0.24);
      addBeam(context, stalls, `${side}-stall-${index + 1}-lower-herringbone`, [sign * 0.66, 0.46, z - 0.28], [sign * 1.78, 0.62, z + 0.24], 0.075, 0.075, context.materials.galvanized, 'stall-rails');
      addBeam(context, stalls, `${side}-stall-${index + 1}-upper-herringbone`, [sign * 0.66, 0.93, z - 0.28], [sign * 1.78, 1.09, z + 0.24], 0.075, 0.075, context.materials.galvanized, 'stall-rails');
    }
  }
  addCollider(context, stalls, 'left-stall-row', 'box', [-1.2, 0.75, 0], { width: 1.4, height: 1.5, depth: 4.2, isTrigger: false });
  addCollider(context, stalls, 'right-stall-row', 'box', [1.2, 0.75, 0], { width: 1.4, height: 1.5, depth: 4.2, isTrigger: false });

  const milkLine = addPivot(context, model, 'overhead-milk-line');
  for (const [side, x] of [['left', -0.82], ['right', 0.82]]) {
    const main = mesh(context, milkLine, `${side}-milk-main`, zCylinder(0.065, 4.25, 8), context.materials.sanitary, 'overhead-milk-line', 'structural-pass'); main.position.set(x, 2.08, 0);
    for (const [index, z] of stallZ.entries()) {
      const drop = mesh(context, milkLine, `${side}-drop-line-${index + 1}`, new THREE.CylinderGeometry(0.028, 0.028, 0.72, 6), context.materials.sanitary, 'milk-drop-lines', 'form-refinement');
      drop.position.set(x, 1.68, z);
      const cluster = mesh(context, milkLine, `${side}-milking-cluster-${index + 1}`, box(0.12, 0.18, 0.08), context.materials.iron, 'milk-drop-lines', 'surface-pass'); cluster.position.set(x, 1.28, z);
    }
  }
  for (const x of [-0.82, 0.82]) {
    for (const z of [-2.03, 2.03]) {
      const support = mesh(context, milkLine, `milk-line-support-${x}-${z}`, box(0.08, 1.72, 0.08), context.materials.galvanized, 'milk-line-supports', 'structural-pass'); support.position.set(x, 1.22, z);
    }
  }

  const equipment = addPivot(context, model, 'pump-control-equipment');
  const cabinet = mesh(context, equipment, 'control-cabinet', box(0.72, 1.45, 0.5), context.materials.equipment, 'pump-equipment', 'form-refinement'); cabinet.position.set(1.72, 0.94, -2.0);
  for (const [index, colorX] of [1.56, 1.84].entries()) {
    const light = mesh(context, equipment, `cabinet-indicator-${index + 1}`, new THREE.SphereGeometry(0.055, 6, 4), index === 0 ? context.materials.sanitary : context.materials.iron, 'pump-equipment', 'surface-pass');
    light.position.set(colorX, 1.35, -1.73);
  }
  const vessel = mesh(context, equipment, 'pressure-vessel', new THREE.CylinderGeometry(0.25, 0.27, 0.92, 8), context.materials.equipment, 'pump-equipment', 'form-refinement'); vessel.position.set(2.05, 0.58, -1.55);
  const outputPipe = mesh(context, equipment, 'milk-output-pipe', zCylinder(0.06, 0.7, 8), context.materials.sanitary, 'pump-equipment', 'structural-pass'); outputPipe.position.set(2.05, 0.46, -1.95);
  addCollider(context, equipment, 'pump-control-equipment', 'box', [1.82, 0.85, -1.82], { width: 1.05, height: 1.7, depth: 0.95, isTrigger: false });

  const wash = addPivot(context, model, 'wash-service-manifold');
  const manifold = mesh(context, wash, 'wash-manifold', box(0.48, 0.24, 0.12), context.materials.iron, 'wash-service', 'form-refinement'); manifold.position.set(-1.72, 1.25, -2.12);
  const hose = mesh(context, wash, 'wash-hose-coil', new THREE.TorusGeometry(0.27, 0.035, 5, 10), context.materials.equipment, 'wash-service', 'surface-pass'); hose.position.set(-1.72, 0.9, -2.05);

  const gates = addPivot(context, model, 'entry-exit-gates');
  const entryGate = addPivot(context, gates, 'entry-gate', [-2.05, 0.14, 2.22]);
  for (const [index, y] of [0.34, 0.72, 1.1].entries()) {
    const rail = mesh(context, entryGate, `entry-gate-rail-${index + 1}`, box(1.1, 0.09, 0.09), context.materials.iron, 'entry-gate', 'structural-pass'); rail.position.set(0.55, y, 0);
  }
  for (const x of [0.04, 1.06]) {
    const upright = mesh(context, entryGate, `entry-gate-upright-${x}`, box(0.09, 1.08, 0.09), context.materials.iron, 'entry-gate', 'structural-pass'); upright.position.set(x, 0.7, 0);
  }
  const entryLatch = mesh(context, entryGate, 'entry-gate-latch', box(0.16, 0.1, 0.12), context.materials.equipment, 'entry-gate', 'interaction-pass'); entryLatch.position.set(1.02, 0.72, 0.1);
  addChannel(context, entryGate, 'rotation', 'y', 1.05, 0.66, 0); addSocket(context, entryGate, 'entry-gate-control', [1.02, 0.72, 0.16]);
  const exitGate = addPivot(context, gates, 'exit-gate', [0.95, 0.14, 2.22]);
  for (const [index, y] of [0.34, 0.72, 1.1].entries()) {
    const rail = mesh(context, exitGate, `exit-gate-rail-${index + 1}`, box(1.1, 0.09, 0.09), context.materials.iron, 'exit-gate', 'structural-pass'); rail.position.set(0.55, y, 0);
  }
  for (const x of [0.04, 1.06]) {
    const upright = mesh(context, exitGate, `exit-gate-upright-${x}`, box(0.09, 1.08, 0.09), context.materials.iron, 'exit-gate', 'structural-pass'); upright.position.set(x, 0.7, 0);
  }
  addSocket(context, exitGate, 'exit-gate-control', [1.02, 0.72, 0.16]);
  addCollider(context, gates, 'entry-exit-gates', 'box', [0, 0.72, 2.22], { width: 4.2, height: 1.2, depth: 0.18, isTrigger: false });

  const canopy = addPivot(context, model, 'equipment-service-canopy');
  const roof = mesh(context, canopy, 'equipment-canopy-roof', box(4.25, 0.12, 1.35), context.materials.galvanized, 'equipment-canopy', 'form-refinement'); roof.position.set(0, 2.6, -1.75);
  for (const x of [-1.95, 1.95]) for (const z of [-2.25, -1.25]) {
    const post = mesh(context, canopy, `canopy-post-${x}-${z}`, box(0.09, 2.38, 0.09), context.materials.iron, 'equipment-canopy', 'structural-pass'); post.position.set(x, 1.26, z);
  }

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.66,
    note: 'Lean stylized low-poly Automated Milking Parlor reconstructed from the generated four-view concept sheet.',
    stallRows: 2, stallPositionsPerRow: 4, milkDropLineCount: 8,
    palette: ['pale concrete', 'galvanized rail', 'dark iron', 'teal equipment', 'cream sanitary line'],
    motion: 'Only the broad entry gate rotates.',
  };
  root.userData.automatedMilkingParlorRig = { slab, stalls, milkLine, equipment, wash, gates, entryGate, exitGate, canopy };
  root.userData.applyPassState = (nextPassId) => applyAutomatedMilkingParlorPassState(root, nextPassId);
  applyAutomatedMilkingParlorPassState(root, passId); return root;
}

export function applyAutomatedMilkingParlorPassState(root, passId = 'optimization-pass') {
  const selectedPass = AUTOMATED_MILKING_PARLOR_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['automated-milking-parlor-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'automated-milking-parlor-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; }); return root;
}

export function animateAutomatedMilkingParlor(root, timeSeconds, intensity = 1) {
  const entryGate = root?.userData?.automatedMilkingParlorRig?.entryGate; if (!entryGate) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0; entryGate.rotation.y = Math.sin(time * 0.66) * 1.05 * Math.max(0, intensity); return root;
}
