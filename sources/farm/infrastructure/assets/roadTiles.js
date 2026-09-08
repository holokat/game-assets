import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = .84) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0, flatShading: true, vertexColors: true });
const mesh = (context, parent, id, geometry, surface, group) => registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group);
const box = (context, parent, id, size, position, surface, group) => { const result = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group); result.position.set(...position); return result; };
const rock = (context, parent, id, position, scale, surface) => { const result = mesh(context, parent, id, new THREE.DodecahedronGeometry(1, 0), surface, 'surface-accents'); result.position.set(...position); result.scale.set(...scale); result.rotation.set(.2, .35, .1); return result; };

function addTileSemantics(context, model) {
  addPivot(context, model, 'road-bed');
  for (const [id, position] of [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]],
    ['road-front', [0, 0, 4]], ['road-rear', [0, 0, -4]],
    ['adjacency-left', [-2, 0, 0]], ['adjacency-right', [2, 0, 0]],
    ['terrain-left', [-2, 0, 0]], ['terrain-right', [2, 0, 0]],
  ]) addSocket(context, model, id, position);
  addCollider(context, model, 'road-tile', 'box', [0, .1, 0], { width: 4, height: .2, depth: 8, isTrigger: false });
  addCollider(context, model, 'road-surface', 'box', [0, .13, 0], { width: 3.45, height: .12, depth: 8, isTrigger: false });
  addCollider(context, model, 'left-terrain-edge', 'box', [-1.83, .07, 0], { width: .34, height: .14, depth: 8, isTrigger: false });
  addCollider(context, model, 'right-terrain-edge', 'box', [1.83, .07, 0], { width: .34, height: .14, depth: 8, isTrigger: false });
}

function finalize(context, identity, camera) {
  const root = finishAsset(context);
  root.userData.artDirection = { concept: `references/concepts/${context.id}.png`, identity, motion: 'Static road tile. No animation channels are authored.', correctionPasses: 0 };
  root.userData.qualityContract = { suitability: 'pass', triangleBudget: 5000, optimizedDrawRange: [4, 6], criticalFeatures: identity, reviewCamera: camera };
  return root;
}

export function createDirtPath() {
  const context = createAssetContext('dirt-path', { label: 'Dirt Path', dimensionsMetres: [4, .18, 8] });
  const { model } = context;
  const surfaces = {
    earth: material('dirt-path-compacted-earth', '#9a6740'),
    ruts: material('dirt-path-rut-shadow', '#795036'),
    grass: material('dirt-path-grass-edge', '#607842'),
    loose: material('dirt-path-loose-earth', '#b17b4b'),
    pebble: material('dirt-path-small-pebble', '#8a745b'),
  };
  box(context, model, 'compacted-earth-center', [3.42, .1, 8], [0, .05, 0], surfaces.earth, 'road-surface');
  for (const x of [-.72, .72]) box(context, model, `shallow-wheel-rut-${x < 0 ? 'left' : 'right'}`, [.36, .012, 7.55], [x, .106, 0], surfaces.ruts, 'wheel-ruts');
  for (const x of [-1, 1]) {
    box(context, model, `loose-earth-edge-${x < 0 ? 'left' : 'right'}`, [.18, .05, 8], [x * 1.62, .075, 0], surfaces.loose, 'road-edge');
    box(context, model, `grass-wedge-${x < 0 ? 'left' : 'right'}`, [.58, .045, 8], [x * 1.71, .0225, 0], surfaces.grass, 'grass-edge');
  }
  [[-.22, .115, -2.1], [.96, .115, .9], [-1.18, .115, 2.7], [.32, .115, 3.35]].forEach((p, i) => rock(context, model, `small-earth-pebble-${i + 1}`, p, [.07, .035, .09], surfaces.pebble));
  addTileSemantics(context, model);
  return finalize(context, ['compacted earth center', 'two shallow wheel ruts', 'restrained grass-edge wedges', 'seamless four metre by eight metre road tile'], [-5.3, 4.3, 6.4]);
}

export function createGravelRoad() {
  const context = createAssetContext('gravel-road', { label: 'Gravel Road', dimensionsMetres: [4, .23, 8] });
  const { model } = context;
  const surfaces = {
    gravel: material('gravel-road-gray-aggregate', '#77766f'),
    crown: material('gravel-road-crowned-center', '#929188'),
    shoulder: material('gravel-road-drainage-shoulder', '#696a63'),
    ditch: material('gravel-road-shallow-drainage', '#535b50'),
    stones: material('gravel-road-faceted-stones', '#a6a399'),
  };
  box(context, model, 'aggregate-road-bed', [3.35, .1, 8], [0, .05, 0], surfaces.gravel, 'road-surface');
  box(context, model, 'gentle-crowned-center', [1.48, .06, 8], [0, .13, 0], surfaces.crown, 'road-surface');
  for (const x of [-1, 1]) {
    box(context, model, `shallow-shoulder-${x < 0 ? 'left' : 'right'}`, [.34, .075, 8], [x * 1.68, .0375, 0], surfaces.shoulder, 'road-shoulders');
    box(context, model, `drainage-strip-${x < 0 ? 'left' : 'right'}`, [.26, .035, 8], [x * 1.87, .0175, 0], surfaces.ditch, 'road-shoulders');
  }
  [[-.94, .155, -2.4], [.78, .16, -1.05], [-.23, .16, .88], [1.05, .155, 2.28], [-1.27, .145, 3.1]].forEach((p, i) => rock(context, model, `aggregate-stone-${i + 1}`, p, [.09, .055, .11], surfaces.stones));
  addTileSemantics(context, model);
  return finalize(context, ['gray aggregate surface', 'gentle crowned center', 'shallow drainage shoulders', 'few faceted stones', 'seamless four metre by eight metre road tile'], [-5.4, 4.7, 6.6]);
}

export function createFarmRoad() {
  const context = createAssetContext('farm-road', { label: 'Farm Road', dimensionsMetres: [4, .34, 8] });
  const { model } = context;
  const surfaces = {
    earth: material('farm-road-compacted-earth', '#8a6743'),
    gravel: material('farm-road-mixed-gravel', '#9c876b'),
    ditch: material('farm-road-shallow-ditch', '#59604c'),
    timber: material('farm-road-timber-markers', '#6d4a2d'),
    grass: material('farm-road-ditch-grass', '#6d8048'),
  };
  box(context, model, 'compacted-mixed-road-bed', [3.28, .12, 8], [0, .06, 0], surfaces.earth, 'road-surface');
  box(context, model, 'mixed-gravel-running-surface', [2.48, .035, 8], [0, .1375, 0], surfaces.gravel, 'road-surface');
  for (const x of [-1, 1]) {
    box(context, model, `shallow-ditch-${x < 0 ? 'left' : 'right'}`, [.28, .05, 8], [x * 1.72, .025, 0], surfaces.ditch, 'drainage-ditches');
    box(context, model, `ditch-grass-edge-${x < 0 ? 'left' : 'right'}`, [.28, .055, 8], [x * 1.86, .0275, 0], surfaces.grass, 'drainage-ditches');
  }
  [[-1.72, .26, -3.05], [1.72, .26, -3.05], [-1.72, .26, 3.05], [1.72, .26, 3.05]].forEach((p, i) => box(context, model, `timber-edge-marker-${i + 1}`, [.11, .4, .11], p, surfaces.timber, 'timber-markers'));
  addTileSemantics(context, model);
  return finalize(context, ['compacted mixed earth and gravel', 'shallow roadside ditches', 'four timber edge markers', 'built farm-road hierarchy', 'seamless four metre by eight metre road tile'], [-5.5, 4.9, 6.7]);
}
