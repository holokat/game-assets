import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.68) => new THREE.MeshStandardMaterial({ name, color, roughness, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, mat, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), mat), group);
const box = (context, parent, id, size, position, mat, group) => { const item = mesh(context, parent, id, new THREE.BoxGeometry(...size), mat, group); item.position.set(...position); return item; };
const cylinder = (context, parent, id, radius, height, position, mat, group, segments = 10) => { const item = mesh(context, parent, id, new THREE.CylinderGeometry(radius, radius, height, segments), mat, group); item.position.set(...position); return item; };
const socketColliderSemantics = (context, model, sockets, colliders) => { sockets.forEach(([name, position]) => addSocket(context, model, name, position)); colliders.forEach(([name, position, size, trigger = false]) => addCollider(context, model, name, 'box', position, { width: size[0], height: size[1], depth: size[2], isTrigger: trigger })); };
const finish = (context, identity, camera) => { const root = finishAsset(context); root.userData.artDirection = { concept: `references/concepts/${context.id}.png`, identity, motion: 'Static asset. No animation channels are authored.', correctionPasses: 0 }; root.userData.qualityContract = { suitability: 'pass', triangleBudget: 5000, optimizedDrawRange: [4, 5], criticalFeatures: identity, reviewCamera: camera }; return root; };

export function createMachineShop() {
  const context = createAssetContext('machine-shop', { label: 'Machine Shop' }), { model } = context;
  const mats = {
    concrete: material('machine-shop-pale-concrete', '#8d8a81'),
    panel: material('machine-shop-cream-panels', '#c6bda8'),
    frame: material('machine-shop-charcoal-frame', '#394141'),
    glass: material('machine-shop-high-window-glass', '#718889', 0.38),
    machine: material('machine-shop-muted-teal-machine', '#426c68', 0.48),
  };
  const shop = addPivot(context, model, 'machine-shop-building');
  box(context, shop, 'grounded-concrete-slab', [5.2, 0.2, 4.2], [0, 0.1, 0], mats.concrete, 'base');
  box(context, shop, 'rear-wall', [4.65, 2.65, 0.16], [0, 1.48, -1.72], mats.panel, 'walls');
  box(context, shop, 'left-wall', [0.16, 2.65, 3.3], [-2.24, 1.48, -0.08], mats.panel, 'walls');
  box(context, shop, 'right-wall', [0.16, 2.65, 3.3], [2.24, 1.48, -0.08], mats.panel, 'walls');
  box(context, shop, 'front-left-bay', [0.9, 2.65, 0.16], [-1.78, 1.48, 1.58], mats.panel, 'walls');
  box(context, shop, 'front-door-pier', [0.62, 2.65, 0.16], [1.93, 1.48, 1.58], mats.panel, 'walls');
  for (const x of [-2.34, 2.34]) box(context, shop, `corner-frame-${x < 0 ? 'left' : 'right'}`, [0.18, 2.9, 0.18], [x, 1.55, 0], mats.frame, 'frame');
  box(context, shop, 'front-access-header', [3.1, 0.2, 0.22], [-0.18, 2.5, 1.58], mats.frame, 'frame');
  box(context, shop, 'narrow-personnel-door', [0.68, 1.82, 0.09], [1.63, 1.11, 1.69], mats.frame, 'doors');
  for (const x of [-1.38, 0.05]) box(context, shop, `high-window-${x < 0 ? 'left' : 'right'}`, [0.74, 0.38, 0.08], [x, 2.17, 1.69], mats.glass, 'windows');
  for (const z of [-0.83, 0.83]) { const roof = box(context, shop, `pitched-roof-${z < 0 ? 'rear' : 'front'}`, [5.05, 0.13, 1.9], [0, 3.02, z], mats.frame, 'roof'); roof.rotation.x = z < 0 ? 0.27 : -0.27; }
  box(context, shop, 'wall-vent', [0.08, 0.42, 0.5], [2.34, 2.08, -0.65], mats.frame, 'vent');
  const machine = addPivot(context, shop, 'interior-lathe');
  box(context, machine, 'lathe-base', [1.55, 0.46, 0.58], [-0.25, 0.43, 0.28], mats.machine, 'machine');
  box(context, machine, 'lathe-bed', [1.75, 0.18, 0.5], [-0.25, 0.78, 0.28], mats.frame, 'machine');
  box(context, machine, 'lathe-headstock', [0.48, 0.62, 0.58], [-0.87, 1.0, 0.28], mats.machine, 'machine');
  cylinder(context, machine, 'lathe-chuck', 0.2, 0.2, [-0.57, 1.05, 0.28], mats.frame, 'machine', 10).rotation.z = Math.PI / 2;
  socketColliderSemantics(context, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['vehicle-access', [-0.2, 0.1, 2.25]], ['personnel-door', [1.63, 0.2, 1.75]], ['machine-service', [-0.25, 0.8, 0.28]], ['power', [2.05, 0.45, -1.4]], ['output', [-1.5, 0.45, 0.8]], ['adjacency-left', [-2.8, 0.1, 0]], ['adjacency-right', [2.8, 0.1, 0]], ['adjacency-rear', [0, 0.1, -2.3]],
  ], [
    ['slab', [0, 0.1, 0], [5.2, 0.2, 4.2]], ['building', [0, 1.55, -0.08], [4.85, 3.1, 3.55]], ['lathe', [-0.25, 0.72, 0.28], [1.8, 1.2, 0.65]], ['access-bay', [-0.2, 1.25, 1.3], [3.0, 2.5, 0.75], true],
  ]);
  return finish(context, ['compact enclosed precision workshop', 'broad open access door', 'narrow personnel door and high windows', 'shallow pitched roof', 'restrained interior teal lathe'], [-8, 5.8, 8]);
}

export function createSawbench() {
  const context = createAssetContext('sawbench', { label: 'Sawbench' }), { model } = context;
  const mats = {
    timber: material('sawbench-worktop-timber', '#8b613c'),
    steel: material('sawbench-lean-steel-frame', '#74766f'),
    iron: material('sawbench-charcoal-guard', '#353d3d', 0.48),
    blade: material('sawbench-saw-blade', '#a7a49a', 0.35),
    motor: material('sawbench-muted-teal-motor', '#426b67', 0.46),
  };
  const bench = addPivot(context, model, 'guarded-sawbench');
  box(context, bench, 'long-narrow-work-surface', [3.7, 0.18, 1.12], [0, 1.05, 0], mats.timber, 'table');
  for (const [x, z] of [[-1.55, -0.4], [-1.55, 0.4], [1.55, -0.4], [1.55, 0.4]]) { box(context, bench, `slim-braced-leg-${x < 0 ? 'left' : 'right'}-${z < 0 ? 'rear' : 'front'}`, [0.16, 0.96, 0.16], [x, 0.53, z], mats.steel, 'frame'); box(context, bench, `foot-plate-${x < 0 ? 'left' : 'right'}-${z < 0 ? 'rear' : 'front'}`, [0.3, 0.08, 0.3], [x, 0.04, z], mats.iron, 'feet'); }
  for (const x of [-1.12, 1.12]) { const brace = box(context, bench, `diagonal-brace-${x < 0 ? 'left' : 'right'}`, [0.1, 0.82, 0.1], [x, 0.55, 0], mats.steel, 'frame'); brace.rotation.z = x < 0 ? -0.42 : 0.42; }
  const blade = cylinder(context, bench, 'visible-circular-saw-blade', 0.4, 0.09, [0.22, 1.28, 0], mats.blade, 'blade', 14); blade.rotation.x = Math.PI / 2;
  const guard = mesh(context, bench, 'rear-half-blade-guard', new THREE.CylinderGeometry(0.52, 0.52, 0.16, 10, 1, false, 0, Math.PI), mats.iron, 'guard'); guard.position.set(0.22, 1.31, -0.08); guard.rotation.x = Math.PI / 2;
  box(context, bench, 'fence-guide', [2.45, 0.14, 0.12], [-0.34, 1.19, -0.31], mats.steel, 'guide');
  const motor = cylinder(context, bench, 'teal-motor-housing', 0.32, 0.72, [-0.25, 0.55, 0], mats.motor, 'drive', 10); motor.rotation.z = Math.PI / 2;
  box(context, bench, 'belt-guard', [1.1, 0.55, 0.16], [0.42, 0.55, 0], mats.motor, 'drive');
  socketColliderSemantics(context, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['infeed', [-2.05, 1.12, 0]], ['outfeed', [2.05, 1.12, 0]], ['operator', [0, 0.2, 0.95]], ['motor-service', [-0.25, 0.55, -0.6]], ['blade-service', [0.22, 1.32, 0]], ['power', [-0.65, 0.3, -0.45]], ['adjacency-left', [-2.2, 0.1, 0]], ['adjacency-right', [2.2, 0.1, 0]],
  ], [
    ['bench', [0, 0.56, 0], [3.75, 1.12, 1.15]], ['blade', [0.22, 1.3, 0], [0.88, 0.72, 0.32]], ['drive', [0.1, 0.55, 0], [1.45, 0.65, 0.55]], ['operator-zone', [0, 0.8, 1.0], [2.4, 1.6, 0.9], true],
  ]);
  return finish(context, ['long narrow timber work surface', 'readable circular saw blade', 'charcoal half guard and fence guide', 'muted teal motor and belt guard', 'four slim braced legs with foot plates'], [-5.4, 3.4, 5.6]);
}

export function createSawmill() {
  const context = createAssetContext('sawmill', { label: 'Sawmill' }), { model } = context;
  const mats = {
    concrete: material('sawmill-pale-concrete', '#8e8a80'),
    timber: material('sawmill-shelter-timber', '#745036'),
    steel: material('sawmill-charcoal-steel', '#353e3e', 0.5),
    blade: material('sawmill-saw-blade', '#a39f94', 0.36),
    motor: material('sawmill-muted-teal-drive', '#426d68', 0.46),
  };
  const mill = addPivot(context, model, 'open-sided-sawmill');
  box(context, mill, 'grounded-concrete-strip', [7.2, 0.2, 3.9], [0, 0.1, 0], mats.concrete, 'base');
  for (const x of [-3, 0, 3]) for (const z of [-1.35, 1.35]) box(context, mill, `slim-shelter-post-${x}-${z}`, [0.18, 2.65, 0.18], [x, 1.43, z], mats.timber, 'frame');
  for (const x of [-2.65, 2.65]) for (const z of [-1.35, 1.35]) { const brace = box(context, mill, `shelter-brace-${x}-${z}`, [0.12, 0.78, 0.12], [x, 2.08, z], mats.timber, 'frame'); brace.rotation.z = x < 0 ? -0.6 : 0.6; }
  for (const z of [-0.7, 0.7]) { const roof = box(context, mill, `shallow-metal-roof-${z < 0 ? 'rear' : 'front'}`, [7.0, 0.13, 1.65], [0, 3.0, z], mats.steel, 'roof'); roof.rotation.x = z < 0 ? 0.24 : -0.24; }
  box(context, mill, 'long-log-carriage-bed', [6.5, 0.28, 0.72], [0, 0.72, 0], mats.steel, 'carriage');
  for (const x of [-2.85, -2.15, -1.45, -0.75, 0.75, 1.45, 2.15, 2.85]) { const roller = cylinder(context, mill, `carriage-roller-${String(x).replace('.', '-')}`, 0.12, 0.62, [x, 0.91, 0], mats.blade, 'rollers', 8); roller.rotation.x = Math.PI / 2; }
  box(context, mill, 'vertical-saw-column-left', [0.2, 1.65, 0.28], [-0.38, 1.6, 0], mats.motor, 'saw-station');
  box(context, mill, 'vertical-saw-column-right', [0.2, 1.65, 0.28], [0.38, 1.6, 0], mats.motor, 'saw-station');
  box(context, mill, 'guarded-saw-head', [1.08, 0.6, 0.4], [0, 2.45, 0], mats.motor, 'saw-station');
  const blade = cylinder(context, mill, 'readable-vertical-saw-wheel', 0.34, 0.1, [0, 1.65, 0.05], mats.blade, 'blade', 14); blade.rotation.x = Math.PI / 2;
  const drive = cylinder(context, mill, 'teal-drive-motor', 0.38, 0.72, [1.25, 0.62, -0.62], mats.motor, 'drive', 10); drive.rotation.z = Math.PI / 2;
  box(context, mill, 'belt-housing', [0.36, 1.25, 0.24], [0.62, 1.16, -0.3], mats.motor, 'drive');
  socketColliderSemantics(context, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['infeed', [-3.65, 0.9, 0]], ['outfeed', [3.65, 0.9, 0]], ['carriage', [0, 0.9, 0]], ['saw-service', [0, 1.5, 0.75]], ['motor-service', [1.25, 0.62, -0.9]], ['power', [1.65, 0.3, -1.2]], ['adjacency-front', [0, 0.1, 2.2]], ['adjacency-rear', [0, 0.1, -2.2]],
  ], [
    ['slab', [0, 0.1, 0], [7.2, 0.2, 3.9]], ['shelter', [0, 1.55, 0], [7.0, 3.1, 3.2]], ['carriage', [0, 0.76, 0], [6.5, 0.45, 0.82]], ['saw-station', [0, 1.65, 0], [1.25, 2.2, 0.75]], ['work-zone', [0, 1.0, 0], [6.7, 2.0, 1.7], true],
  ]);
  return finish(context, ['lean open-sided timber shelter', 'long narrow log carriage and rollers', 'guarded vertical saw station', 'muted teal motor and belt housing', 'compact farm-scale proportions'], [-10, 6.2, 10]);
}
