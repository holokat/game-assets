import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const MILLSTONE_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(MILLSTONE_PASSES.map((id, index) => [id, index]));
function material(name, color, roughness, metalness = 0) { return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true }); }
function makeMaterials() {
  return {
    stone: material('millstone-warm-faceted-stone-mat', '#aaa291', 0.96),
    timber: material('millstone-restrained-timber-mat', '#725036', 0.9),
    galvanized: material('millstone-pale-galvanized-mat', '#949b96', 0.7, 0.38),
    iron: material('millstone-dark-iron-mat', '#33383a', 0.57, 0.48),
    cream: material('millstone-muted-cream-tray-mat', '#c7b894', 0.88),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass); }
function addBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5)); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return beam;
}
function addRoofPanel(context, parent, id, x, rotationZ) {
  const panel = mesh(context, parent, id, box(1.58, 0.075, 2.32), context.materials.galvanized, 'weather-cover', 'form-refinement'); panel.position.set(x, 2.32, 0); panel.rotation.z = rotationZ;
  for (const z of [-0.9, -0.3, 0.3, 0.9]) {
    const rib = mesh(context, parent, `${id}-rib-${z}`, box(1.5, 0.045, 0.035), context.materials.iron, 'weather-cover-ribs', 'surface-pass'); rib.position.set(x, 2.36, z); rib.rotation.z = rotationZ;
  }
}

export function createMillstone(options = {}) {
  const passId = MILLSTONE_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('millstone', { label: 'Millstone', targetHeightMetres: 2.4, passId }); context.materials = makeMaterials(); const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'grain-input', [0, 1.9, 0]); addSocket(context, model, 'flour-output', [0, 0.46, 1.35]);
  addSocket(context, model, 'drive', [-1.45, 1.07, 0]); addSocket(context, model, 'service', [1.45, 0.65, 0.3]);
  addSocket(context, model, 'canopy-attachment', [0, 2.48, 0]); addSocket(context, model, 'rear-attachment', [0, 0.9, -1.18]);
  addSocket(context, model, 'adjacency-left', [-1.72, 0.1, 0]); addSocket(context, model, 'adjacency-right', [1.72, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 1.5]); addSocket(context, model, 'adjacency-rear', [0, 0.1, -1.5]);

  const support = addPivot(context, model, 'timber-stone-support');
  for (const [index, [x, z]] of [[-1.3, -0.82], [1.3, -0.82], [-1.3, 0.82], [1.3, 0.82]].entries()) {
    const foot = mesh(context, support, `stone-foot-${index + 1}`, box(0.32, 0.2, 0.32), context.materials.stone, 'stone-feet'); foot.position.set(x, 0.1, z);
    const post = mesh(context, support, `canopy-post-${index + 1}`, box(0.13, 2.08, 0.13), context.materials.timber, 'canopy-frame', 'structural-pass'); post.position.set(x, 1.22, z);
  }
  for (const [id, width, depth, x, z] of [['front', 2.75, 0.15, 0, 0.82], ['rear', 2.75, 0.15, 0, -0.82], ['left', 0.15, 1.78, -1.3, 0], ['right', 0.15, 1.78, 1.3, 0]]) {
    const beam = mesh(context, support, `base-${id}-beam`, box(width, 0.18, depth), context.materials.timber, 'support-frame', 'structural-pass'); beam.position.set(x, 0.35, z);
  }
  for (const [id, x] of [['left', -0.58], ['right', 0.58]]) {
    const bearer = mesh(context, support, `${id}-mill-bearer`, box(0.2, 0.28, 1.45), context.materials.timber, 'support-frame', 'structural-pass'); bearer.position.set(x, 0.48, 0);
  }
  for (const [id, x, z, endX, endZ] of [['front-left', -1.22, 0.76, -0.72, 0.22], ['front-right', 1.22, 0.76, 0.72, 0.22], ['rear-left', -1.22, -0.76, -0.72, -0.22], ['rear-right', 1.22, -0.76, 0.72, -0.22]]) addBeam(context, support, `brace-${id}`, [x, 0.28, z], [endX, 0.76, endZ], 0.11, 0.11, context.materials.timber, 'support-braces');
  addCollider(context, support, 'support-frame', 'box', [0, 0.46, 0], { width: 2.8, height: 0.92, depth: 1.9, isTrigger: false });

  const grindingBed = addPivot(context, model, 'fixed-grinding-bed');
  const lowerStone = mesh(context, grindingBed, 'lower-stone-disc', new THREE.CylinderGeometry(0.78, 0.78, 0.24, 12, 1, false), context.materials.stone, 'lower-millstone'); lowerStone.position.y = 0.74;
  const lowerBand = mesh(context, grindingBed, 'lower-stone-iron-band', new THREE.TorusGeometry(0.79, 0.025, 4, 12), context.materials.iron, 'millstone-hardware', 'structural-pass'); lowerBand.position.y = 0.78; lowerBand.rotation.x = Math.PI / 2;
  addCollider(context, grindingBed, 'lower-millstone', 'cylinder', [0, 0.74, 0], { radius: 0.8, height: 0.24, axis: 'y', isTrigger: false });

  const runner = addPivot(context, model, 'rotating-upper-millstone', [0, 0.98, 0]);
  const upperStone = mesh(context, runner, 'upper-stone-disc', new THREE.CylinderGeometry(0.76, 0.79, 0.24, 12, 1, false), context.materials.stone, 'upper-millstone');
  const spindle = mesh(context, runner, 'central-spindle', new THREE.CylinderGeometry(0.075, 0.075, 0.82, 8), context.materials.iron, 'drive-hardware', 'structural-pass'); spindle.position.y = 0.38;
  const hub = mesh(context, runner, 'spindle-hub', new THREE.CylinderGeometry(0.16, 0.16, 0.14, 8), context.materials.iron, 'drive-hardware', 'form-refinement'); hub.position.y = 0.15;
  const driveArm = mesh(context, runner, 'horizontal-drive-arm', box(1.32, 0.1, 0.1), context.materials.iron, 'drive-hardware', 'interaction-pass'); driveArm.position.set(-0.72, 0.13, 0);
  const coupling = mesh(context, runner, 'drive-coupling', new THREE.CylinderGeometry(0.16, 0.13, 0.24, 8), context.materials.iron, 'drive-hardware', 'interaction-pass'); coupling.position.set(-1.4, 0.13, 0); coupling.rotation.z = Math.PI / 2;
  addSocket(context, runner, 'drive-coupling', [-1.52, 0.13, 0]); addChannel(context, runner, 'rotation', 'y', Math.PI * 2, 0.34, 0);
  addCollider(context, runner, 'upper-millstone', 'cylinder', [0, 0, 0], { radius: 0.8, height: 0.24, axis: 'y', isTrigger: false });
  addCollider(context, runner, 'drive-arm', 'capsule-chain', [-0.72, 0.13, 0], { radius: 0.13, height: 1.52, axis: 'x', isTrigger: false });

  const feed = addPivot(context, model, 'fixed-grain-hopper');
  const throat = mesh(context, feed, 'hopper-throat', new THREE.CylinderGeometry(0.1, 0.12, 0.28, 8), context.materials.iron, 'grain-feed', 'structural-pass'); throat.position.y = 1.39;
  const hopper = mesh(context, feed, 'tapered-grain-hopper', new THREE.CylinderGeometry(0.42, 0.15, 0.5, 4, 1, false), context.materials.timber, 'grain-feed', 'form-refinement'); hopper.position.y = 1.71; hopper.rotation.y = Math.PI / 4;
  const rim = mesh(context, feed, 'hopper-rim', new THREE.TorusGeometry(0.43, 0.035, 4, 4), context.materials.iron, 'grain-feed', 'surface-pass'); rim.position.y = 1.96; rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI / 4;
  addCollider(context, feed, 'grain-hopper', 'box', [0, 1.7, 0], { width: 0.86, height: 0.78, depth: 0.86, isTrigger: false });

  const output = addPivot(context, model, 'flour-output-tray');
  const trayFloor = mesh(context, output, 'flour-tray-floor', box(0.72, 0.08, 0.82), context.materials.cream, 'flour-output', 'form-refinement'); trayFloor.position.set(0, 0.32, 1.08); trayFloor.rotation.x = -0.06;
  for (const [id, width, depth, x, z] of [['left', 0.08, 0.82, -0.36, 1.08], ['right', 0.08, 0.82, 0.36, 1.08], ['front', 0.72, 0.08, 0, 1.46]]) {
    const lip = mesh(context, output, `flour-tray-${id}-lip`, box(width, 0.16, depth), context.materials.cream, 'flour-output', 'surface-pass'); lip.position.set(x, 0.4, z);
  }
  addCollider(context, output, 'flour-output-tray', 'box', [0, 0.38, 1.08], { width: 0.82, height: 0.24, depth: 0.92, isTrigger: false });

  const canopy = addPivot(context, model, 'modest-weather-cover');
  for (const [id, x] of [['front', 0], ['rear', 0]]) { const z = id === 'front' ? 0.82 : -0.82; const tie = mesh(context, canopy, `${id}-roof-tie`, box(2.72, 0.13, 0.13), context.materials.timber, 'canopy-frame', 'structural-pass'); tie.position.set(x, 2.16, z); }
  addRoofPanel(context, canopy, 'left-roof-panel', -0.76, 0.21); addRoofPanel(context, canopy, 'right-roof-panel', 0.76, -0.21);
  addCollider(context, canopy, 'weather-cover', 'box', [0, 2.32, 0], { width: 3.1, height: 0.25, depth: 2.35, isTrigger: false });

  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 2.48, note: 'Lean stylized low-poly Millstone reconstructed from the generated four-view concept sheet.', millstoneDiscCount: 2, palette: ['warm faceted stone', 'restrained timber', 'pale galvanized', 'dark iron', 'muted cream'], motion: 'Only the upper millstone, spindle, and attached drive arm rotate together about the vertical grinding axis. No grain or flour particles are simulated.' };
  root.userData.millstoneRig = { support, grindingBed, runner, feed, output, canopy }; root.userData.applyPassState = (nextPassId) => applyMillstonePassState(root, nextPassId); applyMillstonePassState(root, passId); return root;
}

export function applyMillstonePassState(root, passId = 'optimization-pass') {
  const selectedPass = MILLSTONE_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['millstone-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'millstone-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true });
  root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; }); return root;
}

export function animateMillstone(root, timeSeconds, intensity = 1) {
  const runner = root?.userData?.millstoneRig?.runner; if (!runner) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  runner.rotation.y = time * 0.34 * Math.PI * 2 * Math.max(0, intensity); return root;
}
