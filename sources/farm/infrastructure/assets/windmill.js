import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const WINDMILL_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(WINDMILL_PASSES.map((id, index) => [id, index]));
function material(name, color, roughness, metalness = 0) { return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true }); }
function makeMaterials() {
  return {
    stone: material('windmill-warm-stone-mat', '#a69d89', 0.96),
    timber: material('windmill-weathered-timber-mat', '#735036', 0.9),
    galvanized: material('windmill-dark-galvanized-cap-mat', '#687375', 0.68, 0.4),
    iron: material('windmill-dark-iron-mat', '#303638', 0.56, 0.5),
    cream: material('windmill-muted-cream-output-mat', '#c4b58f', 0.88),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function zCylinder(radius, length, segments = 8) { const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false); geometry.rotateX(Math.PI / 2); return geometry; }
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass); }
function addBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5)); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return beam;
}
function addSail(context, hub, index, rotationZ) {
  const sail = addPivot(context, hub, `sail-${index}`, [0, 0, 0.05]); sail.rotation.z = rotationZ;
  const spar = mesh(context, sail, `sail-${index}-main-spar`, box(0.11, 1.5, 0.09), context.materials.timber, 'windmill-sails', 'structural-pass'); spar.position.y = 0.9;
  for (const x of [-0.2, 0.2]) { const rail = mesh(context, sail, `sail-${index}-lattice-rail-${x}`, box(0.05, 1.12, 0.055), context.materials.timber, 'windmill-sails', 'form-refinement'); rail.position.set(x, 1.08, 0.02); }
  for (let rung = 0; rung < 5; rung += 1) { const cross = mesh(context, sail, `sail-${index}-lattice-rung-${rung + 1}`, box(0.46, 0.045, 0.055), context.materials.timber, 'windmill-sails', 'surface-pass'); cross.position.set(0, 0.62 + rung * 0.23, 0.02); }
  const tip = mesh(context, sail, `sail-${index}-tip-cap`, box(0.48, 0.07, 0.08), context.materials.iron, 'sail-hardware', 'surface-pass'); tip.position.y = 1.67;
  return sail;
}

export function createWindmill(options = {}) {
  const passId = WINDMILL_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('windmill', { label: 'Windmill', targetHeightMetres: 4.25, passId }); context.materials = makeMaterials(); const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'grain-input', [1.25, 2.85, 0.18]); addSocket(context, model, 'flour-output', [0, 0.72, 1.25]);
  addSocket(context, model, 'drive', [0, 3.15, 1.25]); addSocket(context, model, 'service', [-1.1, 1.2, -0.05]);
  addSocket(context, model, 'cap-attachment', [0, 4.28, 0]); addSocket(context, model, 'rear-attachment', [0, 2.85, -1.0]);
  addSocket(context, model, 'adjacency-left', [-1.65, 0.1, 0]); addSocket(context, model, 'adjacency-right', [1.65, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 1.82]); addSocket(context, model, 'adjacency-rear', [0, 0.1, -1.45]);

  const tower = addPivot(context, model, 'tall-narrow-mill-tower');
  const footing = mesh(context, tower, 'faceted-stone-footing', new THREE.CylinderGeometry(1.15, 1.15, 0.2, 8), context.materials.stone, 'stone-tower'); footing.position.y = 0.1;
  const lowerBody = mesh(context, tower, 'tapered-lower-stone-body', new THREE.CylinderGeometry(0.84, 1.05, 2.38, 8), context.materials.stone, 'stone-tower'); lowerBody.position.y = 1.39;
  for (let index = 0; index < 8; index += 1) { const angle = index * Math.PI / 4; const buttress = mesh(context, tower, `footing-buttress-${index + 1}`, box(0.18, 0.54, 0.24), context.materials.stone, 'stone-buttresses', 'structural-pass'); buttress.position.set(Math.sin(angle) * 0.99, 0.29, Math.cos(angle) * 0.99); buttress.rotation.y = angle; buttress.rotation.x = index % 2 ? 0.08 : -0.08; }
  addCollider(context, tower, 'stone-tower', 'cylinder', [0, 1.35, 0], { radius: 1.08, height: 2.7, axis: 'y', isTrigger: false });

  const housing = addPivot(context, model, 'timber-mill-housing');
  const upperBody = mesh(context, housing, 'narrow-timber-upper-body', new THREE.CylinderGeometry(0.86, 0.88, 1.12, 8), context.materials.timber, 'timber-housing'); upperBody.position.y = 3.09;
  for (let index = 0; index < 8; index += 1) { const angle = index * Math.PI / 4; const batten = mesh(context, housing, `upper-body-batten-${index + 1}`, box(0.065, 0.98, 0.055), context.materials.iron, 'housing-straps', 'surface-pass'); batten.position.set(Math.sin(angle) * 0.87, 3.09, Math.cos(angle) * 0.87); batten.rotation.y = angle; }
  const waistBand = mesh(context, housing, 'housing-waist-band', new THREE.TorusGeometry(0.88, 0.045, 4, 8), context.materials.iron, 'housing-straps', 'structural-pass'); waistBand.position.y = 2.57; waistBand.rotation.x = Math.PI / 2;
  addCollider(context, housing, 'timber-housing', 'cylinder', [0, 3.09, 0], { radius: 0.9, height: 1.14, axis: 'y', isTrigger: false });

  const cap = addPivot(context, model, 'restrained-faceted-cap');
  const roof = mesh(context, cap, 'galvanized-cap-roof', new THREE.CylinderGeometry(0.18, 1.02, 0.62, 8), context.materials.galvanized, 'mill-cap', 'form-refinement'); roof.position.y = 3.96;
  const finial = mesh(context, cap, 'cap-finial', new THREE.CylinderGeometry(0.12, 0.16, 0.18, 6), context.materials.iron, 'mill-cap', 'surface-pass'); finial.position.y = 4.35;
  addCollider(context, cap, 'mill-cap', 'cone', [0, 3.96, 0], { radius: 1.03, height: 0.65, axis: 'y', isTrigger: false });

  const hub = addPivot(context, model, 'rotating-sail-hub', [0, 3.18, 0.92]);
  const axle = mesh(context, hub, 'horizontal-sail-axle', zCylinder(0.13, 0.62, 8), context.materials.iron, 'sail-hardware', 'structural-pass'); axle.position.z = 0.18;
  const hubDrum = mesh(context, hub, 'compact-sail-hub', zCylinder(0.28, 0.3, 10), context.materials.iron, 'sail-hardware', 'form-refinement'); hubDrum.position.z = 0.42;
  for (let index = 0; index < 4; index += 1) addSail(context, hub, index + 1, index * Math.PI / 2);
  addSocket(context, hub, 'sail-hub-service', [0, 0, 0.62]); addChannel(context, hub, 'rotation', 'z', Math.PI * 2, 0.18, 0);
  addCollider(context, hub, 'sail-assembly', 'capsule-chain', [0, 0, 0.45], { radius: 1.8, height: 0.38, axis: 'z', isTrigger: false });

  const loading = addPivot(context, model, 'grain-loading-access');
  const loadDoor = mesh(context, loading, 'raised-grain-loading-door', box(0.08, 0.56, 0.48), context.materials.timber, 'grain-loading', 'form-refinement'); loadDoor.position.set(0.88, 2.97, 0.18);
  const doorFrame = mesh(context, loading, 'grain-door-iron-frame', box(0.1, 0.68, 0.58), context.materials.iron, 'grain-loading', 'structural-pass'); doorFrame.position.set(0.84, 2.97, 0.18);
  const doorInset = mesh(context, loading, 'grain-door-timber-inset', box(0.065, 0.5, 0.42), context.materials.timber, 'grain-loading', 'form-refinement'); doorInset.position.set(0.9, 2.97, 0.18);
  addBeam(context, loading, 'grain-loading-chute-floor', [0.9, 2.75, 0.18], [1.35, 2.48, 0.18], 0.42, 0.08, context.materials.timber, 'grain-loading', 'structural-pass');
  for (const z of [-0.04, 0.4]) addBeam(context, loading, `grain-chute-side-${z}`, [0.93, 2.84, z], [1.38, 2.57, z], 0.08, 0.08, context.materials.iron, 'grain-loading', 'surface-pass');
  addCollider(context, loading, 'grain-loading-chute', 'box', [1.15, 2.7, 0.18], { width: 0.78, height: 0.55, depth: 0.58, isTrigger: false });

  const output = addPivot(context, model, 'flour-output-access');
  const outputFrame = mesh(context, output, 'flour-output-frame', box(0.72, 0.68, 0.1), context.materials.iron, 'flour-output', 'structural-pass'); outputFrame.position.set(0, 0.82, 0.98);
  const outputHatch = mesh(context, output, 'flour-output-hatch', box(0.58, 0.52, 0.08), context.materials.timber, 'flour-output', 'form-refinement'); outputHatch.position.set(0, 0.82, 1.04);
  const outputTray = mesh(context, output, 'flour-output-tray', box(0.72, 0.08, 0.52), context.materials.cream, 'flour-output', 'surface-pass'); outputTray.position.set(0, 0.48, 1.21); outputTray.rotation.x = -0.12;
  addCollider(context, output, 'flour-output', 'box', [0, 0.75, 1.05], { width: 0.78, height: 0.82, depth: 0.58, isTrigger: false });

  const service = addPivot(context, model, 'side-service-access');
  const serviceDoor = mesh(context, service, 'side-service-door', box(0.08, 1.15, 0.58), context.materials.timber, 'service-access', 'form-refinement'); serviceDoor.position.set(-0.94, 1.22, -0.05);
  for (const y of [0.92, 1.48]) { const strap = mesh(context, service, `service-door-strap-${y}`, box(0.06, 0.08, 0.52), context.materials.iron, 'service-access', 'surface-pass'); strap.position.set(-0.995, y, -0.05); }
  for (const [index, x] of [-0.26, 0.26].entries()) { const vent = mesh(context, service, `ventilation-slit-${index + 1}`, box(0.28, 0.34, 0.06), context.materials.iron, 'ventilation', 'surface-pass'); vent.position.set(x, 2.92, -0.88); }
  addCollider(context, service, 'service-door', 'box', [-0.95, 1.22, -0.05], { width: 0.18, height: 1.2, depth: 0.64, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 4.44, note: 'Tall narrow stylized low-poly Windmill reconstructed from the generated four-view concept sheet.', sailCount: 4, ventilationSlitCount: 2, palette: ['warm stone', 'weathered timber', 'dark galvanized cap', 'dark iron', 'muted cream'], motion: 'Only the four-sail hub assembly rotates about the front-facing axle. No grain or flour particles are simulated.' };
  root.userData.windmillRig = { tower, housing, cap, hub, loading, output, service }; root.userData.applyPassState = (nextPassId) => applyWindmillPassState(root, nextPassId); applyWindmillPassState(root, passId); return root;
}

export function applyWindmillPassState(root, passId = 'optimization-pass') {
  const selectedPass = WINDMILL_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['windmill-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'windmill-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; }); return root;
}

export function animateWindmill(root, timeSeconds, intensity = 1) {
  const hub = root?.userData?.windmillRig?.hub; if (!hub) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  hub.rotation.z = time * 0.18 * Math.PI * 2 * Math.max(0, intensity); return root;
}
