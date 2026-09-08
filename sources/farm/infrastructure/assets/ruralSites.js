import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const M = (name, color, roughness = 0.7) => new THREE.MeshStandardMaterial({ name, color, roughness, flatShading: true, vertexColors: true });
const mesh = (c, p, id, geometry, mat, group) => registerMesh(c, p, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), mat), group);
const box = (c, p, id, size, position, mat, group) => { const n = mesh(c, p, id, new THREE.BoxGeometry(...size), mat, group); n.position.set(...position); return n; };
const cyl = (c, p, id, radius, height, position, mat, group, segments = 8) => { const n = mesh(c, p, id, new THREE.CylinderGeometry(radius, radius, height, segments), mat, group); n.position.set(...position); return n; };
const semantics = (c, model, sockets, colliders) => { sockets.forEach(([n, p]) => addSocket(c, model, n, p)); colliders.forEach(([n, p, s, trigger = false]) => addCollider(c, model, n, 'box', p, { width: s[0], height: s[1], depth: s[2], isTrigger: trigger })); };
const done = (c, critical, camera) => { const root = finishAsset(c); root.userData.artDirection = { concept: `references/concepts/${c.id}.png`, identity: critical, motion: 'Static asset. No animation channels are authored.', correctionPasses: 0 }; root.userData.qualityContract = { suitability: 'pass', triangleBudget: 5000, optimizedDrawRange: [4, 5], criticalFeatures: critical, reviewCamera: camera }; return root; };

export function createConstructionYard() {
  const c = createAssetContext('construction-yard', { label: 'Construction Yard' }), { model } = c, mats = {
    base: M('construction-yard-pale-packed-base', '#969086'), timber: M('construction-yard-secured-timber', '#855d39'), metal: M('construction-yard-charcoal-metal', '#3d4544', 0.52), panel: M('construction-yard-cream-office', '#c7bda8'), teal: M('construction-yard-muted-teal-door', '#426c68', 0.48),
  }, yard = addPivot(c, model, 'bounded-construction-yard');
  box(c, yard, 'grounded-yard-base', [7.2, 0.18, 6.2], [0, 0.09, 0], mats.base, 'base');
  const fenceRail = (id, size, pos) => box(c, yard, id, size, pos, mats.metal, 'fence');
  for (const x of [-3.35, -1.68, 1.68, 3.35]) { fenceRail(`front-fence-post-${x}`, [.14, 1.05, .14], [x, .61, 2.82]); if (Math.abs(x) > 2) for (const y of [.35, .65, .95]) fenceRail(`front-fence-rail-${x}-${y}`, [1.55, .1, .1], [x < 0 ? -2.55 : 2.55, y, 2.82]); }
  for (const x of [-3.35, 0, 3.35]) for (const z of [-2.82, 2.82]) if (z < 0) fenceRail(`rear-fence-post-${x}`, [.14, 1.05, .14], [x, .61, z]);
  for (const z of [-1.4, 0, 1.4]) for (const x of [-3.35, 3.35]) fenceRail(`side-fence-post-${x}-${z}`, [.14, 1.05, .14], [x, .61, z]);
  for (const y of [.35, .65, .95]) { fenceRail(`rear-fence-rail-${y}`, [6.7, .1, .1], [0, y, -2.82]); fenceRail(`left-fence-rail-${y}`, [.1, .1, 5.55], [-3.35, y, 0]); fenceRail(`right-fence-rail-${y}`, [.1, .1, 5.55], [3.35, y, 0]); }
  const office = addPivot(c, yard, 'site-office');
  box(c, office, 'small-cream-site-office', [2.25, 1.75, 1.65], [-2.0, 1.0, -1.72], mats.panel, 'office');
  box(c, office, 'site-office-dark-roof', [2.55, .16, 1.95], [-2.0, 1.95, -1.72], mats.metal, 'roof');
  box(c, office, 'site-office-teal-door', [.62, 1.38, .08], [-2.1, .91, -.86], mats.teal, 'office');
  box(c, office, 'site-office-window', [.56, .48, .08], [-1.33, 1.25, -.86], mats.metal, 'office');
  for (const x of [.45, 2.55]) for (const z of [-2.35, -1.1]) box(c, yard, `rack-post-${x}-${z}`, [.13, 1.45, .13], [x, .82, z], mats.metal, 'racks');
  for (const z of [-2.35, -1.1]) for (const y of [.45, 1.2]) box(c, yard, `rack-rail-${z}-${y}`, [2.25, .12, .12], [1.5, y, z], mats.metal, 'racks');
  for (const y of [.67, .86, 1.05]) box(c, yard, `secured-timber-beam-${y}`, [1.9, .12, .22], [1.5, y, -2.1], mats.timber, 'materials');
  for (const y of [.58, .78, .98]) { const pipe = cyl(c, yard, `secured-metal-pipe-${y}`, .08, 1.9, [1.5, y, -1.35], mats.metal, 'materials', 8); pipe.rotation.z = Math.PI / 2; }
  box(c, yard, 'clean-pallet-bay', [1.45, .18, 1.1], [1.9, .2, .85], mats.timber, 'pallet');
  for (const x of [1.4, 1.9, 2.4]) box(c, yard, `pallet-slat-${x}`, [.12, .1, 1.2], [x, .36, .85], mats.timber, 'pallet');
  semantics(c, model, [['ground', [0,0,0]], ['terrain', [0,0,0]], ['gate', [0, .1, 2.95]], ['loading', [0, .15, .65]], ['office', [-2, .9, -1.72]], ['material-rack', [1.5, .8, -1.72]], ['pallet', [1.9, .35, .85]], ['adjacency-left', [-3.8,.1,0]], ['adjacency-right', [3.8,.1,0]], ['adjacency-rear', [0,.1,-3.25]]], [['base',[0,.09,0],[7.2,.18,6.2]], ['yard',[0,.65,0],[6.9,1.25,5.8]], ['office',[-2,1,-1.72],[2.35,2,1.75]], ['racks',[1.5,.8,-1.72],[2.35,1.6,1.7]], ['loading-zone',[0,.6,.75],[3.4,1.2,2.4],true]]);
  return done(c, ['bounded yard with broad open gate', 'small cream site office', 'secured timber and pipe racks', 'clean pallet bay', 'empty loading area'], [-10, 7.4, 10]);
}

export function createFarmhouse() {
  const c = createAssetContext('farmhouse', { label: 'Farmhouse' }), { model } = c, mats = {
    stone: M('farmhouse-pale-stone-foundation', '#89847a'), plaster: M('farmhouse-cream-walls', '#cbbfa8'), timber: M('farmhouse-warm-timber-trim', '#765237'), roof: M('farmhouse-charcoal-roof-and-glass', '#343c3c', .5), teal: M('farmhouse-muted-teal-door', '#426b68', .48),
  }, house = addPivot(c, model, 'practical-farmhouse');
  box(c, house, 'grounded-stone-foundation', [5.4, .42, 4.35], [0, .21, 0], mats.stone, 'foundation');
  box(c, house, 'cream-main-house', [4.9, 2.85, 3.75], [0, 1.83, 0], mats.plaster, 'walls');
  for (const x of [-2.35, 2.35]) box(c, house, `corner-timber-${x < 0 ? 'left' : 'right'}`, [.16, 2.9, .16], [x, 1.85, 0], mats.timber, 'trim');
  for (const z of [-.96, .96]) { const roof = box(c, house, `pitched-roof-${z < 0 ? 'rear' : 'front'}`, [5.35, .16, 2.25], [0, 3.45, z], mats.roof, 'roof'); roof.rotation.x = z < 0 ? .46 : -.46; }
  box(c, house, 'narrow-chimney', [.48, 1.45, .48], [1.15, 3.65, -.45], mats.stone, 'chimney');
  box(c, house, 'front-porch-deck', [2.0, .18, 1.15], [-1.0, .55, 2.25], mats.stone, 'porch');
  for (const x of [-1.78, -.22]) box(c, house, `slim-porch-post-${x < -1 ? 'left' : 'right'}`, [.13, 1.75, .13], [x, 1.48, 2.67], mats.timber, 'porch');
  const porchRoof = box(c, house, 'small-porch-roof', [2.25, .14, 1.4], [-1.0, 2.35, 2.28], mats.roof, 'porch'); porchRoof.rotation.x = -.16;
  box(c, house, 'muted-teal-front-door', [.74, 1.72, .08], [-1.0, 1.42, 1.93], mats.teal, 'doors');
  for (const [id,x,y,z,ry] of [['front-left',-1.95,2.45,1.93,0],['front-right',.55,1.7,1.93,0],['side-left',-2.48,1.7,-.75,Math.PI/2],['side-right',2.48,1.7,.55,Math.PI/2]]) { const w=box(c,house,`modest-window-${id}`,[.65,.85,.08],[x,y,z],mats.roof,'windows'); w.rotation.y=ry; }
  box(c, house, 'rear-service-lean-to', [2.0, 1.65, 1.45], [1.25, 1.15, -2.25], mats.timber, 'service');
  const leanRoof=box(c,house,'rear-service-roof',[2.25,.14,1.65],[1.25,2.0,-2.25],mats.roof,'service');leanRoof.rotation.x=.18;
  semantics(c, model, [['ground',[0,0,0]],['terrain',[0,0,0]],['front-door',[-1,.55,2.45]],['porch',[-1,.65,2.3]],['rear-service',[1.25,.5,-2.7]],['utility',[2.1,.5,-1.65]],['residence',[0,1.5,0]],['adjacency-left',[-3,.1,0]],['adjacency-right',[3,.1,0]],['adjacency-rear',[0,.1,-3.2]]], [['foundation',[0,.21,0],[5.4,.42,4.35]],['house',[0,1.85,0],[5.0,3.7,3.85]],['porch',[-1,1.4,2.3],[2.25,2.2,1.45]],['service',[1.25,1.1,-2.25],[2.15,2.1,1.55]],['door-zone',[-1,1.2,2.45],[1.3,2.2,1.0],true]]);
  return done(c, ['modest one-and-a-half-storey residence', 'cream walls with timber trim', 'small front porch and teal door', 'four modest windows and narrow chimney', 'compact rear service lean-to'], [-8.5, 6.3, 8.5]);
}

export function createWorkerCabin() {
  const c = createAssetContext('worker-cabin', { label: 'Worker Cabin' }), { model } = c, mats = {
    foundation: M('worker-cabin-pale-foundation', '#8c877c'), timber: M('worker-cabin-warm-board-walls', '#805a3a'), roof: M('worker-cabin-charcoal-roof', '#343c3c', .5), trim: M('worker-cabin-pale-trim', '#b8aa90'), teal: M('worker-cabin-muted-teal-fixtures', '#426b68', .48),
  }, cabin = addPivot(c, model, 'durable-worker-cabin');
  box(c, cabin, 'grounded-cabin-foundation', [4.5, .34, 3.45], [0, .17, 0], mats.foundation, 'foundation');
  box(c, cabin, 'warm-timber-cabin-body', [4.1, 2.15, 3.05], [0, 1.42, 0], mats.timber, 'walls');
  for (const z of [-.8,.8]) { const roof=box(c,cabin,`shallow-pitched-roof-${z<0?'rear':'front'}`,[4.55,.15,1.8],[0,2.72,z],mats.roof,'roof');roof.rotation.x=z<0?.38:-.38; }
  box(c, cabin, 'covered-stoop-deck', [1.65, .16, .85], [-.72, .43, 1.92], mats.foundation, 'stoop');
  for (const x of [-1.35,-.08]) box(c,cabin,`slim-stoop-post-${x < -1 ? 'left':'right'}`,[.12,1.55,.12],[x,1.25,2.25],mats.trim,'stoop');
  const stoopRoof=box(c,cabin,'small-covered-stoop-roof',[1.85,.14,1.15],[-.72,2.02,1.91],mats.roof,'stoop');stoopRoof.rotation.x=-.14;
  box(c, cabin, 'muted-teal-front-door', [.72, 1.65, .08], [-.72, 1.26, 1.57], mats.teal, 'door');
  for (const [id,x,z,ry] of [['front',.82,1.57,0],['side',2.08,-.42,Math.PI/2]]) { const w=box(c,cabin,`modest-window-${id}`,[.65,.78,.08],[x,1.5,z],mats.trim,'windows');w.rotation.y=ry;box(c,cabin,`dark-window-inset-${id}`,[.48,.61,.085],[x,1.5,z],mats.roof,'windows').rotation.y=ry; }
  box(c, cabin, 'small-rear-vent', [.52,.38,.08], [.85,2.05,-1.57], mats.trim, 'utility');
  box(c, cabin, 'narrow-exterior-utility-box', [.34,.52,.2], [2.15,.85,.62], mats.teal, 'utility');
  box(c, cabin, 'utility-conduit', [.08,.7,.08], [2.15,.38,.62], mats.roof, 'utility');
  semantics(c, model, [['ground',[0,0,0]],['terrain',[0,0,0]],['front-door',[-.72,.45,1.95]],['stoop',[-.72,.5,1.95]],['utility',[2.15,.8,.62]],['rear-vent',[.85,2.05,-1.6]],['residence',[0,1.2,0]],['adjacency-left',[-2.6,.1,0]],['adjacency-right',[2.6,.1,0]],['adjacency-rear',[0,.1,-2.1]]], [['foundation',[0,.17,0],[4.5,.34,3.45]],['cabin',[0,1.4,0],[4.2,2.8,3.15]],['stoop',[-.72,1.15,1.95],[1.9,1.9,1.2]],['utility',[2.15,.65,.62],[.5,1.3,.45]],['door-zone',[-.72,1.05,1.95],[1.2,1.8,.8],true]]);
  return done(c, ['compact single-storey worker dwelling', 'warm timber board walls', 'small covered stoop and teal door', 'two modest windows and rear vent', 'narrow exterior utility box'], [-7, 4.8, 7]);
}
