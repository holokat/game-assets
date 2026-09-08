import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const LIVESTOCK_SHELTER_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(LIVESTOCK_SHELTER_PASSES.map((id, index) => [id, index]));
function material(name, color, roughness, metalness = 0) { return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true }); }
function makeMaterials() { return {
  earth: material('livestock-shelter-compacted-earth-mat', '#9f835f', 0.97),
  timber: material('livestock-shelter-weathered-timber-mat', '#66503b', 0.91),
  roof: material('livestock-shelter-sage-galvanized-roof-mat', '#70786d', 0.74, 0.22),
  iron: material('livestock-shelter-dark-anchor-iron-mat', '#434a49', 0.66, 0.42),
  trough: material('livestock-shelter-blue-grey-trough-mat', '#61767a', 0.82, 0.12),
}; }
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') { return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass); }
function beam(context, parent, id, start, end, width, depth, materialValue, group) { const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const result = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, 'structural-pass'); result.position.copy(a.clone().add(b).multiplyScalar(0.5)); result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return result; }

export function createLivestockShelter(options = {}) {
  const passId = LIVESTOCK_SHELTER_PASSES.includes(options.passId) ? options.passId : 'optimization-pass'; const context = createAssetContext('livestock-shelter', { label: 'Livestock Shelter', targetHeightMetres: 2.55, passId }); context.materials = makeMaterials(); const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]); addSocket(context, model, 'terrain', [0, 0.05, 0]); addSocket(context, model, 'livestock-entry', [0, 0.16, 2]); addSocket(context, model, 'shelter-center', [0, 0.16, 0]); addSocket(context, model, 'windbreak-rear', [0, 0.75, -1.65]); addSocket(context, model, 'watering', [-1.65, 0.35, -1.15]); addSocket(context, model, 'service', [2.35, 0.14, 1.7]); addSocket(context, model, 'roof-attachment', [0, 2.52, 0]); addSocket(context, model, 'adjacency-left', [-3.25, 0.1, 0]); addSocket(context, model, 'adjacency-right', [3.25, 0.1, 0]); addSocket(context, model, 'adjacency-front', [0, 0.1, 2.25]); addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.05]);

  const base = addPivot(context, model, 'field-shelter-base'); const slab = mesh(context, base, 'thin-earth-curb', box(6.05, 0.14, 3.75), context.materials.earth, 'foundation'); slab.position.y = 0.07; const floor = mesh(context, base, 'shelter-floor', box(5.75, 0.06, 3.45), context.materials.earth, 'floor', 'form-refinement'); floor.position.y = 0.17; addCollider(context, base, 'shelter-ground', 'box', [0, 0.1, 0], { width: 6.05, height: 0.2, depth: 3.75, isTrigger: false });

  const frame = addPivot(context, model, 'six-post-frame');
  for (const [id, x, z, height] of [['left-front', -2.62, 1.48, 2.18], ['center-front', 0, 1.48, 2.18], ['right-front', 2.62, 1.48, 2.18], ['left-rear', -2.62, -1.48, 2.4], ['center-rear', 0, -1.48, 2.4], ['right-rear', 2.62, -1.48, 2.4]]) {
    const post = mesh(context, frame, `${id}-post`, box(0.15, height, 0.15), context.materials.timber, 'frame-posts', 'structural-pass'); post.position.set(x, 0.18 + height / 2, z); const shoe = mesh(context, frame, `${id}-anchor-shoe`, box(0.28, 0.12, 0.28), context.materials.iron, 'anchor-hardware', 'surface-pass'); shoe.position.set(x, 0.22, z);
  }
  for (const [id, x1, z1, y1, x2, z2, y2] of [['front-top', -2.62, 1.48, 2.34, 2.62, 1.48, 2.34], ['rear-top', -2.62, -1.48, 2.56, 2.62, -1.48, 2.56], ['left-rafter', -2.62, -1.48, 2.52, -2.62, 1.48, 2.3], ['right-rafter', 2.62, -1.48, 2.52, 2.62, 1.48, 2.3]]) beam(context, frame, id, [x1, y1, z1], [x2, y2, z2], 0.13, 0.13, context.materials.timber, 'frame-beams');

  const windbreak = addPivot(context, model, 'windbreak-panels');
  for (const [index, x] of [-1.75, 0, 1.75].entries()) { const panel = mesh(context, windbreak, `rear-panel-${index + 1}`, box(1.65, 1.34, 0.1), context.materials.timber, 'rear-windbreak', 'form-refinement'); panel.position.set(x, 0.87, -1.55); }
  for (const [side, x] of [['left', -2.68], ['right', 2.68]]) { const panel = mesh(context, windbreak, `${side}-side-panel`, box(0.1, 0.83, 1.75), context.materials.timber, 'side-windbreaks', 'form-refinement'); panel.position.set(x, 0.62, -0.62); }
  addCollider(context, windbreak, 'rear-and-side-windbreaks', 'box', [0, 0.85, -1.03], { width: 5.5, height: 1.4, depth: 1.25, isTrigger: false });

  const roofGroup = addPivot(context, model, 'single-slope-roof'); const roof = mesh(context, roofGroup, 'shallow-galvanized-roof', box(5.85, 0.12, 3.55), context.materials.roof, 'roof', 'structural-pass'); roof.position.set(0, 2.48, 0); roof.rotation.x = -0.074;
  for (let index = -4; index <= 4; index += 1) { const seam = mesh(context, roofGroup, `roof-seam-${index + 5}`, box(0.035, 0.035, 3.48), context.materials.iron, 'roof-hardware', 'surface-pass'); seam.position.set(index * 0.61, 2.55, 0); seam.rotation.x = -0.074; }
  addCollider(context, roofGroup, 'shelter-roof', 'box', [0, 2.48, 0], { width: 5.9, height: 0.18, depth: 3.6, isTrigger: false });

  const water = addPivot(context, model, 'water-station'); const trough = mesh(context, water, 'low-water-trough', box(1.65, 0.34, 0.5), context.materials.trough, 'water-trough'); trough.position.set(-1.55, 0.39, -1.08); const inset = mesh(context, water, 'trough-inset', box(1.4, 0.06, 0.3), context.materials.iron, 'water-trough', 'surface-pass'); inset.position.set(-1.55, 0.59, -1.08); for (const x of [-2.16, -0.94]) { const leg = mesh(context, water, `trough-leg-${x}`, box(0.12, 0.28, 0.4), context.materials.timber, 'water-trough', 'structural-pass'); leg.position.set(x, 0.28, -1.08); } addCollider(context, water, 'water-trough', 'box', [-1.55, 0.4, -1.08], { width: 1.75, height: 0.8, depth: 0.6, isTrigger: false });

  const root = finishAsset(context); root.userData.artDirection = { heightMetres: 2.55, note: 'Lean open-sided low-poly Livestock Shelter reconstructed from the generated four-view concept sheet.', palette: ['compacted earth', 'weathered timber', 'sage galvanized roof', 'dark anchor iron', 'blue-grey trough'], motion: 'Intentionally static shelter infrastructure.' }; root.userData.livestockShelterRig = { base, frame, windbreak, roofGroup, water }; root.userData.applyPassState = (nextPassId) => applyLivestockShelterPassState(root, nextPassId); applyLivestockShelterPassState(root, passId); return root;
}

export function applyLivestockShelterPassState(root, passId = 'optimization-pass') { const selectedPass = LIVESTOCK_SHELTER_PASSES.includes(passId) ? passId : 'optimization-pass'; const selectedIndex = PASS_INDEX.get(selectedPass); const runtime = root.userData.sculptRuntime; const blockoutMaterial = runtime.nodes['livestock-shelter-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'livestock-shelter-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true }); root.userData.passId = selectedPass; root.traverse((node) => { if (!node.isMesh) return; node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial; }); return root; }
