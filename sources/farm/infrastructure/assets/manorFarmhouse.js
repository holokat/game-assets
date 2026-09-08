import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, pivot, id, geometry, surface, group) => registerMesh(context, pivot, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group, 'optimization-pass');
const box = (context, pivot, id, size, position, surface, group, rotation = [0, 0, 0]) => {
  const result = mesh(context, pivot, id, new THREE.BoxGeometry(...size), surface, group);
  result.position.set(...position); result.rotation.set(...rotation); return result;
};

export function createManorFarmhouse() {
  const context = createAssetContext('manor-farmhouse', { label: 'Manor Farmhouse', targetHeightMetres: 8.4 });
  const surfaces = {
    stone: material('manor-stone', '#80786b'), plaster: material('manor-plaster', '#d8cdb7'), roof: material('manor-slate', '#3c4650', 0.7, 0.08),
    timber: material('manor-timber', '#76543e'), glass: material('manor-window', '#587982', 0.42, 0.12),
  };
  const house = addPivot(context, context.model, 'manor-house');
  box(context, house, 'footing', [18.4, 0.28, 11.2], [0, 0.14, 0], surfaces.stone, 'foundation');
  box(context, house, 'central-hall', [8.6, 5.65, 7.1], [0, 2.96, 0.55], surfaces.plaster, 'main-shell');
  box(context, house, 'west-wing', [4.75, 3.9, 6.3], [-6.5, 2.08, 0.15], surfaces.plaster, 'wings');
  box(context, house, 'east-wing', [4.75, 3.9, 6.3], [6.5, 2.08, 0.15], surfaces.plaster, 'wings');
  box(context, house, 'central-roof-west', [5.1, 0.32, 7.85], [-2.25, 6.35, 0.55], surfaces.roof, 'roof', [0, 0, -0.52]);
  box(context, house, 'central-roof-east', [5.1, 0.32, 7.85], [2.25, 6.35, 0.55], surfaces.roof, 'roof', [0, 0, 0.52]);
  for (const x of [-6.5, 6.5]) {
    box(context, house, `wing-roof-west-${x}`, [2.75, 0.28, 6.85], [x - 1.12, 4.4, 0.15], surfaces.roof, 'roof', [0, 0, -0.38]);
    box(context, house, `wing-roof-east-${x}`, [2.75, 0.28, 6.85], [x + 1.12, 4.4, 0.15], surfaces.roof, 'roof', [0, 0, 0.38]);
  }
  const porch = addPivot(context, house, 'front-porch', [0, 0, -4.05]);
  box(context, porch, 'porch-slab', [7.3, 0.24, 2.05], [0, 0.12, 0], surfaces.stone, 'porch'); box(context, porch, 'porch-roof', [7.9, 0.24, 2.55], [0, 3.18, 0.18], surfaces.roof, 'porch', [0.08, 0, 0]);
  for (const x of [-3.05, -1.0, 1.0, 3.05]) box(context, porch, `porch-post-${x}`, [0.25, 3.05, 0.25], [x, 1.52, -0.82], surfaces.timber, 'porch');
  const entry = addPivot(context, porch, 'front-entry', [0, 0, -0.72]);
  box(context, entry, 'left-door', [1.02, 2.35, 0.16], [-0.54, 1.3, 0], surfaces.timber, 'doors'); box(context, entry, 'right-door', [1.02, 2.35, 0.16], [0.54, 1.3, 0], surfaces.timber, 'doors');
  addChannel(context, entry, 'rotation', 'y', 0.62, 0.18, 0);
  const chimney = addPivot(context, house, 'stone-chimney', [3.3, 0, 2.25]);
  box(context, chimney, 'chimney-stack', [1.15, 7.55, 1.15], [0, 3.78, 0], surfaces.stone, 'chimney'); box(context, chimney, 'chimney-cap', [1.48, 0.22, 1.48], [0, 7.62, 0], surfaces.stone, 'chimney');
  for (const x of [-2.8, 0, 2.8]) for (const y of [2.2, 4.45]) box(context, house, `front-window-${x}-${y}`, [1.02, 1.15, 0.13], [x, y, -3.05], surfaces.glass, 'windows');
  for (const x of [-7.55, 7.55]) box(context, house, `wing-window-${x}`, [0.14, 1.05, 1.1], [x, 2.2, -1.65], surfaces.glass, 'windows');
  addSocket(context, context.model, 'ground', [0, 0, 0]); addSocket(context, entry, 'main-entry', [0, 0.05, -0.2]); addSocket(context, porch, 'porch-step', [0, 0.05, -1.45]); addSocket(context, house, 'kitchen-service', [8.95, 0.1, 1.6]);
  addCollider(context, house, 'house-shell', 'box', [0, 3.1, 0.1], { width: 18.4, height: 6.2, depth: 11.2, isTrigger: false }); addCollider(context, porch, 'porch', 'box', [0, 1.4, -0.7], { width: 7.4, height: 2.9, depth: 2.1, isTrigger: true });
  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 8.4, note: 'A two-storey farm estate with entry porch, wings, and a usable service side.' };
  return root;
}
