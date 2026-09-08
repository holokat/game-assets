import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const BREEDING_BARN_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(BREEDING_BARN_PASSES.map((id, index) => [id, index]));
function material(name, color, roughness, metalness = 0) { return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true }); }
function makeMaterials() {
  return {
    concrete: material('breeding-barn-pale-concrete-mat', '#a9a294', 0.94),
    timber: material('breeding-barn-weathered-timber-mat', '#765034', 0.9),
    galvanized: material('breeding-barn-galvanized-mat', '#899396', 0.69, 0.4),
    iron: material('breeding-barn-dark-iron-mat', '#34393a', 0.59, 0.5),
    fixture: material('breeding-barn-blue-grey-fixture-mat', '#5d7476', 0.82, 0.12),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass); }
function addBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5)); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return beam;
}

function addHoldingFence(context, parent, id, x) {
  for (const z of [-1.7, -0.45, 0.8, 2.05]) {
    const post = mesh(context, parent, `${id}-post-${z}`, box(0.13, 1.28, 0.13), context.materials.timber, 'holding-bay-fences', 'structural-pass'); post.position.set(x, 0.72, z);
  }
  for (const y of [0.4, 0.9]) {
    const rail = mesh(context, parent, `${id}-rail-${y}`, box(0.11, 0.1, 3.85), context.materials.timber, 'holding-bay-fences', 'structural-pass'); rail.position.set(x, y, 0.18);
  }
  for (let index = 1; index <= 7; index += 1) {
    const wire = mesh(context, parent, `${id}-wire-${index}`, box(0.026, 0.72, 0.026), context.materials.iron, 'holding-wire-infill', 'surface-pass'); wire.position.set(x, 0.66, THREE.MathUtils.lerp(-1.7, 2.05, index / 8));
  }
}

function addExternalGate(context, parent, id, pivotX, width) {
  const gate = addPivot(context, parent, id, [pivotX, 0.16, 2.32]);
  for (const [index, y] of [0.35, 0.72, 1.09].entries()) {
    const rail = mesh(context, gate, `${id}-rail-${index + 1}`, box(width, 0.09, 0.09), context.materials.iron, 'external-gates', 'structural-pass'); rail.position.set(width / 2, y, 0);
  }
  for (const x of [0.05, width - 0.05]) {
    const upright = mesh(context, gate, `${id}-upright-${x}`, box(0.09, 1.08, 0.09), context.materials.iron, 'external-gates', 'structural-pass'); upright.position.set(x, 0.7, 0);
  }
  const latch = mesh(context, gate, `${id}-latch`, box(0.17, 0.1, 0.12), context.materials.fixture, 'external-gates', 'interaction-pass'); latch.position.set(width - 0.08, 0.72, 0.1);
  addSocket(context, gate, `${id}-control`, [width - 0.08, 0.72, 0.16]); return gate;
}

export function createBreedingBarn(options = {}) {
  const passId = BREEDING_BARN_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('breeding-barn', { label: 'Breeding Barn', targetHeightMetres: 2.55, passId }); context.materials = makeMaterials(); const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'livestock-entry', [0, 0.14, 2.65]); addSocket(context, model, 'livestock-exit', [0, 0.14, -2.65]);
  addSocket(context, model, 'bay-a', [-1.35, 0.2, 0.55]); addSocket(context, model, 'bay-b', [1.35, 0.2, 0.55]); addSocket(context, model, 'transfer', [0, 0.2, 0]);
  addSocket(context, model, 'water-input', [1.45, 0.45, -1.72]); addSocket(context, model, 'power-input', [-1.45, 1.05, -2.12]);
  addSocket(context, model, 'ventilation-left', [-1.1, 1.65, -2.18]); addSocket(context, model, 'ventilation-right', [1.1, 1.65, -2.18]);
  addSocket(context, model, 'service', [0, 0.16, -2.35]); addSocket(context, model, 'roof-attachment', [0, 2.52, -1.55]);
  addSocket(context, model, 'adjacency-left', [-2.55, 0.1, 0]); addSocket(context, model, 'adjacency-right', [2.55, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 2.65]); addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.65]);

  const foundation = addPivot(context, model, 'facility-foundation');
  const slab = mesh(context, foundation, 'facility-slab', box(4.85, 0.16, 5.15), context.materials.concrete, 'facility-foundation'); slab.position.y = 0.08;
  for (const [id, x] of [['bay-a', -1.35], ['bay-b', 1.35]]) {
    const floor = mesh(context, foundation, `${id}-holding-floor`, box(1.62, 0.08, 3.95), context.materials.concrete, 'holding-bay-floors', 'form-refinement'); floor.position.set(x, 0.2, 0.2);
  }
  const lane = mesh(context, foundation, 'controlled-transfer-lane', box(0.72, 0.07, 4.2), context.materials.iron, 'transfer-lane', 'form-refinement'); lane.position.set(0, 0.19, 0.05);
  for (let index = 0; index < 7; index += 1) {
    const grate = mesh(context, foundation, `floor-drain-bar-${index + 1}`, box(0.46, 0.045, 0.05), context.materials.galvanized, 'floor-drain', 'surface-pass'); grate.position.set(0, 0.24, -1.5 + index * 0.065);
  }
  addCollider(context, foundation, 'facility-foundation', 'box', [0, 0.12, 0], { width: 4.85, height: 0.24, depth: 5.15, isTrigger: false });

  const bays = addPivot(context, model, 'separated-holding-bays');
  addHoldingFence(context, bays, 'left-outer-fence', -2.22); addHoldingFence(context, bays, 'left-inner-divider', -0.52);
  addHoldingFence(context, bays, 'right-inner-divider', 0.52); addHoldingFence(context, bays, 'right-outer-fence', 2.22);
  addCollider(context, bays, 'holding-bay-a', 'box', [-1.35, 0.72, 0.2], { width: 1.75, height: 1.44, depth: 4.1, hollow: true, isTrigger: false });
  addCollider(context, bays, 'holding-bay-b', 'box', [1.35, 0.72, 0.2], { width: 1.75, height: 1.44, depth: 4.1, hollow: true, isTrigger: false });

  const externalGates = addPivot(context, model, 'external-livestock-gates');
  const bayAGate = addExternalGate(context, externalGates, 'bay-a-external-gate', -2.16, 1.58);
  const bayBGate = addExternalGate(context, externalGates, 'bay-b-external-gate', 0.58, 1.58);
  addCollider(context, externalGates, 'external-livestock-gates', 'box', [0, 0.72, 2.32], { width: 4.4, height: 1.2, depth: 0.18, isTrigger: false });

  const transferGate = addPivot(context, model, 'internal-transfer-gate', [-0.48, 0.16, -0.1]);
  for (const [id, width, height, x, y] of [['left', 0.09, 0.95, 0.045, 0.475], ['right', 0.09, 0.95, 0.91, 0.475], ['top', 0.96, 0.09, 0.48, 0.91], ['bottom', 0.96, 0.09, 0.48, 0.045]]) {
    const frame = mesh(context, transferGate, `transfer-gate-${id}-frame`, box(width, height, 0.09), context.materials.timber, 'transfer-gate', 'structural-pass'); frame.position.set(x, y, 0);
  }
  addBeam(context, transferGate, 'transfer-gate-diagonal', [0.08, 0.12, 0], [0.88, 0.84, 0], 0.075, 0.075, context.materials.timber, 'transfer-gate');
  const transferLatch = mesh(context, transferGate, 'transfer-gate-latch', box(0.16, 0.09, 0.12), context.materials.iron, 'transfer-gate', 'interaction-pass'); transferLatch.position.set(0.86, 0.55, 0.1);
  addChannel(context, transferGate, 'rotation', 'y', 1.02, 0.67, 0); addSocket(context, transferGate, 'transfer-gate-control', [0.86, 0.55, 0.16]);
  addCollider(context, transferGate, 'internal-transfer-gate', 'box', [0.48, 0.48, 0], { width: 1, height: 1, depth: 0.16, isTrigger: false });

  const service = addPivot(context, model, 'covered-service-area');
  const rearWall = mesh(context, service, 'rear-windbreak-wall', box(4.4, 1.55, 0.14), context.materials.timber, 'service-structure', 'structural-pass'); rearWall.position.set(0, 1.03, -2.15);
  for (const x of [-2.15, 2.15]) {
    const side = mesh(context, service, `service-side-wall-${x}`, box(0.14, 1.35, 1.45), context.materials.timber, 'service-structure', 'structural-pass'); side.position.set(x, 0.94, -1.52);
    const post = mesh(context, service, `service-front-post-${x}`, box(0.14, 2.2, 0.14), context.materials.timber, 'service-structure', 'structural-pass'); post.position.set(x, 1.18, -0.86);
  }
  const roof = mesh(context, service, 'single-slope-service-roof', box(4.7, 0.12, 1.7), context.materials.galvanized, 'service-roof', 'form-refinement'); roof.position.set(0, 2.35, -1.52); roof.rotation.x = -0.08;
  for (const [index, x] of [-1.1, 1.1].entries()) {
    const ventFrame = mesh(context, service, `vent-${index + 1}-frame`, box(0.72, 0.44, 0.09), context.materials.galvanized, 'ventilation-panels', 'form-refinement'); ventFrame.position.set(x, 1.62, -2.24);
    for (let slat = 0; slat < 3; slat += 1) {
      const louver = mesh(context, service, `vent-${index + 1}-louver-${slat + 1}`, box(0.58, 0.055, 0.07), context.materials.iron, 'ventilation-panels', 'surface-pass'); louver.position.set(x, 1.48 + slat * 0.13, -2.3);
    }
  }
  addCollider(context, service, 'covered-service-area', 'box', [0, 1.18, -1.55], { width: 4.55, height: 2.36, depth: 1.75, isTrigger: false });

  const utilities = addPivot(context, model, 'water-power-utilities');
  const cabinet = mesh(context, utilities, 'power-service-cabinet', box(0.5, 0.92, 0.28), context.materials.iron, 'power-service', 'form-refinement'); cabinet.position.set(-1.45, 0.94, -2.0);
  const standpipe = mesh(context, utilities, 'water-standpipe', new THREE.CylinderGeometry(0.07, 0.08, 0.9, 8), context.materials.fixture, 'water-service', 'form-refinement'); standpipe.position.set(1.45, 0.67, -1.72);
  const basin = mesh(context, utilities, 'water-basin', box(0.72, 0.28, 0.5), context.materials.fixture, 'water-service', 'form-refinement'); basin.position.set(1.45, 0.3, -1.48);

  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 2.45, note: 'Lean stylized low-poly Breeding Barn reconstructed from the generated four-view concept sheet.', holdingBayCount: 2, ventilationPanelCount: 2,
    palette: ['pale concrete', 'weathered timber', 'galvanized roof', 'dark iron', 'blue-grey utilities'], motion: 'Only the internal transfer-lane divider gate rotates. No breeding simulation is authored.' };
  root.userData.breedingBarnRig = { foundation, bays, externalGates, bayAGate, bayBGate, transferGate, service, utilities };
  root.userData.applyPassState = (nextPassId) => applyBreedingBarnPassState(root, nextPassId); applyBreedingBarnPassState(root, passId); return root;
}

export function applyBreedingBarnPassState(root, passId = 'optimization-pass') {
  const selectedPass = BREEDING_BARN_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['breeding-barn-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'breeding-barn-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; }); return root;
}

export function animateBreedingBarn(root, timeSeconds, intensity = 1) {
  const gate = root?.userData?.breedingBarnRig?.transferGate; if (!gate) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  gate.rotation.y = Math.sin(time * 0.67) * 1.02 * Math.max(0, intensity); return root;
}
