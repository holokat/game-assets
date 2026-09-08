import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = .75, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (c, p, id, geometry, surface, group) => registerMesh(c, p, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), surface), group);
const box = (c, p, id, size, position, surface, group) => { const q = mesh(c, p, id, new THREE.BoxGeometry(...size), surface, group); q.position.set(...position); return q; };
function beam(c, p, id, a, b, width, surface, group) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), delta = B.clone().sub(A), q = box(c, p, id, [width, delta.length(), width], A.clone().add(B).multiplyScalar(.5).toArray(), surface, group); q.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return q; }
function finalize(c, identity, camera) { const root = finishAsset(c); root.userData.artDirection = { concept: `references/concepts/${c.id}.png`, identity, motion: 'Static asset. No animation channels are authored.', correctionPasses: 0 }; root.userData.qualityContract = { suitability: 'pass', triangleBudget: 5000, optimizedDrawRange: [4, 6], criticalFeatures: identity, reviewCamera: camera }; return root; }
function commonSockets(c, model, extentX, extentZ, extras) { for (const [id, position] of [['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['adjacency-left', [-extentX, 0, 0]], ['adjacency-right', [extentX, 0, 0]], ['adjacency-front', [0, 0, extentZ]], ['adjacency-rear', [0, 0, -extentZ]], ...extras]) addSocket(c, model, id, position); }

export function createWagonDepot() {
  const c = createAssetContext('wagon-depot', { label: 'Wagon Depot', targetHeightMetres: 3.6 }); const { model } = c;
  const m = { timber: material('wagon-depot-warm-timber', '#80552e'), roof: material('wagon-depot-dark-roof', '#485054', .55, .22), stone: material('wagon-depot-stone-footings', '#887d6c'), iron: material('wagon-depot-dark-iron', '#3a3d38', .55, .2), floor: material('wagon-depot-plank-floor', '#a5794b') };
  const shell = addPivot(c, model, 'open-front-shed'); const work = addPivot(c, shell, 'wagon-work-area');
  box(c, shell, 'stone-foundation', [6, .22, 5], [0, .11, 0], m.stone, 'foundation'); box(c, shell, 'wide-plank-floor', [5.7, .08, 4.7], [0, .26, 0], m.floor, 'foundation');
  box(c, shell, 'rear-timber-wall', [5.7, 2.35, .14], [0, 1.45, -2.25], m.timber, 'shed-shell');
  for (const x of [-2.75, 2.75]) { for (const z of [-2.25, 2.25]) box(c, shell, `timber-post-${x}-${z}`, [.2, 3.05, .2], [x, 1.72, z], m.timber, 'frame'); }
  box(c, shell, 'front-header', [5.82, .2, .2], [0, 3.12, 2.25], m.timber, 'frame'); box(c, shell, 'rear-header', [5.82, .2, .2], [0, 3.12, -2.25], m.timber, 'frame');
  for (const x of [-2.75, 0, 2.75]) { beam(c, shell, `gable-rafter-left-${x}`, [x, 3.12, -2.35], [x, 3.66, 0], .15, m.timber, 'roof-frame'); beam(c, shell, `gable-rafter-right-${x}`, [x, 3.66, 0], [x, 3.12, 2.35], .15, m.timber, 'roof-frame'); }
  const a = box(c, shell, 'left-roof-plane', [6.15, .12, 2.7], [0, 3.38, -1.18], m.roof, 'roof'); a.rotation.x = -.23; const b = box(c, shell, 'right-roof-plane', [6.15, .12, 2.7], [0, 3.38, 1.18], m.roof, 'roof'); b.rotation.x = .23;
  box(c, work, 'hitching-rail', [3.35, .13, .13], [0, 1.1, 1.65], m.timber, 'hitching-rail'); for (const x of [-1.5, 0, 1.5]) box(c, work, `hitching-post-${x}`, [.12, 1.05, .12], [x, .65, 1.65], m.timber, 'hitching-rail');
  for (const x of [-1.25, 1.25]) box(c, work, `chassis-support-rail-${x < 0 ? 'left' : 'right'}`, [.22, .38, 2.1], [x, .52, -.35], m.iron, 'chassis-work-area');
  box(c, work, 'wheel-work-bench', [1.45, .14, .6], [-1.8, 1.05, -1.58], m.timber, 'wheel-work-area'); for (const x of [-2.35, -1.25]) box(c, work, `bench-leg-${x}`, [.12, .9, .12], [x, .55, -1.58], m.iron, 'wheel-work-area');
  commonSockets(c, model, 3.2, 2.7, [['wagon-entry', [0, .28, 2.65]], ['hitching-rail', [0, 1.1, 1.65]], ['chassis-work', [0, .55, -.35]], ['maintenance', [-1.8, 1.05, -1.58]], ['vehicle-bay', [0, .28, 0]]]);
  addCollider(c, shell, 'foundation', 'box', [0, .12, 0], { width: 6, height: .24, depth: 5, isTrigger: false }); addCollider(c, shell, 'rear-wall', 'box', [0, 1.45, -2.25], { width: 5.7, height: 2.35, depth: .16, isTrigger: false }); addCollider(c, shell, 'wagon-bay', 'box', [0, 1.5, .15], { width: 5.3, height: 2.5, depth: 4.1, isTrigger: true }); addCollider(c, work, 'hitching-rail', 'box', [0, 1.1, 1.65], { width: 3.35, height: .18, depth: .18, isTrigger: false });
  return finalize(c, ['broad empty wagon bay', 'open-front timber structure', 'hitching rail', 'wheel and chassis work area', 'no wagon included'], [-8.2, 5.4, 8.6]);
}

export function createTruckDepot() {
  const c = createAssetContext('truck-depot', { label: 'Truck Depot', targetHeightMetres: 5.2 }); const { model } = c;
  const m = { concrete: material('truck-depot-hardstand-concrete', '#777a76'), wall: material('truck-depot-muted-metal-wall', '#5e6467', .62, .15), roof: material('truck-depot-charcoal-roof', '#3a4146', .52, .24), cabinet: material('truck-depot-service-cabinet', '#7f8f87', .55, .18), safety: material('truck-depot-safety-bollards', '#c39343') };
  const shell = addPivot(c, model, 'tall-service-shed'); const service = addPivot(c, shell, 'fuel-service-cabinet');
  box(c, shell, 'wide-hardstand', [8, .18, 6.3], [0, .09, 0], m.concrete, 'hardstand'); box(c, shell, 'rear-metal-wall', [7.4, 4.2, .18], [0, 2.25, -2.75], m.wall, 'shed-shell'); box(c, shell, 'left-metal-wall', [.18, 4.2, 5.5], [-3.7, 2.25, 0], m.wall, 'shed-shell');
  for (const x of [-3.7, 3.7]) for (const z of [-2.75, 2.75]) box(c, shell, `tall-frame-post-${x}-${z}`, [.22, 4.85, .22], [x, 2.52, z], m.roof, 'frame');
  box(c, shell, 'front-tall-header', [7.65, .25, .24], [0, 4.75, 2.75], m.roof, 'frame'); box(c, shell, 'rear-tall-header', [7.65, .25, .24], [0, 4.75, -2.75], m.roof, 'frame');
  const roof = box(c, shell, 'wide-shed-roof', [8, .18, 6.1], [0, 5.05, 0], m.roof, 'roof'); roof.rotation.x = -.07;
  box(c, service, 'fuel-service-cabinet', [1.05, 1.7, .65], [-2.85, .94, 1.9], m.cabinet, 'service-cabinet'); box(c, service, 'cabinet-top-cap', [1.16, .12, .76], [-2.85, 1.84, 1.9], m.roof, 'service-cabinet');
  for (const x of [-3.45, -2.25]) box(c, service, `safety-bollard-${x}`, [.16, .85, .16], [x, .52, 2.42], m.safety, 'service-safety');
  box(c, shell, 'service-drain-strip', [4.3, .025, .22], [.55, .2, .25], m.roof, 'hardstand');
  commonSockets(c, model, 4.2, 3.35, [['truck-entry', [0, .22, 3.3]], ['service-cabinet', [-2.85, 1.0, 1.9]], ['fuel-service', [-2.85, .22, 2.45]], ['vehicle-bay', [.5, .22, .1]], ['hardstand', [0, .18, 0]], ['maintenance', [1.1, .22, -.3]]]);
  addCollider(c, shell, 'hardstand', 'box', [0, .1, 0], { width: 8, height: .2, depth: 6.3, isTrigger: false }); addCollider(c, shell, 'rear-wall', 'box', [0, 2.25, -2.75], { width: 7.4, height: 4.2, depth: .2, isTrigger: false }); addCollider(c, shell, 'truck-bay', 'box', [.5, 2.15, .05], { width: 6.5, height: 4.1, depth: 5.1, isTrigger: true }); addCollider(c, service, 'cabinet', 'box', [-2.85, .94, 1.9], { width: 1.1, height: 1.8, depth: .7, isTrigger: false });
  return finalize(c, ['tall empty truck service bay', 'larger practical shed', 'hardstand', 'fuel and service cabinet', 'no truck included'], [-10.5, 7.0, 10.8]);
}

export function createLoadingDock() {
  const c = createAssetContext('loading-dock', { label: 'Loading Dock', targetHeightMetres: 2.9 }); const { model } = c;
  const m = { stone: material('loading-dock-stone-base', '#80796c'), timber: material('loading-dock-timber-platform', '#8b6138'), metal: material('loading-dock-metal-bumpers', '#454b4b', .5, .22), roof: material('loading-dock-canopy-roof', '#555a56', .55, .18), rail: material('loading-dock-ramp-rails', '#67462b') };
  const dock = addPivot(c, model, 'raised-dock'); const canopy = addPivot(c, dock, 'dock-canopy');
  box(c, dock, 'stone-raised-base', [5.8, .8, 2.35], [0, .4, -.45], m.stone, 'foundation'); box(c, dock, 'timber-transfer-platform', [5.7, .2, 2.55], [0, .9, -.25], m.timber, 'platform');
  const ramp = box(c, dock, 'timber-access-ramp', [2.05, .18, 2.65], [-1.5, .52, 2.22], m.timber, 'ramp'); ramp.rotation.x = -.31;
  for (const x of [-2.05, 2.05]) box(c, dock, `transfer-bumper-${x < 0 ? 'left' : 'right'}`, [.42, .5, .3], [x, 1.16, -1.55], m.metal, 'transfer-face');
  for (const x of [-2.45, 2.45]) { box(c, canopy, `canopy-post-${x}`, [.16, 2.1, .16], [x, 1.95, .35], m.timber, 'canopy'); beam(c, canopy, `canopy-brace-${x}`, [x, 2.6, .35], [x * .8, 1.9, .35], .12, m.rail, 'canopy'); }
  box(c, canopy, 'sloped-loading-canopy', [5.5, .16, 1.85], [0, 3.0, .3], m.roof, 'canopy'); box(c, dock, 'warehouse-attachment-rail', [5.6, .14, .14], [0, 1.05, -1.55], m.rail, 'transfer-face');
  commonSockets(c, model, 3.1, 3.7, [['warehouse-attachment', [0, 1.05, -1.65]], ['transport-transfer', [0, 1.05, -1.7]], ['truck-transfer-face', [0, 1.05, -1.8]], ['cart-transfer-face', [0, 1.05, -1.8]], ['ramp-entry', [-1.5, 0, 3.45]], ['platform', [0, 1.0, -.25]], ['canopy-attachment', [0, 2.95, .3]]]);
  addCollider(c, dock, 'stone-base', 'box', [0, .4, -.45], { width: 5.8, height: .8, depth: 2.35, isTrigger: false }); addCollider(c, dock, 'transfer-platform', 'box', [0, .9, -.25], { width: 5.7, height: .2, depth: 2.55, isTrigger: false }); addCollider(c, dock, 'ramp', 'box', [-1.5, .46, 2.22], { width: 2.05, height: .3, depth: 2.65, isTrigger: false }); addCollider(c, dock, 'transfer-zone', 'box', [0, 1.25, -1.75], { width: 5.2, height: .8, depth: .65, isTrigger: true });
  return finalize(c, ['raised timber and stone platform', 'clear access ramp', 'two transfer bumpers', 'compact canopy', 'warehouse and transport attachment faces'], [-8.2, 5.3, 8.5]);
}
