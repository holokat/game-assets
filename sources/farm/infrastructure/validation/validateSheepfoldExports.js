import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animateSheepfold, createSheepfold } from '../assets/sheepfold.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/sheepfold.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Sheepfold.glb';
const MANIFEST_PATH = './manifests/sheepfold.export.json';
const RESULT_PATH = 'manifests/sheepfold.validation.json';
const REVIEW_PATH = 'review/sheepfold/final-review.json';
const TOLERANCE = 0.000001;
const DECODERS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);
const check = (name, passed, details = {}) => ({ name, passed, details });
const namesWhere = (root, predicate) => { const names = []; root.traverse((node) => { if (predicate(node)) names.push(node.name); }); return names.sort(); };
const missing = (actual, expected) => { const present = new Set(actual); return expected.filter((name) => !present.has(name)); };
async function readJson(path) { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`Cannot read ${path}`); return response.json(); }
async function readGlb(path) {
  const response = await fetch(path, { cache: 'no-store' }); const data = await response.arrayBuffer(); const view = new DataView(data);
  if (new TextDecoder().decode(new Uint8Array(data, 0, 4)) !== 'glTF') throw new Error(`${path} is not a GLB.`);
  const length = view.getUint32(12, true); const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, length)).trim());
  return { bytes: data.byteLength, extensionsUsed: json.extensionsUsed ?? [] };
}
async function writeJson(path, value) { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 2) }); if (!response.ok) throw new Error(`Cannot write ${path}`); }
function maxBoundsDelta(a, b) { return Math.max(...a.bounds.min.map((v, i) => Math.abs(v - b.bounds.min[i])), ...a.bounds.max.map((v, i) => Math.abs(v - b.bounds.max[i]))); }
function mappedTextures(root) { const found = []; const slots = ['map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap']; root.traverse((node) => { if (!node.isMesh) return; for (const surface of Array.isArray(node.material) ? node.material : [node.material]) for (const slot of slots) if (surface?.[slot]) found.push(`${surface.name}:${slot}`); }); return found; }

export async function validateSheepfoldExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceGlb, optimizedGlb] = await Promise.all([readJson(MANIFEST_PATH), new GLTFLoader().loadAsync(SOURCE_PATH), new GLTFLoader().loadAsync(OPTIMIZED_PATH), readGlb(SOURCE_PATH), readGlb(OPTIMIZED_PATH)]);
  const source = sourceGltf.scene; const optimized = optimizedGltf.scene;
  const sourceStats = collectSceneStats(source); const optimizedStats = collectSceneStats(optimized);
  const allNames = namesWhere(source, () => true); const sockets = namesWhere(source, (n) => Boolean(n.userData.socket)); const colliders = namesWhere(source, (n) => Boolean(n.userData.collider));
  const semantics = source.getObjectByName('sheepfold-root')?.userData?.sourceSemantics;
  const authored = createSheepfold(); const gate = authored.userData.sheepfoldRig.gate; const floor = authored.userData.sheepfoldRig.floor;
  const gateRest = gate.rotation.y; const floorRest = floor.rotation.y; const timeSeconds = 1.25; animateSheepfold(authored, timeSeconds); const gateMoved = gate.rotation.y; const floorMoved = floor.rotation.y; authored.userData.sculptRuntime.dispose();
  const textures = [...mappedTextures(source), ...mappedTextures(optimized)]; const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const checks = [
    check('browser GLTFLoader source reload', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    check('browser GLTFLoader optimized reload', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source bytes match manifest', sourceGlb.bytes === manifest.source.bytes, { file: sourceGlb.bytes, manifest: manifest.source.bytes }),
    check('optimized bytes match manifest', optimizedGlb.bytes === manifest.optimized.bytes, { file: optimizedGlb.bytes, manifest: manifest.optimized.bytes }),
    check('exact ground contact survives both reloads', Math.abs(sourceStats.bounds.min[1]) <= TOLERANCE && Math.abs(optimizedStats.bounds.min[1]) <= TOLERANCE, { sourceMinY: sourceStats.bounds.min[1], optimizedMinY: optimizedStats.bounds.min[1] }),
    check('triangle budget under 5000', sourceStats.triangles < 5000 && optimizedStats.triangles < 5000, { source: sourceStats.triangles, optimized: optimizedStats.triangles }),
    check('optimized uses 4 to 6 draw calls', optimizedStats.drawCalls >= 4 && optimizedStats.drawCalls <= 6, { drawCalls: optimizedStats.drawCalls }),
    check('source pivots survive reload', missing(allNames, manifest.source.requiredPivotNames).length === 0, { missing: missing(allNames, manifest.source.requiredPivotNames) }),
    check('source sockets survive reload', missing(sockets, manifest.source.requiredSocketNames).length === 0, { missing: missing(sockets, manifest.source.requiredSocketNames) }),
    check('source colliders survive reload', missing(colliders, manifest.source.requiredColliderNames).length === 0, { missing: missing(colliders, manifest.source.requiredColliderNames) }),
    check('source destruction groups survive reload', JSON.stringify(semantics?.destructionGroups) === JSON.stringify(manifest.source.requiredDestructionGroups), { groups: Object.keys(semantics?.destructionGroups ?? {}) }),
    check('only broad gate action is authored', semantics?.animationChannels?.length === 1 && semantics.animationChannels[0].node === 'sheepfold-broad-entry-gate' && semantics.animationChannels[0].axis === 'y', { actionChannels: semantics?.animationChannels ?? [] }),
    check('broad gate moves while fold floor stays fixed', gateMoved - gateRest > 0.5 && floorMoved === floorRest, { timeSeconds, gateRest, gateMoved, floorRest, floorMoved }),
    check('exports are textureless', textures.length === 0, { mappedTextureSlots: textures }),
    check('exports need no decoder', [...sourceGlb.extensionsUsed, ...optimizedGlb.extensionsUsed].every((ext) => !DECODERS.has(ext)), { sourceExtensions: sourceGlb.extensionsUsed, optimizedExtensions: optimizedGlb.extensionsUsed }),
    check('optimized retains five material families', optimizedStats.materials.length === 5, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= TOLERANCE, { maxDelta: boundsDelta }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = { schemaVersion: 1, assetId: 'sheepfold', validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs', result: checks.every((item) => item.passed) ? 'pass' : 'fail', checks, animationEvidence: { timeSeconds, gateRest, gateMoved, floorRest, floorMoved }, source: { path: manifest.source.path, bytes: sourceGlb.bytes, ...sourceStats }, optimized: { path: manifest.optimized.path, bytes: optimizedGlb.bytes, ...optimizedStats } };
  await Promise.all([writeJson(RESULT_PATH, result), writeJson(REVIEW_PATH, result)]); return result;
}
const output = document.querySelector('#output'); window.__SHEEPFOLD_VALIDATION_READY__ = false;
try { const result = await validateSheepfoldExports(); result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; }); output.textContent += `Validation result: ${result.result.toUpperCase()}\n`; window.__SHEEPFOLD_VALIDATION_RESULT__ = result; window.__SHEEPFOLD_VALIDATION_READY__ = true; }
catch (error) { output.textContent += `${error.stack || error.message}\n`; window.__SHEEPFOLD_VALIDATION_ERROR__ = String(error.stack || error.message); }
