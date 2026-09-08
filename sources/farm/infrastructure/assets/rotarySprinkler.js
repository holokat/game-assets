import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const ROTARY_SPRINKLER_PASSES = Object.freeze(['blockout', 'structure', 'material', 'interaction', 'optimization']);
const PASS_INDEX = new Map(ROTARY_SPRINKLER_PASSES.map((id, index) => [id, index]));
const atLeast = (passId, minimumPass) => (PASS_INDEX.get(passId) ?? 4) >= (PASS_INDEX.get(minimumPass) ?? 0);

function createMaterials() {
  const make = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
  return { base: make('rotary-sprinkler-stone-base-mat', '#9a9381', 0.78, 0.08), blue: make('rotary-sprinkler-blue-gray-metal-mat', '#4f6b71', 0.47, 0.5), iron: make('rotary-sprinkler-charcoal-metal-mat', '#414341', 0.5, 0.62), brass: make('rotary-sprinkler-brass-pivot-mat', '#937239', 0.42, 0.66), blockout: new THREE.MeshStandardMaterial({ name: 'rotary-sprinkler-blockout-mat', color: '#b4aaa0', roughness: 0.9, flatShading: true }) };
}
function mesh(context, parent, id, geometry, material, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group, minimumPass); }
function cylinder(context, parent, id, radiusTop, radiusBottom, height, segments, position, material, group, minimumPass = 'blockout') { const item = mesh(context, parent, id, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, group, minimumPass); item.position.set(...position); return item; }

function boltRing(context, parent, id, radius, y, count, material, group) {
  const pivot = addPivot(context, parent, id, [0, y, 0]); const bolts = new THREE.InstancedMesh(faceted(new THREE.CylinderGeometry(0.026, 0.03, 0.026, 6), `${context.id}:${id}`), material, count);
  bolts.name = `${context.id}-${id}-mesh`; bolts.castShadow = true; bolts.receiveShadow = true; bolts.userData.minimumPass = 'structure'; bolts.userData.destructionGroup = group;
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) { const angle = (index / count) * Math.PI * 2; matrix.makeTranslation(Math.sin(angle) * radius, 0, Math.cos(angle) * radius); bolts.setMatrixAt(index, matrix); }
  bolts.instanceMatrix.needsUpdate = true; pivot.add(bolts); context.nodes[bolts.name] = bolts; (context.destructionGroups[group] ??= []).push(bolts.name);
}

export function createRotarySprinkler(options = {}) {
  const passId = ROTARY_SPRINKLER_PASSES.includes(options.passId) ? options.passId : 'optimization';
  const context = createAssetContext('rotary-sprinkler', { label: 'Rotary Sprinkler', targetHeightMetres: 1.42, passId, scaleNote: 'Art-direction scale for a dry three-arm rotary field sprinkler.' }); context.materials = createMaterials(); const { model } = context;
  const visible = (node, minimumPass) => { node.visible = atLeast(passId, minimumPass); return node; };
  addSocket(context, model, 'ground', [0, 0, 0]);
  const base = addPivot(context, model, 'base-plate', [0, 0.06, 0]);
  mesh(context, base, 'base-plate', new THREE.CylinderGeometry(0.42, 0.44, 0.12, 10), context.materials.base, 'base');
  cylinder(context, base, 'base-bevel', 0.34, 0.4, 0.13, 10, [0, 0.125, 0], context.materials.base, 'base', 'structure');
  addCollider(context, base, 'base', 'cylinder', [0, 0, 0], { radius: 0.44, height: 0.25, isTrigger: false }); boltRing(context, base, 'base-bolts', 0.34, 0.135, 8, context.materials.iron, 'base');
  const inlet = addPivot(context, base, 'inlet-coupling', [0, 0.15, 0.39]);
  const inletPipe = cylinder(context, inlet, 'inlet-pipe', 0.1, 0.1, 0.21, 8, [0, 0, 0.09], context.materials.iron, 'inlet', 'structure'); inletPipe.rotation.x = Math.PI / 2;
  const inletRim = cylinder(context, inlet, 'inlet-rim', 0.13, 0.13, 0.07, 8, [0, 0, 0.205], context.materials.blue, 'inlet', 'material'); inletRim.rotation.x = Math.PI / 2;
  addSocket(context, inlet, 'water-inlet', [0, 0, 0.25]); addCollider(context, inlet, 'inlet', 'cylinder', [0, 0, 0.12], { radius: 0.13, height: 0.25, isTrigger: false });
  const riser = addPivot(context, model, 'riser', [0, 0.68, 0]); cylinder(context, riser, 'riser-column', 0.16, 0.2, 0.84, 8, [0, 0, 0], context.materials.blue, 'riser');
  cylinder(context, riser, 'riser-foot-collar', 0.235, 0.235, 0.09, 10, [0, -0.39, 0], context.materials.iron, 'riser', 'structure'); cylinder(context, riser, 'riser-top-collar', 0.21, 0.21, 0.1, 10, [0, 0.39, 0], context.materials.iron, 'riser', 'structure');
  addSocket(context, riser, 'head-mount', [0, 0.45, 0]); addCollider(context, riser, 'riser', 'cylinder', [0, 0, 0], { radius: 0.2, height: 0.84, isTrigger: false }); boltRing(context, riser, 'riser-bolts', 0.19, -0.34, 8, context.materials.iron, 'riser');
  const rotor = addPivot(context, model, 'rotary-head', [0, 1.15, 0]);
  visible(cylinder(context, rotor, 'bearing-lower', 0.24, 0.22, 0.12, 10, [0, -0.07, 0], context.materials.iron, 'rotary-head', 'structure'), 'structure');
  visible(cylinder(context, rotor, 'bearing-hub', 0.27, 0.25, 0.16, 10, [0, 0.05, 0], context.materials.iron, 'rotary-head', 'structure'), 'structure');
  visible(cylinder(context, rotor, 'bearing-cap', 0.08, 0.08, 0.055, 8, [0, 0.16, 0], context.materials.brass, 'rotary-head', 'material'), 'material');
  addSocket(context, rotor, 'head-center', [0, 0.05, 0]); addCollider(context, rotor, 'rotary-head', 'cylinder', [0, 0.05, 0], { radius: 0.27, height: 0.24, isTrigger: false });
  const armAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  armAngles.forEach((angle, index) => {
    const arm = addPivot(context, rotor, `arm-${index + 1}`, [0, 0.055, 0]); arm.rotation.y = angle;
    const tube = visible(cylinder(context, arm, `arm-${index + 1}-tube`, 0.052, 0.06, 0.66, 6, [0.41, 0, 0], context.materials.blue, 'rotary-arms', 'structure'), 'structure'); tube.rotation.z = -Math.PI / 2;
    const collar = visible(cylinder(context, arm, `arm-${index + 1}-collar`, 0.082, 0.082, 0.11, 8, [0.76, 0, 0], context.materials.iron, 'rotary-arms', 'material'), 'material'); collar.rotation.z = -Math.PI / 2;
    const nozzle = visible(cylinder(context, arm, `arm-${index + 1}-nozzle`, 0.07, 0.09, 0.12, 8, [0.87, 0, 0], context.materials.iron, 'rotary-arms', 'interaction'), 'interaction'); nozzle.rotation.z = -Math.PI / 2;
    addSocket(context, arm, `nozzle-${index + 1}`, [0.94, 0, 0]); addCollider(context, arm, `arm-${index + 1}`, 'capsule', [0.46, 0, 0], { radius: 0.09, height: 0.94, isTrigger: false });
  });
  addChannel(context, rotor, 'rotation', 'y', 1, 1.45, 0);
  const root = finishAsset(context); root.userData.artDirection = { heightMetres: 1.42, note: 'Stylized dry rotary sprinkler. Water spray, plumbing interior, pressure controls, and hidden bearing detail are not modeled.', palette: ['gray-beige base', 'blue-gray metal', 'charcoal metal', 'brass pivot'] }; root.userData.applyPassState = (nextPassId) => applyRotarySprinklerPassState(root, nextPassId); applyRotarySprinklerPassState(root, passId); return root;
}
export function applyRotarySprinklerPassState(root, passId = 'optimization') { const selectedPass = ROTARY_SPRINKLER_PASSES.includes(passId) ? passId : 'optimization'; root.userData.passId = selectedPass; if (!root.userData.blockoutMaterial) root.userData.blockoutMaterial = new THREE.MeshStandardMaterial({ name: 'rotary-sprinkler-blockout-mat', color: '#b4aaa0', roughness: 0.9, flatShading: true }); root.traverse((node) => { if (!node.isMesh && !node.isInstancedMesh) return; node.visible = atLeast(selectedPass, node.userData.minimumPass ?? 'blockout'); if (!node.userData.authoredMaterial) node.userData.authoredMaterial = node.material; node.material = selectedPass === 'blockout' ? root.userData.blockoutMaterial : node.userData.authoredMaterial; }); return root; }
export function animateRotarySprinkler(root, timeSeconds, intensity = 1) { const runtime = root?.userData?.sculptRuntime; if (!runtime) return root; const channel = runtime.animationChannels[0]; if (channel) channel.node[channel.property][channel.axis] = channel.baseValue + Math.max(0, intensity) * (Number.isFinite(timeSeconds) ? timeSeconds : 0) * channel.frequency; return root; }
