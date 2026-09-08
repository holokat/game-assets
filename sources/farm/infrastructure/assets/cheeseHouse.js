import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const CHEESE_HOUSE_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(CHEESE_HOUSE_PASSES.map((id, index) => [id, index]));
function material(name, color, roughness, metalness = 0) { return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true }); }
function makeMaterials() { return {
  stone: material('cheese-house-warm-stone-mat', '#a69b84', 0.96), plaster: material('cheese-house-pale-plaster-mat', '#c8bea8', 0.95),
  timber: material('cheese-house-weathered-timber-mat', '#725037', 0.9), iron: material('cheese-house-dark-iron-mat', '#303638', 0.57, 0.5),
  galvanized: material('cheese-house-dark-galvanized-mat', '#687476', 0.68, 0.4), fixture: material('cheese-house-blue-grey-fixture-mat', '#607a7c', 0.81, 0.14),
}; }
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function xCylinder(radius, length, segments = 8) { const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false); geometry.rotateZ(Math.PI / 2); return geometry; }
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass); }

export function createCheeseHouse(options = {}) {
  const passId = CHEESE_HOUSE_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('cheese-house', { label: 'Cheese House', targetHeightMetres: 3.05, passId }); context.materials = makeMaterials(); const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'milk-input', [-0.88, 1.2, 1.82]); addSocket(context, model, 'curd-work', [2.05, 1.0, 0.18]);
  addSocket(context, model, 'product-output', [0.78, 1.06, 1.82]); addSocket(context, model, 'brine-input', [-1.4, 0.72, -1.65]);
  addSocket(context, model, 'water-input', [-1.15, 0.72, -1.65]); addSocket(context, model, 'wash-drain', [-0.5, 0.12, -1.72]);
  addSocket(context, model, 'power-input', [1.25, 1.2, -1.65]); addSocket(context, model, 'ventilation', [0, 1.82, -1.65]);
  addSocket(context, model, 'service', [-2.1, 1.0, -0.25]); addSocket(context, model, 'press-control', [2.46, 1.58, 0.2]);
  addSocket(context, model, 'roof-attachment', [0, 3.1, 0]); addSocket(context, model, 'side-attachment', [2.55, 1.3, 0]);
  addSocket(context, model, 'adjacency-left', [-2.55, 0.1, 0]); addSocket(context, model, 'adjacency-right', [2.65, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 2.05]); addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.0]);

  const shell = addPivot(context, model, 'stone-plaster-building-shell');
  const slab = mesh(context, shell, 'foundation-slab', box(4.05, 0.16, 3.25), context.materials.stone, 'building-foundation'); slab.position.y = 0.08;
  for (const [id, width, depth, x, z] of [['front', 3.9, 0.18, 0, 1.48], ['rear', 3.9, 0.18, 0, -1.48], ['left', 0.18, 2.78, -1.86, 0], ['right', 0.18, 2.78, 1.86, 0]]) {
    const lower = mesh(context, shell, `${id}-lower-stone-wall`, box(width, 1.28, depth), context.materials.stone, 'stone-walls'); lower.position.set(x, 0.8, z);
    const upper = mesh(context, shell, `${id}-upper-plaster-wall`, box(width, 1.12, depth), context.materials.plaster, 'plaster-walls', 'form-refinement'); upper.position.set(x, 2.0, z);
  }
  for (const [index, x] of [-1.55, -0.78, 0, 0.78, 1.55].entries()) { const joist = mesh(context, shell, `front-eave-joist-${index + 1}`, box(0.11, 0.18, 0.42), context.materials.timber, 'roof-structure', 'structural-pass'); joist.position.set(x, 2.64, 1.58); }
  addCollider(context, shell, 'building-shell', 'box', [0, 1.38, 0], { width: 4.05, height: 2.76, depth: 3.25, hollow: true, isTrigger: false });

  const roof = addPivot(context, model, 'modest-pitched-roof');
  for (const [id, x, rotationZ] of [['left', -1.02, 0.25], ['right', 1.02, -0.25]]) { const panel = mesh(context, roof, `${id}-roof-panel`, box(2.12, 0.11, 3.55), context.materials.galvanized, 'roof-panels', 'form-refinement'); panel.position.set(x, 2.84, 0); panel.rotation.z = rotationZ; }
  const ridge = mesh(context, roof, 'roof-ridge-cap', box(0.16, 0.12, 3.58), context.materials.iron, 'roof-panels', 'surface-pass'); ridge.position.y = 3.1;
  addCollider(context, roof, 'pitched-roof', 'box', [0, 2.9, 0], { width: 4.35, height: 0.5, depth: 3.6, isTrigger: false });

  const receiving = addPivot(context, model, 'milk-curd-receiving-hatch');
  const receiveRecess = mesh(context, receiving, 'receiving-dark-recess', box(1.02, 0.76, 0.08), context.materials.iron, 'receiving-hatch', 'structural-pass'); receiveRecess.position.set(-0.88, 1.25, 1.59);
  const receiveShutter = mesh(context, receiving, 'receiving-timber-shutter', box(0.9, 0.5, 0.08), context.materials.timber, 'receiving-hatch', 'form-refinement'); receiveShutter.position.set(-0.88, 0.89, 1.78); receiveShutter.rotation.x = -0.55;
  const receiveCover = mesh(context, receiving, 'receiving-covered-ledge', box(1.15, 0.08, 0.55), context.materials.galvanized, 'receiving-hatch', 'surface-pass'); receiveCover.position.set(-0.88, 1.74, 1.7); receiveCover.rotation.x = -0.14;
  addCollider(context, receiving, 'receiving-hatch', 'box', [-0.88, 1.28, 1.66], { width: 1.15, height: 1.02, depth: 0.55, isTrigger: false });

  const product = addPivot(context, model, 'product-output-shutter');
  const productRecess = mesh(context, product, 'product-output-recess', box(1.02, 0.76, 0.08), context.materials.iron, 'product-output', 'structural-pass'); productRecess.position.set(0.78, 1.24, 1.59);
  const shutter = mesh(context, product, 'product-output-timber-shutter', box(0.9, 0.56, 0.08), context.materials.timber, 'product-output', 'form-refinement'); shutter.position.set(0.78, 1.55, 1.7);
  for (const x of [0.48, 1.08]) { const strap = mesh(context, product, `product-shutter-strap-${x}`, box(0.32, 0.07, 0.05), context.materials.iron, 'product-output', 'surface-pass'); strap.position.set(x, 1.55, 1.76); }
  const outputTray = mesh(context, product, 'product-output-tray', box(1.05, 0.08, 0.52), context.materials.timber, 'product-output', 'surface-pass'); outputTray.position.set(0.78, 0.88, 1.8);
  addCollider(context, product, 'product-output', 'box', [0.78, 1.25, 1.68], { width: 1.15, height: 1, depth: 0.55, isTrigger: false });

  const press = addPivot(context, model, 'open-side-curd-press');
  for (const z of [-0.48, 0.48]) { const post = mesh(context, press, `press-post-${z}`, box(0.16, 1.65, 0.16), context.materials.timber, 'curd-press', 'structural-pass'); post.position.set(2.18, 1.05, z); }
  for (const y of [0.48, 1.72]) { const cross = mesh(context, press, `press-crossbeam-${y}`, box(0.18, 0.18, 1.12), context.materials.timber, 'curd-press', 'structural-pass'); cross.position.set(2.18, y, 0); }
  const platen = mesh(context, press, 'press-platen', box(0.38, 0.12, 0.72), context.materials.iron, 'curd-press', 'form-refinement'); platen.position.set(2.18, 1.1, 0);
  const screw = mesh(context, press, 'press-screw', new THREE.CylinderGeometry(0.065, 0.065, 1.05, 8), context.materials.iron, 'curd-press', 'form-refinement'); screw.position.set(2.18, 1.4, 0);
  const vat = mesh(context, press, 'empty-curd-work-vat', box(0.65, 0.35, 0.82), context.materials.fixture, 'curd-work-vat', 'form-refinement'); vat.position.set(2.18, 0.32, 0);
  const handwheel = addPivot(context, press, 'press-handwheel', [2.32, 1.58, 0.52]);
  const wheel = mesh(context, handwheel, 'press-handwheel-rim', new THREE.TorusGeometry(0.3, 0.04, 5, 10), context.materials.iron, 'press-handwheel', 'interaction-pass'); wheel.rotation.y = Math.PI / 2;
  for (const angle of [0, Math.PI / 2]) { const spoke = mesh(context, handwheel, `press-handwheel-spoke-${angle}`, box(0.05, 0.54, 0.05), context.materials.iron, 'press-handwheel', 'interaction-pass'); spoke.rotation.x = angle; }
  const coupling = mesh(context, handwheel, 'press-handwheel-coupling', xCylinder(0.08, 0.34, 8), context.materials.iron, 'press-handwheel', 'interaction-pass'); coupling.position.x = -0.16;
  addSocket(context, handwheel, 'handwheel-control', [0.08, 0, 0]); addChannel(context, handwheel, 'rotation', 'x', Math.PI * 2, 0.45, 0);
  addCollider(context, press, 'curd-press', 'box', [2.18, 1.02, 0], { width: 0.72, height: 1.9, depth: 1.28, isTrigger: false });

  const aging = addPivot(context, model, 'ventilated-aging-room');
  const darkOpening = mesh(context, aging, 'aging-room-dark-opening', box(1.65, 1.0, 0.07), context.materials.iron, 'aging-room', 'structural-pass'); darkOpening.position.set(0, 1.86, -1.59);
  for (let shelf = 0; shelf < 4; shelf += 1) { const rack = mesh(context, aging, `empty-aging-rack-shelf-${shelf + 1}`, box(1.42, 0.07, 0.12), context.materials.timber, 'empty-aging-racks', 'form-refinement'); rack.position.set(0, 1.5 + shelf * 0.24, -1.65); }
  for (let slat = 0; slat < 5; slat += 1) { const louver = mesh(context, aging, `aging-louver-${slat + 1}`, box(1.56, 0.07, 0.1), context.materials.timber, 'aging-louver', 'surface-pass'); louver.position.set(0, 1.42 + slat * 0.2, -1.75); louver.rotation.x = -0.2; }
  addCollider(context, aging, 'aging-louver', 'box', [0, 1.86, -1.67], { width: 1.72, height: 1.08, depth: 0.24, isTrigger: false });

  const utilities = addPivot(context, model, 'brine-wash-power-utilities');
  const basin = mesh(context, utilities, 'brine-wash-basin', box(0.68, 0.42, 0.52), context.materials.fixture, 'wash-utilities', 'form-refinement'); basin.position.set(-1.22, 0.42, -1.72);
  const pipe = mesh(context, utilities, 'wash-standpipe', new THREE.CylinderGeometry(0.055, 0.065, 0.78, 8), context.materials.fixture, 'wash-utilities', 'form-refinement'); pipe.position.set(-1.22, 0.92, -1.66);
  const power = mesh(context, utilities, 'power-service-box', box(0.42, 0.64, 0.18), context.materials.fixture, 'power-service', 'form-refinement'); power.position.set(1.25, 1.18, -1.64);
  for (let index = 0; index < 6; index += 1) { const drain = mesh(context, utilities, `wash-drain-bar-${index + 1}`, box(0.52, 0.05, 0.055), context.materials.iron, 'wash-drain', 'surface-pass'); drain.position.set(-0.5, 0.13, -1.78 + index * 0.075); }

  const service = addPivot(context, model, 'service-door');
  const door = mesh(context, service, 'timber-service-door', box(0.08, 1.5, 0.72), context.materials.timber, 'service-door', 'form-refinement'); door.position.set(-1.96, 1.05, -0.35);
  for (const y of [0.72, 1.38]) { const hinge = mesh(context, service, `service-door-hinge-${y}`, box(0.06, 0.08, 0.58), context.materials.iron, 'service-door', 'surface-pass'); hinge.position.set(-2.01, y, -0.35); }
  addCollider(context, service, 'service-door', 'box', [-1.98, 1.05, -0.35], { width: 0.18, height: 1.55, depth: 0.78, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 3.12, note: 'Compact lean stylized low-poly Cheese House reconstructed from the corrected four-view concept sheet.', agingRackContents: 'empty', palette: ['warm stone', 'pale plaster', 'weathered timber', 'dark iron', 'dark galvanized', 'blue-grey fixtures'], motion: 'Only the visible curd-press handwheel rotates. No food or liquid simulation is authored.' };
  root.userData.cheeseHouseRig = { shell, roof, receiving, product, press, handwheel, aging, utilities, service }; root.userData.applyPassState = (nextPassId) => applyCheeseHousePassState(root, nextPassId); applyCheeseHousePassState(root, passId); return root;
}

export function applyCheeseHousePassState(root, passId = 'optimization-pass') {
  const selectedPass = CHEESE_HOUSE_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['cheese-house-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'cheese-house-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; }); return root;
}

export function animateCheeseHouse(root, timeSeconds, intensity = 1) {
  const handwheel = root?.userData?.cheeseHouseRig?.handwheel; if (!handwheel) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  handwheel.rotation.x = time * 0.45 * Math.PI * 2 * Math.max(0, intensity); return root;
}
