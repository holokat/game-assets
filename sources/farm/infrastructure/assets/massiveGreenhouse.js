import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, options = {}) => new THREE.MeshStandardMaterial({ name, color, roughness: 0.72, flatShading: true, vertexColors: true, ...options });
const mesh = (context, pivot, id, geometry, surface, group) => registerMesh(context, pivot, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface), group, 'optimization-pass');
const box = (context, pivot, id, size, position, surface, group, rotation = [0, 0, 0]) => {
  const result = mesh(context, pivot, id, new THREE.BoxGeometry(...size), surface, group);
  result.position.set(...position); result.rotation.set(...rotation); return result;
};

export function createMassiveGreenhouse() {
  const context = createAssetContext('massive-greenhouse', { label: 'Massive Greenhouse', targetHeightMetres: 7.2 });
  const surfaces = {
    concrete: material('greenhouse-concrete', '#737872'), steel: material('greenhouse-steel', '#344747', { roughness: 0.55, metalness: 0.42 }),
    glazing: material('greenhouse-glazing', '#8fb4a6', { roughness: 0.28, metalness: 0.08, transparent: true, opacity: 0.58, side: THREE.DoubleSide }),
    growing: material('greenhouse-growing-bed', '#77684a'), safety: material('greenhouse-safety', '#c68243'),
  };
  const greenhouse = addPivot(context, context.model, 'greenhouse-structure');
  box(context, greenhouse, 'foundation-slab', [12.8, 0.22, 24.4], [0, 0.11, 0], surfaces.concrete, 'foundation');
  box(context, greenhouse, 'west-glass-wall', [0.12, 3.85, 23.2], [-5.82, 2.02, 0], surfaces.glazing, 'glazing'); box(context, greenhouse, 'east-glass-wall', [0.12, 3.85, 23.2], [5.82, 2.02, 0], surfaces.glazing, 'glazing');
  box(context, greenhouse, 'front-glass-wall', [11.55, 3.85, 0.12], [0, 2.02, -11.52], surfaces.glazing, 'glazing'); box(context, greenhouse, 'rear-glass-wall', [11.55, 3.85, 0.12], [0, 2.02, 11.52], surfaces.glazing, 'glazing');
  box(context, greenhouse, 'roof-west-glass', [6.55, 0.13, 23.7], [-2.77, 5.2, 0], surfaces.glazing, 'glazing', [0, 0, -0.52]); box(context, greenhouse, 'roof-east-glass', [6.55, 0.13, 23.7], [2.77, 5.2, 0], surfaces.glazing, 'glazing', [0, 0, 0.52]);
  const frame = addPivot(context, greenhouse, 'steel-frame');
  for (const z of [-11.45, -8, -4, 0, 4, 8, 11.45]) {
    box(context, frame, `west-post-${z}`, [0.18, 4.05, 0.18], [-5.9, 2.02, z], surfaces.steel, 'frame'); box(context, frame, `east-post-${z}`, [0.18, 4.05, 0.18], [5.9, 2.02, z], surfaces.steel, 'frame');
    box(context, frame, `west-rafter-${z}`, [6.75, 0.18, 0.18], [-2.84, 5.18, z], surfaces.steel, 'frame', [0, 0, -0.52]); box(context, frame, `east-rafter-${z}`, [6.75, 0.18, 0.18], [2.84, 5.18, z], surfaces.steel, 'frame', [0, 0, 0.52]);
  }
  for (const x of [-5.9, 0, 5.9]) box(context, frame, `longitudinal-rail-${x}`, [0.18, 0.18, 23.7], [x, x === 0 ? 6.67 : 4.06, 0], surfaces.steel, 'frame');
  const entry = addPivot(context, greenhouse, 'service-vestibule', [0, 0, -12.12]);
  box(context, entry, 'vestibule-shell', [3.45, 3.15, 1.25], [0, 1.58, -0.68], surfaces.concrete, 'service');
  const door = addPivot(context, entry, 'sliding-entry', [0, 0, -1.35]); box(context, door, 'entry-door', [1.65, 2.5, 0.16], [0, 1.28, 0], surfaces.safety, 'doors'); addChannel(context, door, 'position', 'x', 1.65, 0.2, 0);
  const beds = addPivot(context, greenhouse, 'growing-beds');
  for (const x of [-3.5, 0, 3.5]) box(context, beds, `bed-${x}`, [1.45, 0.72, 19.2], [x, 0.48, 0.55], surfaces.growing, 'growing-beds');
  const vents = addPivot(context, greenhouse, 'roof-vents', [0, 6.45, 2.6]);
  for (const z of [-3.4, 0, 3.4]) box(context, vents, `vent-${z}`, [1.2, 0.16, 1.35], [0, 0, z], surfaces.safety, 'ventilation', [0.34, 0, 0]);
  addSocket(context, context.model, 'ground', [0, 0, 0]); addSocket(context, entry, 'main-entry', [0, 0.1, -1.48]); addSocket(context, greenhouse, 'water-feed', [5.95, 0.18, 7.5]); addSocket(context, greenhouse, 'power-service', [-5.95, 0.18, 7.5]); addSocket(context, vents, 'roof-maintenance', [0, 0.15, 0]);
  addCollider(context, greenhouse, 'greenhouse-shell', 'box', [0, 3.35, 0], { width: 12.8, height: 6.8, depth: 24.4, isTrigger: false }); addCollider(context, entry, 'service-entry', 'box', [0, 1.5, -0.65], { width: 3.6, height: 3.1, depth: 1.4, isTrigger: true }); addCollider(context, beds, 'growing-zone', 'box', [0, 0.75, 0.55], { width: 9.2, height: 1.5, depth: 19.4, isTrigger: true });
  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 7.2, note: 'A large buildable glasshouse with frame bays, grow beds, roof vents, and a service vestibule.' };
  return root;
}
