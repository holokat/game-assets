import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const SUGAR_MILL_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(SUGAR_MILL_PASSES.map((id, index) => [id, index]));
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
const material = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
function mesh(context, parent, id, geometry, surface, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group, minimumPass);
}
function addBox(context, parent, id, size, position, surface, group, minimumPass = 'blockout') {
  const part = mesh(context, parent, id, box(...size), surface, group, minimumPass);
  part.position.set(...position);
  return part;
}

export function createSugarMill(options = {}) {
  const passId = SUGAR_MILL_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('sugar-mill', { label: 'Sugar Mill', targetHeightMetres: 2.78, passId });
  context.materials = {
    timber: material('sugar-mill-warm-timber-mat', '#725038', 0.89),
    iron: material('sugar-mill-dark-iron-mat', '#303638', 0.55, 0.5),
    galvanized: material('sugar-mill-pale-galvanized-mat', '#8b9595', 0.67, 0.36),
    stone: material('sugar-mill-warm-stone-foot-mat', '#aaa18e', 0.96),
    fixture: material('sugar-mill-muted-teal-fixture-mat', '#607a7c', 0.8, 0.14),
  };
  const { model } = context;

  const socketData = [
    ['ground', [0, 0, 0]], ['terrain', [0, 0.04, 0]], ['cane-input', [0, 1.82, 1.3]],
    ['roller-work', [0, 1.15, 0.12]], ['juice-output', [0, 0.42, 1.1]], ['dry-output', [0, 0.52, -0.95]],
    ['drive', [-1.28, 1.17, 0.08]], ['service', [1.25, 1.12, 0.08]], ['canopy-attachment', [0, 2.78, 0]],
    ['adjacency-left', [-1.75, 0.1, 0]], ['adjacency-right', [1.75, 0.1, 0]],
    ['adjacency-front', [0, 0.1, 1.6]], ['adjacency-rear', [0, 0.1, -1.22]],
  ];
  socketData.forEach(([id, position]) => addSocket(context, model, id, position));

  const foundation = addPivot(context, model, 'grounded-foundation');
  for (const [index, [x, z]] of [[-0.79, -0.52], [0.79, -0.52], [-0.79, 0.52], [0.79, 0.52]].entries()) {
    addBox(context, foundation, `stone-foot-${index + 1}`, [0.34, 0.2, 0.34], [x, 0.1, z], context.materials.stone, 'foundation');
    addBox(context, foundation, `foot-plate-${index + 1}`, [0.26, 0.06, 0.26], [x, 0.23, z], context.materials.iron, 'foundation', 'surface-pass');
  }
  addBox(context, foundation, 'lower-front-beam', [1.76, 0.18, 0.18], [0, 0.34, 0.5], context.materials.timber, 'foundation', 'structural-pass');
  addBox(context, foundation, 'lower-rear-beam', [1.76, 0.18, 0.18], [0, 0.34, -0.5], context.materials.timber, 'foundation', 'structural-pass');
  addCollider(context, foundation, 'foundation', 'box', [0, 0.18, 0], { width: 1.95, height: 0.36, depth: 1.28, isTrigger: false });

  const frame = addPivot(context, model, 'lean-roller-frame');
  for (const [index, [x, z]] of [[-0.72, -0.43], [0.72, -0.43], [-0.72, 0.43], [0.72, 0.43]].entries()) {
    addBox(context, frame, `frame-post-${index + 1}`, [0.16, 2.12, 0.16], [x, 1.32, z], context.materials.timber, 'frame', 'structural-pass');
    for (const y of [0.65, 1.15, 1.65, 2.2]) addBox(context, frame, `post-bracket-${index + 1}-${y}`, [0.22, 0.14, 0.22], [x, y, z], context.materials.fixture, 'frame-fasteners', 'surface-pass');
  }
  addBox(context, frame, 'front-top-crossbeam', [1.68, 0.18, 0.18], [0, 2.35, 0.43], context.materials.timber, 'frame', 'structural-pass');
  addBox(context, frame, 'rear-top-crossbeam', [1.68, 0.18, 0.18], [0, 2.35, -0.43], context.materials.timber, 'frame', 'structural-pass');
  addCollider(context, frame, 'roller-frame', 'box', [0, 1.35, 0], { width: 1.72, height: 2.28, depth: 1.05, hollow: true, isTrigger: false });

  const rollers = addPivot(context, model, 'three-ribbed-crushing-rollers');
  const rollerPivots = [];
  const rollerY = [0.84, 1.18, 1.52];
  rollerY.forEach((y, rollerIndex) => {
    const pivot = addPivot(context, rollers, `crushing-roller-${rollerIndex + 1}`, [0, y, 0.12]);
    rollerPivots.push(pivot);
    const body = mesh(context, pivot, `roller-${rollerIndex + 1}-body`, new THREE.CylinderGeometry(0.18, 0.18, 1.38, 10), context.materials.iron, 'crushing-rollers', 'form-refinement');
    body.rotation.z = Math.PI / 2;
    for (let rib = 0; rib < 7; rib += 1) {
      const ring = mesh(context, pivot, `roller-${rollerIndex + 1}-rib-${rib + 1}`, new THREE.CylinderGeometry(0.198, 0.198, 0.055, 10), context.materials.galvanized, 'roller-ribs', 'surface-pass');
      ring.position.x = -0.57 + rib * 0.19;
      ring.rotation.z = Math.PI / 2;
    }
    for (const x of [-0.76, 0.76]) {
      const axle = mesh(context, pivot, `roller-${rollerIndex + 1}-axle-${x}`, new THREE.CylinderGeometry(0.055, 0.055, 0.2, 8), context.materials.iron, 'roller-axles', 'structural-pass');
      axle.position.x = x;
      axle.rotation.z = Math.PI / 2;
    }
  });
  addCollider(context, rollers, 'crushing-rollers', 'box', [0, 1.18, 0.12], { width: 1.74, height: 1.02, depth: 0.5, isTrigger: false });

  const gears = addPivot(context, model, 'exposed-gear-train');
  const gearPivots = [];
  rollerY.forEach((y, gearIndex) => {
    const gear = addPivot(context, gears, `roller-gear-${gearIndex + 1}`, [0.88, y, 0.12]);
    gearPivots.push(gear);
    const hub = mesh(context, gear, `gear-${gearIndex + 1}-hub`, new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12), context.materials.iron, 'gear-train', 'form-refinement');
    hub.rotation.z = Math.PI / 2;
    for (let tooth = 0; tooth < 12; tooth += 1) {
      const angle = (tooth / 12) * Math.PI * 2;
      const part = addBox(context, gear, `gear-${gearIndex + 1}-tooth-${tooth + 1}`, [0.12, 0.1, 0.12], [0, Math.cos(angle) * 0.27, Math.sin(angle) * 0.27], context.materials.iron, 'gear-teeth', 'surface-pass');
      part.rotation.x = -angle;
    }
  });

  const drive = addPivot(context, model, 'handwheel-drive', [-1.08, 1.18, 0.1]);
  const wheel = mesh(context, drive, 'lean-handwheel-rim', new THREE.TorusGeometry(0.43, 0.045, 5, 12), context.materials.iron, 'drive', 'interaction-pass');
  wheel.rotation.y = Math.PI / 2;
  for (const angle of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
    const spoke = addBox(context, drive, `handwheel-spoke-${angle}`, [0.055, 0.72, 0.055], [0, 0, 0], context.materials.iron, 'drive', 'interaction-pass');
    spoke.rotation.x = angle;
  }
  const driveAxle = mesh(context, drive, 'handwheel-axle', new THREE.CylinderGeometry(0.07, 0.07, 0.28, 8), context.materials.galvanized, 'drive', 'interaction-pass');
  driveAxle.rotation.z = Math.PI / 2;
  drive.userData.attachment = { parentId: 'lean-roller-frame', parentSocket: 'drive', localStart: [-1.08, 1.18, 0.1], localEnd: [-0.76, 1.18, 0.1], contactType: 'socket', overlap: 0.04, gapTolerance: 0.005, evidenceRefs: ['sugar mill concept: side handwheel and roller axle'] };
  addChannel(context, drive, 'rotation', 'x', Math.PI * 2, 0.42, 0);

  const feed = addPivot(context, model, 'empty-sloped-feed-table');
  const table = addBox(context, feed, 'empty-feed-table-bed', [1.44, 0.1, 1.15], [0, 1.82, 0.77], context.materials.timber, 'feed-table', 'form-refinement');
  table.rotation.x = -0.27;
  for (const x of [-0.68, 0.68]) {
    const rail = addBox(context, feed, `feed-side-rail-${x}`, [0.1, 0.18, 1.18], [x, 1.91, 0.77], context.materials.timber, 'feed-table', 'surface-pass');
    rail.rotation.x = -0.27;
  }
  addCollider(context, feed, 'feed-table', 'box', [0, 1.84, 0.77], { width: 1.55, height: 0.32, depth: 1.2, isTrigger: false });

  const collection = addPivot(context, model, 'collection-trough-and-spout');
  addBox(context, collection, 'empty-collection-trough', [1.36, 0.18, 0.62], [0, 0.43, 0.54], context.materials.fixture, 'collection', 'form-refinement');
  const spout = addBox(context, collection, 'short-drain-spout', [0.28, 0.09, 0.62], [0, 0.53, 0.98], context.materials.galvanized, 'collection', 'surface-pass');
  spout.rotation.x = -0.18;
  addBox(context, collection, 'dry-output-chute', [0.74, 0.14, 0.38], [0, 0.62, -0.66], context.materials.timber, 'output', 'interaction-pass');
  addCollider(context, collection, 'collection', 'box', [0, 0.48, 0.35], { width: 1.45, height: 0.45, depth: 1.65, isTrigger: false });

  const canopy = addPivot(context, model, 'slim-weather-canopy');
  for (const [side, z, rotation] of [['front', 0.34, 0.2], ['rear', -0.34, -0.2]]) {
    const panel = addBox(context, canopy, `${side}-roof-panel`, [2.02, 0.08, 0.78], [0, 2.62, z], context.materials.galvanized, 'canopy', 'form-refinement');
    panel.rotation.x = rotation;
  }
  addBox(context, canopy, 'canopy-ridge', [2.08, 0.09, 0.12], [0, 2.72, 0], context.materials.iron, 'canopy', 'surface-pass');
  addCollider(context, canopy, 'canopy', 'box', [0, 2.63, 0], { width: 2.15, height: 0.28, depth: 1.58, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = {
    concept: 'references/concepts/sugar-mill.png',
    note: 'Approximate stylized low-poly reconstruction from a single generated four-view concept sheet.',
    identity: ['three horizontal ribbed rollers', 'empty sloped feed table', 'exposed side gear train', 'lean handwheel', 'collection trough and short spout', 'slim galvanized canopy'],
    motion: 'The handwheel, three rollers, and matching gears rotate as one defensible drive system. No product or liquid simulation is authored.',
    conceptCorrectionPasses: 0,
    modelCorrectionPasses: 0,
  };
  Object.defineProperty(root.userData, 'sugarMillRig', { value: { foundation, frame, rollers, rollerPivots, gears, gearPivots, drive, feed, collection, canopy }, enumerable: false, configurable: true });
  root.userData.applyPassState = (nextPass) => applySugarMillPassState(root, nextPass);
  applySugarMillPassState(root, passId);
  return root;
}

export function applySugarMillPassState(root, passId = 'optimization-pass') {
  const selected = SUGAR_MILL_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selected);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['sugar-mill-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'sugar-mill-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selected;
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateSugarMill(root, timeSeconds, intensity = 1) {
  const rig = root?.userData?.sugarMillRig;
  if (!rig) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const amount = Math.max(0, intensity);
  const angle = time * 0.42 * Math.PI * 2 * amount;
  rig.drive.rotation.x = angle;
  rig.rollerPivots.forEach((pivot, index) => { pivot.rotation.x = angle * (index % 2 === 0 ? 1 : -1); });
  rig.gearPivots.forEach((pivot, index) => { pivot.rotation.x = angle * (index % 2 === 0 ? -1 : 1); });
  return root;
}
