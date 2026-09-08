import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const NOODLE_WORKSHOP_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(NOODLE_WORKSHOP_PASSES.map((id, index) => [id, index]));
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
const material = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
function mesh(context, parent, id, geometry, surface, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group, minimumPass); }
function addBox(context, parent, id, size, position, surface, group, minimumPass = 'blockout') { const part = mesh(context, parent, id, box(...size), surface, group, minimumPass); part.position.set(...position); return part; }

export function createNoodleWorkshop(options = {}) {
  const passId = NOODLE_WORKSHOP_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('noodle-workshop', { label: 'Noodle Workshop', targetHeightMetres: 2.72, passId });
  context.materials = {
    stone: material('noodle-workshop-warm-stone-mat', '#aaa18e', 0.96),
    plaster: material('noodle-workshop-cream-plaster-mat', '#d2c9b5', 0.88),
    timber: material('noodle-workshop-warm-timber-mat', '#725038', 0.89),
    iron: material('noodle-workshop-dark-iron-mat', '#303638', 0.55, 0.5),
    galvanized: material('noodle-workshop-pale-galvanized-mat', '#8b9595', 0.67, 0.36),
    fixture: material('noodle-workshop-muted-teal-fixture-mat', '#607a7c', 0.8, 0.14),
  };
  const { model } = context;
  [
    ['ground', [0, 0, 0]], ['terrain', [0, 0.04, 0]], ['dough-input', [-1.05, 0.84, 1.18]],
    ['roller-work', [0.1, 1.05, 0.42]], ['drying', [1.08, 1.55, -0.82]], ['output', [1.1, 0.72, 1.1]],
    ['water', [-1.72, 0.72, -0.38]], ['drain', [0, 0.27, 0.6]], ['power', [1.72, 0.82, -0.38]],
    ['service', [0, 0.55, -1.32]], ['ventilation', [0.48, 2.76, -0.22]], ['attachment', [0, 2.72, 0]],
    ['adjacency-left', [-2.12, 0.1, 0]], ['adjacency-right', [2.12, 0.1, 0]], ['adjacency-front', [0, 0.1, 1.6]],
  ].forEach(([id, position]) => addSocket(context, model, id, position));

  const building = addPivot(context, model, 'open-front-workshop-shell');
  addBox(context, building, 'stone-curb', [3.72, 0.22, 2.42], [0, 0.11, 0], context.materials.stone, 'foundation');
  addBox(context, building, 'workshop-floor', [3.45, 0.08, 2.18], [0, 0.25, 0], context.materials.timber, 'floor', 'structural-pass');
  addBox(context, building, 'rear-plaster-wall', [3.4, 1.78, 0.12], [0, 1.2, -1.05], context.materials.plaster, 'shell', 'structural-pass');
  addBox(context, building, 'left-return-wall', [0.12, 1.78, 2.08], [-1.65, 1.2, 0], context.materials.plaster, 'shell', 'structural-pass');
  addBox(context, building, 'right-return-wall', [0.12, 1.78, 2.08], [1.65, 1.2, 0], context.materials.plaster, 'shell', 'structural-pass');
  for (const [index, [x, z]] of [[-1.58, -0.96], [1.58, -0.96], [-1.58, 0.96], [1.58, 0.96]].entries()) addBox(context, building, `timber-post-${index + 1}`, [0.16, 2.12, 0.16], [x, 1.31, z], context.materials.timber, 'frame', 'structural-pass');
  addBox(context, building, 'front-header', [3.32, 0.18, 0.18], [0, 2.31, 0.96], context.materials.timber, 'frame', 'structural-pass');
  addBox(context, building, 'rear-header', [3.32, 0.18, 0.18], [0, 2.31, -0.96], context.materials.timber, 'frame', 'structural-pass');
  for (const [side, z, rotation] of [['front', 0.48, 0.2], ['rear', -0.48, -0.2]]) { const roof = addBox(context, building, `${side}-galvanized-roof`, [3.72, 0.09, 1.18], [0, 2.49, z], context.materials.galvanized, 'roof', 'form-refinement'); roof.rotation.x = rotation; }
  addBox(context, building, 'roof-ridge', [3.6, 0.1, 0.12], [0, 2.62, 0], context.materials.iron, 'roof', 'surface-pass');
  addCollider(context, building, 'workshop-shell', 'box', [0, 1.3, 0], { width: 3.5, height: 2.6, depth: 2.22, hollow: true, isTrigger: false });

  const kneading = addPivot(context, model, 'empty-kneading-table');
  addBox(context, kneading, 'kneading-table-top', [1.02, 0.1, 0.68], [-1.02, 0.82, 0.34], context.materials.timber, 'kneading-table', 'form-refinement');
  for (const [index, [x, z]] of [[-1.42, 0.08], [-0.62, 0.08], [-1.42, 0.6], [-0.62, 0.6]].entries()) addBox(context, kneading, `table-leg-${index + 1}`, [0.08, 0.55, 0.08], [x, 0.53, z], context.materials.timber, 'kneading-table', 'structural-pass');
  addBox(context, kneading, 'table-lower-shelf', [0.82, 0.07, 0.5], [-1.02, 0.46, 0.34], context.materials.timber, 'kneading-table', 'surface-pass');
  addCollider(context, kneading, 'kneading-table', 'box', [-1.02, 0.57, 0.34], { width: 1.08, height: 0.68, depth: 0.74, isTrigger: false });

  const machine = addPivot(context, model, 'paired-roller-and-cutter-machine');
  addBox(context, machine, 'machine-left-upright', [0.14, 1.2, 0.18], [-0.42, 0.96, 0.3], context.materials.timber, 'machine-frame', 'structural-pass');
  addBox(context, machine, 'machine-right-upright', [0.14, 1.2, 0.18], [0.6, 0.96, 0.3], context.materials.timber, 'machine-frame', 'structural-pass');
  addBox(context, machine, 'machine-base', [1.2, 0.16, 0.62], [0.09, 0.39, 0.3], context.materials.timber, 'machine-frame', 'structural-pass');
  addBox(context, machine, 'machine-top-beam', [1.2, 0.14, 0.28], [0.09, 1.58, 0.3], context.materials.timber, 'machine-frame', 'structural-pass');
  const rollerPivots = [];
  for (const [index, y] of [1.23, 1.49].entries()) {
    const pivot = addPivot(context, machine, `noodle-roller-${index + 1}`, [0.09, y, 0.3]);
    rollerPivots.push(pivot);
    const roller = mesh(context, pivot, `roller-${index + 1}-cylinder`, new THREE.CylinderGeometry(0.12, 0.12, 0.86, 10), context.materials.galvanized, 'rollers', 'form-refinement');
    roller.rotation.z = Math.PI / 2;
    for (const x of [-0.48, 0.48]) { const axle = mesh(context, pivot, `roller-${index + 1}-axle-${x}`, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), context.materials.iron, 'roller-axles', 'surface-pass'); axle.position.x = x; axle.rotation.z = Math.PI / 2; }
  }
  addBox(context, machine, 'cutter-comb-rail', [0.94, 0.08, 0.18], [0.09, 1.02, 0.3], context.materials.iron, 'cutter', 'form-refinement');
  for (let tooth = 0; tooth < 12; tooth += 1) addBox(context, machine, `cutter-tooth-${tooth + 1}`, [0.035, 0.18, 0.1], [-0.32 + tooth * 0.075, 0.9, 0.3], context.materials.iron, 'cutter', 'surface-pass');
  addCollider(context, machine, 'roller-cutter', 'box', [0.09, 1, 0.3], { width: 1.28, height: 1.34, depth: 0.68, isTrigger: false });

  const crank = addPivot(context, model, 'hand-crank-drive', [0.75, 1.35, 0.3]);
  const crankWheel = mesh(context, crank, 'hand-crank-wheel', new THREE.TorusGeometry(0.25, 0.035, 5, 10), context.materials.iron, 'drive', 'interaction-pass');
  crankWheel.rotation.y = Math.PI / 2;
  for (const angle of [0, Math.PI / 2]) { const spoke = addBox(context, crank, `crank-spoke-${angle}`, [0.045, 0.43, 0.045], [0, 0, 0], context.materials.iron, 'drive', 'interaction-pass'); spoke.rotation.x = angle; }
  const handle = mesh(context, crank, 'crank-handle', new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), context.materials.timber, 'drive', 'interaction-pass'); handle.position.set(0, 0.23, 0); handle.rotation.z = Math.PI / 2;
  crank.userData.attachment = { parentId: 'paired-roller-and-cutter-machine', parentSocket: 'roller-work', localStart: [0.75, 1.35, 0.3], localEnd: [0.58, 1.35, 0.3], contactType: 'socket', overlap: 0.03, gapTolerance: 0.005, evidenceRefs: ['noodle workshop concept: roller-machine side crank'] };
  addChannel(context, crank, 'rotation', 'x', Math.PI * 2, 0.48, 0);

  const drying = addPivot(context, model, 'two-empty-drying-rods');
  for (const [index, y] of [1.28, 1.67].entries()) {
    const rod = mesh(context, drying, `drying-rod-${index + 1}`, new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8), context.materials.iron, 'drying-rods', 'form-refinement');
    rod.position.set(1.0, y, -0.82); rod.rotation.z = Math.PI / 2;
    for (const x of [0.42, 1.58]) addBox(context, drying, `rod-${index + 1}-bracket-${x}`, [0.08, 0.14, 0.12], [x, y, -0.88], context.materials.fixture, 'drying-rods', 'surface-pass');
  }
  addCollider(context, drying, 'drying-rods', 'box', [1, 1.48, -0.82], { width: 1.28, height: 0.6, depth: 0.22, isTrigger: false });

  const output = addPivot(context, model, 'empty-output-shelf');
  addBox(context, output, 'output-shelf', [0.96, 0.12, 0.46], [1.06, 0.7, 0.68], context.materials.timber, 'output', 'form-refinement');
  addBox(context, output, 'output-shelf-back', [0.96, 0.36, 0.08], [1.06, 0.88, 0.88], context.materials.timber, 'output', 'surface-pass');
  addCollider(context, output, 'output-shelf', 'box', [1.06, 0.75, 0.68], { width: 1.02, height: 0.5, depth: 0.52, isTrigger: false });

  const service = addPivot(context, model, 'drain-power-and-steam-service');
  addBox(context, service, 'floor-drain', [0.36, 0.03, 0.36], [0, 0.31, 0.65], context.materials.iron, 'drainage', 'interaction-pass');
  for (const x of [-0.11, 0, 0.11]) addBox(context, service, `drain-slot-${x}`, [0.035, 0.02, 0.27], [x, 0.33, 0.65], context.materials.galvanized, 'drainage', 'surface-pass');
  addBox(context, service, 'power-service-box', [0.18, 0.56, 0.44], [1.76, 0.88, -0.38], context.materials.fixture, 'power-service', 'interaction-pass');
  addBox(context, service, 'power-box-face', [0.04, 0.42, 0.32], [1.86, 0.88, -0.38], context.materials.iron, 'power-service', 'surface-pass');
  const vent = mesh(context, service, 'short-steam-vent', new THREE.CylinderGeometry(0.12, 0.12, 0.62, 8), context.materials.iron, 'ventilation', 'form-refinement');
  vent.position.set(0.48, 2.78, -0.22);
  const cap = mesh(context, service, 'steam-vent-cap', new THREE.ConeGeometry(0.2, 0.18, 6), context.materials.galvanized, 'ventilation', 'surface-pass');
  cap.position.set(0.48, 3.12, -0.22);
  addCollider(context, service, 'service', 'box', [0.48, 1.7, -0.22], { width: 2.86, height: 2.9, depth: 0.6, isTrigger: true });

  const root = finishAsset(context);
  root.userData.artDirection = {
    concept: 'references/concepts/noodle-workshop.png',
    note: 'Approximate stylized low-poly reconstruction from one generated four-view concept sheet.',
    identity: ['open-front cream and timber workshop', 'empty kneading table', 'paired roller-and-cutter machine', 'hand crank', 'two empty drying rods', 'empty output shelf', 'floor drain and steam vent'],
    motion: 'The crank and paired rollers rotate as one visible mechanical system. No dough or noodle simulation is authored.',
    conceptCorrectionPasses: 0, modelCorrectionPasses: 0,
  };
  Object.defineProperty(root.userData, 'noodleWorkshopRig', { value: { building, kneading, machine, rollerPivots, crank, drying, output, service }, enumerable: false, configurable: true });
  root.userData.applyPassState = (nextPass) => applyNoodleWorkshopPassState(root, nextPass);
  applyNoodleWorkshopPassState(root, passId);
  return root;
}

export function applyNoodleWorkshopPassState(root, passId = 'optimization-pass') {
  const selected = NOODLE_WORKSHOP_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selected);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['noodle-workshop-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'noodle-workshop-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selected;
  root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; });
  return root;
}

export function animateNoodleWorkshop(root, timeSeconds, intensity = 1) {
  const rig = root?.userData?.noodleWorkshopRig;
  if (!rig) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const angle = time * 0.48 * Math.PI * 2 * Math.max(0, intensity);
  rig.crank.rotation.x = angle;
  rig.rollerPivots.forEach((pivot, index) => { pivot.rotation.x = angle * (index === 0 ? 1 : -1); });
  return root;
}
