import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.78, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
const mesh = (context, pivot, id, geometry, surface, group, pass = 'optimization-pass') => registerMesh(context, pivot, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group, pass);
const box = (context, pivot, id, size, position, surface, group, rotation = [0, 0, 0]) => {
  const result = mesh(context, pivot, id, new THREE.BoxGeometry(...size), surface, group);
  result.position.set(...position);
  result.rotation.set(...rotation);
  return result;
};

export function createGrandBarn() {
  const context = createAssetContext('grand-barn', { label: 'Grand Barn', targetHeightMetres: 9.1 });
  const surfaces = {
    foundation: material('grand-barn-foundation', '#6b6257'), cladding: material('grand-barn-cladding', '#9b4738'),
    roof: material('grand-barn-roof', '#364d50', 0.66, 0.08), trim: material('grand-barn-trim', '#e2c891'),
    hardware: material('grand-barn-hardware', '#393f3c', 0.58, 0.35),
  };
  const barn = addPivot(context, context.model, 'main-structure');
  box(context, barn, 'foundation-pad', [17.8, 0.22, 10.2], [0, 0.11, 0], surfaces.foundation, 'foundation');
  box(context, barn, 'main-hall', [11.2, 6.35, 8.7], [0, 3.28, 0.15], surfaces.cladding, 'main-shell');
  box(context, barn, 'west-aisle', [3.3, 4.45, 8.7], [-7.2, 2.23, 0.15], surfaces.cladding, 'side-aisles');
  box(context, barn, 'east-aisle', [3.3, 4.45, 8.7], [7.2, 2.23, 0.15], surfaces.cladding, 'side-aisles');
  box(context, barn, 'west-roof', [8.2, 0.3, 9.45], [-3.73, 7.18, 0.15], surfaces.roof, 'roof', [0, 0, -0.47]);
  box(context, barn, 'east-roof', [8.2, 0.3, 9.45], [3.73, 7.18, 0.15], surfaces.roof, 'roof', [0, 0, 0.47]);
  box(context, barn, 'west-lean-roof', [3.85, 0.23, 9.35], [-7.34, 4.8, 0.15], surfaces.roof, 'roof', [0, 0, -0.22]);
  box(context, barn, 'east-lean-roof', [3.85, 0.23, 9.35], [7.34, 4.8, 0.15], surfaces.roof, 'roof', [0, 0, 0.22]);
  const cupola = addPivot(context, barn, 'roof-cupola', [0, 7.9, 0.45]);
  box(context, cupola, 'cupola-body', [2.1, 1.05, 2.1], [0, 0.52, 0], surfaces.cladding, 'cupola');
  box(context, cupola, 'cupola-cap', [2.62, 0.22, 2.62], [0, 1.12, 0], surfaces.roof, 'cupola', [0, 0, 0.05]);
  const doors = addPivot(context, barn, 'sliding-doors', [0, 0, -4.26]);
  for (const x of [-2.06, 2.06]) {
    box(context, doors, `door-${x}`, [3.75, 4.15, 0.16], [x, 2.15, 0], surfaces.trim, 'doors');
    box(context, doors, `door-brace-${x}`, [4.05, 0.15, 0.2], [x, 2.15, -0.1], surfaces.hardware, 'doors', [0, 0, x < 0 ? 0.55 : -0.55]);
  }
  for (const x of [-7.22, 7.22]) box(context, barn, `side-door-${x}`, [1.5, 2.5, 0.16], [x, 1.4, -3.1], surfaces.trim, 'doors');
  for (const x of [-4.25, 4.25]) box(context, barn, `loft-window-${x}`, [1.1, 0.8, 0.12], [x, 4.95, -4.25], surfaces.hardware, 'hardware');
  addChannel(context, doors, 'position', 'x', 1.8, 0.22, 0);
  addSocket(context, context.model, 'ground', [0, 0, 0]); addSocket(context, context.model, 'main-loading', [0, 0.1, -5.15]);
  addSocket(context, context.model, 'west-service', [-8.8, 0.1, 1.5]); addSocket(context, cupola, 'roof-access', [0, 1.15, 0]);
  addCollider(context, barn, 'barn-shell', 'box', [0, 3.65, 0], { width: 17.8, height: 7.5, depth: 10.2, isTrigger: false });
  addCollider(context, doors, 'loading-bay', 'box', [0, 2.1, -0.2], { width: 4.1, height: 4.2, depth: 1.1, isTrigger: true });
  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 9.1, note: 'A broad landmark barn with a working loading front and roof cupola.' };
  return root;
}
