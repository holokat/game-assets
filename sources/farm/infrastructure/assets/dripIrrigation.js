import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const DRIP_IRRIGATION_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);
const PASS_INDEX = new Map(DRIP_IRRIGATION_PASSES.map((id, index) => [id, index]));
const make = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
function materials() { return { rail: make('drip-rail-mat', '#a29986', 0.88), pipe: make('drip-blue-grey-pipe-mat', '#42565d', 0.72, 0.2), pipeDark: make('drip-charcoal-fitting-mat', '#303b3d', 0.68, 0.28), brass: make('drip-brass-valve-mat', '#927147', 0.55, 0.52) }; }
function mesh(c, p, id, geometry, material, group, minimumPass = 'blockout') { return registerMesh(c, p, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), material), group, minimumPass); }
function box(w, h, d, r = 0.025) { return new RoundedBoxGeometry(w, h, d, 1, r); }
function zPipe(radius, length, sides = 10) { const g = new THREE.CylinderGeometry(radius, radius, length, sides, 1, false); g.rotateX(Math.PI / 2); return g; }
function xPipe(radius, length, sides = 8) { const g = new THREE.CylinderGeometry(radius, radius, length, sides, 1, false); g.rotateZ(Math.PI / 2); return g; }
function ringZ(radius, thickness) { return new THREE.TorusGeometry(radius, thickness, 5, 10); }
function ringX(radius, thickness) { const g = ringZ(radius, thickness); g.rotateY(Math.PI / 2); return g; }

export function createDripIrrigation(options = {}) {
  const passId = DRIP_IRRIGATION_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const c = createAssetContext('drip-irrigation', { label: 'Drip Irrigation', targetHeightMetres: 1.55, passId }); c.materials = materials(); const { model } = c;
  addSocket(c, model, 'ground', [0, 0, 0]); addSocket(c, model, 'header-front', [0, 0.86, 1.85]); addSocket(c, model, 'header-rear', [0, 0.86, -1.85]); addSocket(c, model, 'valve-control', [0, 1.53, 0]);
  const frame = addPivot(c, model, 'support-frame');
  for (const [id, x] of [['left', -1.64], ['right', 1.64]]) { const rail = mesh(c, frame, `${id}-long-rail`, box(0.17, 0.16, 3.6, 0.025), c.materials.rail, 'support-frame'); rail.position.set(x, 0.12, 0); }
  for (const [id, z] of [['front', 1.72], ['rear', -1.72]]) { const rail = mesh(c, frame, `${id}-cross-rail`, box(3.45, 0.16, 0.17, 0.025), c.materials.rail, 'support-frame'); rail.position.set(0, 0.12, z); }
  for (const x of [-1.64, 1.64]) for (const z of [-1.72, 1.72]) { const foot = mesh(c, frame, `corner-foot-${x}-${z}`, box(0.27, 0.23, 0.27, 0.025), c.materials.rail, 'support-frame'); foot.position.set(x, 0.115, z); }
  addCollider(c, frame, 'support-frame', 'box', [0, 0.12, 0], { width: 3.55, height: 0.24, depth: 3.7, isTrigger: false });
  const header = addPivot(c, model, 'main-header', [0, 0.86, 0]);
  mesh(c, header, 'main-header-pipe', zPipe(0.27, 3.38, 12), c.materials.pipe, 'main-header');
  for (const [id, z] of [['front', 1.72], ['rear', -1.72]]) { const socket = mesh(c, header, `${id}-header-socket`, zPipe(0.38, 0.24, 10), c.materials.rail, 'header-sockets', 'structural-pass'); socket.position.z = z; const inner = mesh(c, header, `${id}-header-inner`, zPipe(0.19, 0.252, 8), c.materials.pipeDark, 'header-sockets', 'form-refinement'); inner.position.z = z; }
  for (const [index, z] of [-0.92, 0, 0.92].entries()) { const clamp = mesh(c, header, `header-clamp-${index + 1}`, ringZ(0.285, 0.038), c.materials.pipeDark, 'header-fittings', 'structural-pass'); clamp.position.z = z; }
  addCollider(c, header, 'main-header', 'cylinder', [0, 0, 0], { radius: 0.28, height: 3.4, axis: 'z', isTrigger: false });
  const branches = addPivot(c, model, 'branch-lines');
  for (const [index, z] of [-0.92, 0, 0.92].entries()) {
    const branch = addPivot(c, branches, `branch-${index + 1}`, [0, 0.5, z]);
    const tee = mesh(c, branch, `branch-tee-${index + 1}`, new THREE.SphereGeometry(0.24, 8, 5), c.materials.pipeDark, 'branch-fittings', 'structural-pass');
    const line = mesh(c, branch, `branch-pipe-${index + 1}`, xPipe(0.12, 3.02, 8), c.materials.pipeDark, 'branch-lines');
    for (const [side, x] of [['left', -1.45], ['right', 1.45]]) { const end = mesh(c, branch, `branch-${index + 1}-${side}-end`, xPipe(0.18, 0.18, 8), c.materials.pipe, 'branch-fittings', 'form-refinement'); end.position.x = x; }
    for (const [couplingIndex, x] of [-1.08, -0.36, 0.36, 1.08].entries()) { const coupling = mesh(c, branch, `branch-${index + 1}-coupling-${couplingIndex + 1}`, ringX(0.135, 0.028), c.materials.pipe, 'branch-fittings', 'surface-pass'); coupling.position.x = x; }
    for (const [emitterIndex, x] of [-0.72, 0.72].entries()) { const emitter = mesh(c, branch, `branch-${index + 1}-emitter-${emitterIndex + 1}`, new THREE.CylinderGeometry(0.085, 0.1, 0.09, 7), c.materials.brass, 'emitters', 'surface-pass'); emitter.position.set(x, -0.11, 0); }
    const support = mesh(c, branch, `branch-${index + 1}-support`, box(0.18, 0.4, 0.18, 0.018), c.materials.rail, 'support-frame', 'structural-pass'); support.position.y = -0.24;
    addCollider(c, branch, `branch-${index + 1}`, 'capsule-chain', [0, 0, 0], { radius: 0.13, height: 3.05, axis: 'x', isTrigger: false });
  }
  const valve = addPivot(c, header, 'central-top-valve', [0, 0.33, 0]);
  mesh(c, valve, 'valve-base', box(0.58, 0.18, 0.58, 0.025), c.materials.pipeDark, 'central-valve', 'form-refinement');
  const stem = mesh(c, valve, 'valve-stem', new THREE.CylinderGeometry(0.1, 0.1, 0.27, 8), c.materials.brass, 'central-valve', 'form-refinement'); stem.position.y = 0.2;
  const handle = addPivot(c, valve, 'central-valve-handle', [0, 0.39, 0]);
  mesh(c, handle, 'handle-cross-x', box(0.52, 0.08, 0.11, 0.02), c.materials.brass, 'central-valve', 'surface-pass');
  mesh(c, handle, 'handle-cross-z', box(0.11, 0.08, 0.52, 0.02), c.materials.brass, 'central-valve', 'surface-pass');
  addChannel(c, handle, 'rotation', 'y', Math.PI * 0.5, 0.75, 0); addCollider(c, valve, 'central-valve', 'box', [0, 0.25, 0], { width: 0.62, height: 0.62, depth: 0.62, isTrigger: false });
  const root = finishAsset(c); root.userData.artDirection = { heightMetres: 1.55, note: 'Dry, tileable low-poly drip-irrigation hardware inferred from the supplied concept.', palette: ['pale support rail', 'blue-grey header', 'charcoal branch pipe', 'brass valve accents'] }; root.userData.dripIrrigationRig = { handle }; root.userData.applyPassState = (next) => applyDripIrrigationPassState(root, next); applyDripIrrigationPassState(root, passId); return root;
}
export function applyDripIrrigationPassState(root, passId = 'optimization-pass') { const id = DRIP_IRRIGATION_PASSES.includes(passId) ? passId : 'optimization-pass'; const selected = PASS_INDEX.get(id); const runtime = root.userData.sculptRuntime; const blockout = runtime.nodes['drip-irrigation-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'drip-blockout-mat', color: '#aaa090', roughness: 0.92, flatShading: true }); root.userData.passId = id; root.traverse((node) => { if (!node.isMesh) return; node.visible = selected >= (PASS_INDEX.get(node.userData.minimumPass) ?? 0); node.userData.authoredMaterial ??= node.material; node.material = selected < PASS_INDEX.get('material-pass') ? blockout : node.userData.authoredMaterial; }); return root; }
export function animateDripIrrigation(root, timeSeconds, intensity = 1) { const handle = root?.userData?.dripIrrigationRig?.handle; if (!handle) return root; const time = Number.isFinite(timeSeconds) ? timeSeconds : 0; handle.rotation.y = Math.sin(time * 0.75) * Math.PI * 0.5 * Math.max(0, intensity); return root; }
