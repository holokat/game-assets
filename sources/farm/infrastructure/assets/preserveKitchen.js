import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const PRESERVE_KITCHEN_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(PRESERVE_KITCHEN_PASSES.map((id, index) => [id, index]));
function material(name, color, roughness, metalness = 0) { return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true }); }
function makeMaterials() { return {
  stone: material('preserve-kitchen-warm-stone-mat', '#a69b84', 0.96), plaster: material('preserve-kitchen-pale-plaster-mat', '#c8bea8', 0.95),
  timber: material('preserve-kitchen-weathered-timber-mat', '#725037', 0.9), iron: material('preserve-kitchen-dark-iron-mat', '#303638', 0.57, 0.5),
  galvanized: material('preserve-kitchen-dark-galvanized-mat', '#687476', 0.68, 0.4), fixture: material('preserve-kitchen-blue-grey-fixture-mat', '#607a7c', 0.81, 0.14),
}; }
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass); }

export function createPreserveKitchen(options = {}) {
  const passId = PRESERVE_KITCHEN_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('preserve-kitchen', { label: 'Preserve Kitchen', targetHeightMetres: 3.6, passId }); context.materials = makeMaterials(); const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0.04, 0]); addSocket(context, model, 'produce-input', [-0.82, 1.15, 1.75]);
  addSocket(context, model, 'cook-work', [2.0, 1.05, 0]); addSocket(context, model, 'product-output', [0.72, 1.05, 1.75]); addSocket(context, model, 'water-input', [2.05, 0.85, -0.85]);
  addSocket(context, model, 'wash-drain', [1.35, 0.12, -1.35]); addSocket(context, model, 'fuel-input', [1.85, 0.68, 1.25]); addSocket(context, model, 'power-input', [-1.2, 1.05, -1.6]);
  addSocket(context, model, 'ventilation', [2.02, 3.52, 0.2]); addSocket(context, model, 'service', [-1.95, 1.0, -0.2]); addSocket(context, model, 'roof-attachment', [0, 3.05, 0]);
  addSocket(context, model, 'work-canopy-attachment', [2.45, 2.45, 0]); addSocket(context, model, 'adjacency-left', [-2.35, 0.1, 0]); addSocket(context, model, 'adjacency-right', [2.75, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 2.05]); addSocket(context, model, 'adjacency-rear', [0, 0.1, -1.95]);

  const shell = addPivot(context, model, 'hygienic-kitchen-shell');
  const slab = mesh(context, shell, 'foundation-slab', box(4.0, 0.16, 3.15), context.materials.stone, 'building-foundation'); slab.position.y = 0.08;
  for (const [id, width, depth, x, z] of [['front', 3.85, 0.18, 0, 1.43], ['rear', 3.85, 0.18, 0, -1.43], ['left', 0.18, 2.68, -1.83, 0], ['right', 0.18, 2.68, 1.83, 0]]) {
    const plinth = mesh(context, shell, `${id}-stone-plinth`, box(width, 0.58, depth), context.materials.stone, 'stone-plinth'); plinth.position.set(x, 0.37, z);
    const wall = mesh(context, shell, `${id}-plaster-wall`, box(width, 1.95, depth), context.materials.plaster, 'plaster-walls', 'form-refinement'); wall.position.set(x, 1.64, z);
  }
  addCollider(context, shell, 'kitchen-shell', 'box', [0, 1.35, 0], { width: 4, height: 2.7, depth: 3.15, hollow: true, isTrigger: false });

  const roof = addPivot(context, model, 'modest-pitched-roof');
  for (const [id, x, rotationZ] of [['left', -1.02, 0.25], ['right', 1.02, -0.25]]) { const panel = mesh(context, roof, `${id}-roof-panel`, box(2.15, 0.11, 3.5), context.materials.galvanized, 'roof-panels', 'form-refinement'); panel.position.set(x, 2.82, 0); panel.rotation.z = rotationZ; }
  const ridge = mesh(context, roof, 'roof-ridge', box(0.16, 0.12, 3.52), context.materials.iron, 'roof-panels', 'surface-pass'); ridge.position.y = 3.08;
  addCollider(context, roof, 'pitched-roof', 'box', [0, 2.88, 0], { width: 4.4, height: 0.5, depth: 3.55, isTrigger: false });

  const receiving = addPivot(context, model, 'covered-produce-receiving-hatch');
  const receiveRecess = mesh(context, receiving, 'produce-receiving-recess', box(1.15, 0.82, 0.08), context.materials.iron, 'produce-receiving', 'structural-pass'); receiveRecess.position.set(-0.82, 1.27, 1.54);
  const ledge = mesh(context, receiving, 'empty-produce-ledge', box(1.25, 0.09, 0.52), context.materials.timber, 'produce-receiving', 'form-refinement'); ledge.position.set(-0.82, 0.82, 1.76);
  const cover = mesh(context, receiving, 'receiving-weather-cover', box(1.35, 0.08, 0.62), context.materials.galvanized, 'produce-receiving', 'surface-pass'); cover.position.set(-0.82, 1.78, 1.7); cover.rotation.x = -0.15;
  addCollider(context, receiving, 'produce-receiving', 'box', [-0.82, 1.25, 1.68], { width: 1.35, height: 1.15, depth: 0.62, isTrigger: false });

  const product = addPivot(context, model, 'empty-product-output-shutter');
  const outputRecess = mesh(context, product, 'product-output-recess', box(0.95, 0.72, 0.08), context.materials.iron, 'product-output', 'structural-pass'); outputRecess.position.set(0.72, 1.25, 1.54);
  const shutter = mesh(context, product, 'timber-output-shutter', box(0.84, 0.5, 0.08), context.materials.timber, 'product-output', 'form-refinement'); shutter.position.set(0.72, 1.55, 1.68);
  const tray = mesh(context, product, 'empty-product-output-tray', box(0.98, 0.08, 0.48), context.materials.timber, 'product-output', 'surface-pass'); tray.position.set(0.72, 0.85, 1.75);
  addCollider(context, product, 'product-output', 'box', [0.72, 1.22, 1.66], { width: 1.05, height: 1, depth: 0.52, isTrigger: false });

  const workBay = addPivot(context, model, 'open-preserve-work-bay');
  for (const z of [-1.15, 1.15]) { const post = mesh(context, workBay, `work-bay-post-${z}`, box(0.14, 2.25, 0.14), context.materials.timber, 'work-bay-structure', 'structural-pass'); post.position.set(2.55, 1.17, z); }
  const canopy = mesh(context, workBay, 'work-bay-canopy', box(1.35, 0.1, 2.75), context.materials.galvanized, 'work-bay-structure', 'form-refinement'); canopy.position.set(2.18, 2.4, 0); canopy.rotation.z = -0.08;
  const stove = mesh(context, workBay, 'masonry-kettle-stove', box(0.95, 0.68, 0.92), context.materials.stone, 'cooking-station'); stove.position.set(2.02, 0.43, 0.2);
  const stoveDoor = mesh(context, workBay, 'closed-stove-firebox-door', box(0.42, 0.32, 0.07), context.materials.iron, 'cooking-station', 'surface-pass'); stoveDoor.position.set(2.02, 0.38, 0.68);
  const kettle = mesh(context, workBay, 'empty-cooking-kettle', new THREE.CylinderGeometry(0.5, 0.38, 0.42, 10, 1, true), context.materials.iron, 'cooking-kettle', 'form-refinement'); kettle.position.set(2.02, 0.9, 0.2);
  const kettleRim = mesh(context, workBay, 'cooking-kettle-rim', new THREE.TorusGeometry(0.5, 0.045, 5, 10), context.materials.iron, 'cooking-kettle', 'surface-pass'); kettleRim.position.set(2.02, 1.11, 0.2); kettleRim.rotation.x = Math.PI / 2;
  addCollider(context, workBay, 'cooking-station', 'box', [2.02, 0.65, 0.2], { width: 1.12, height: 1.3, depth: 1.08, isTrigger: false });

  const stir = addPivot(context, model, 'kettle-stir-shaft', [2.02, 1.1, 0.2]);
  const shaft = mesh(context, stir, 'central-stir-shaft', new THREE.CylinderGeometry(0.045, 0.045, 1.05, 8), context.materials.iron, 'stir-assembly', 'interaction-pass'); shaft.position.y = 0.4;
  const crank = mesh(context, stir, 'stir-hand-crank', box(0.55, 0.07, 0.07), context.materials.iron, 'stir-assembly', 'interaction-pass'); crank.position.set(0.26, 0.9, 0);
  const grip = mesh(context, stir, 'stir-crank-grip', new THREE.CylinderGeometry(0.055, 0.055, 0.22, 8), context.materials.timber, 'stir-assembly', 'interaction-pass'); grip.position.set(0.53, 0.82, 0); grip.rotation.x = Math.PI / 2;
  addSocket(context, stir, 'stir-control', [0.54, 0.9, 0]); addChannel(context, stir, 'rotation', 'y', Math.PI * 2, 0.42, 0);

  const prepWash = addPivot(context, model, 'preparation-and-wash-station');
  const counter = mesh(context, prepWash, 'empty-preparation-counter', box(1.18, 0.12, 0.62), context.materials.galvanized, 'preparation-station', 'form-refinement'); counter.position.set(2.0, 0.9, -0.78);
  for (const x of [1.55, 2.45]) { const leg = mesh(context, prepWash, `counter-leg-${x}`, box(0.1, 0.78, 0.1), context.materials.iron, 'preparation-station', 'structural-pass'); leg.position.set(x, 0.48, -0.78); }
  const sink = mesh(context, prepWash, 'empty-wash-sink', box(0.62, 0.32, 0.52), context.materials.fixture, 'wash-station', 'form-refinement'); sink.position.set(2.12, 0.66, -1.38);
  const pipe = mesh(context, prepWash, 'wash-standpipe', new THREE.CylinderGeometry(0.05, 0.06, 0.72, 8), context.materials.fixture, 'wash-station', 'surface-pass'); pipe.position.set(2.12, 1.11, -1.45);
  for (let index = 0; index < 6; index += 1) { const bar = mesh(context, prepWash, `floor-drain-bar-${index + 1}`, box(0.5, 0.045, 0.05), context.materials.iron, 'wash-drain', 'surface-pass'); bar.position.set(1.35, 0.13, -1.48 + index * 0.07); }
  addCollider(context, prepWash, 'preparation-wash', 'box', [2, 0.65, -1.05], { width: 1.25, height: 1.2, depth: 1.35, isTrigger: false });

  const ventilation = addPivot(context, model, 'kettle-ventilation');
  const hood = mesh(context, ventilation, 'compact-kettle-hood', new THREE.CylinderGeometry(0.3, 0.72, 0.42, 4), context.materials.galvanized, 'ventilation-system', 'form-refinement'); hood.position.set(2.02, 2.05, 0.2); hood.rotation.y = Math.PI / 4;
  const chimney = mesh(context, ventilation, 'narrow-ventilation-chimney', box(0.34, 1.18, 0.34), context.materials.galvanized, 'ventilation-system', 'structural-pass'); chimney.position.set(2.02, 3.08, 0.2);
  const chimneyCap = mesh(context, ventilation, 'chimney-cap', box(0.48, 0.1, 0.48), context.materials.iron, 'ventilation-system', 'surface-pass'); chimneyCap.position.set(2.02, 3.72, 0.2);
  addCollider(context, ventilation, 'ventilation-system', 'box', [2.02, 2.85, 0.2], { width: 1.25, height: 1.85, depth: 1.1, isTrigger: false });

  const service = addPivot(context, model, 'service-and-utility-access');
  const door = mesh(context, service, 'timber-service-door', box(0.08, 1.52, 0.72), context.materials.timber, 'service-access', 'form-refinement'); door.position.set(-1.93, 1.05, -0.2);
  for (const y of [0.72, 1.4]) { const strap = mesh(context, service, `service-door-strap-${y}`, box(0.06, 0.08, 0.58), context.materials.iron, 'service-access', 'surface-pass'); strap.position.set(-1.98, y, -0.2); }
  const utility = mesh(context, service, 'fuel-power-service-box', box(0.44, 0.72, 0.22), context.materials.fixture, 'utility-service', 'form-refinement'); utility.position.set(-1.18, 1.02, -1.58);
  addCollider(context, service, 'service-door', 'box', [-1.95, 1.05, -0.2], { width: 0.18, height: 1.58, depth: 0.8, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 3.77, note: 'Lean stylized low-poly Preserve Kitchen reconstructed from the generated four-view concept sheet.', productContents: 'none', palette: ['warm stone', 'pale plaster', 'weathered timber', 'dark iron', 'dark galvanized', 'blue-grey fixtures'], motion: 'Only the visible kettle stir shaft and attached hand crank rotate. No food, liquid, flame, or smoke simulation is authored.' };
  root.userData.preserveKitchenRig = { shell, roof, receiving, product, workBay, stir, prepWash, ventilation, service }; root.userData.applyPassState = (nextPassId) => applyPreserveKitchenPassState(root, nextPassId); applyPreserveKitchenPassState(root, passId); return root;
}

export function applyPreserveKitchenPassState(root, passId = 'optimization-pass') {
  const selectedPass = PRESERVE_KITCHEN_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['preserve-kitchen-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'preserve-kitchen-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; }); return root;
}

export function animatePreserveKitchen(root, timeSeconds, intensity = 1) {
  const stir = root?.userData?.preserveKitchenRig?.stir; if (!stir) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  stir.rotation.y = time * 0.42 * Math.PI * 2 * Math.max(0, intensity); return root;
}
