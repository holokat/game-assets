import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/handPumpExportUtils.js';
const SOURCE_PATH = 'source-glb/deep-well.source.glb';
const STATIC_PATH = 'optimized-glb/Deep-Well.glb';
const MANIFEST_PATH = 'manifests/deep-well.export.json';
const RESULT_PATH = 'manifests/deep-well.validation.json';
const TOLERANCE = 0.006;
const MAX_TRIANGLES = 5000;
const DECODERS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const includesAll = (actual, expected) => { const set = new Set(actual); return expected.filter((name) => !set.has(name)); };
function namesWhere(root, predicate) { const names = []; root.traverse((node) => { if (predicate(node)) names.push(node.name); }); return names.sort(); }
async function readJson(path) { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`); return response.json(); }
async function readExtensions(path) { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`); const data = await response.arrayBuffer(); const view = new DataView(data); assert(new TextDecoder().decode(new Uint8Array(data, 0, 4)) === 'glTF', `${path} is not a GLB.`); const length = view.getUint32(12, true); return JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, length)).trim()).extensionsUsed ?? []; }
async function writeJson(path, value) { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 2) }); if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`); }
const check = (name, passed, details) => ({ name, passed, details });
export async function validateDeepWellExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceExtensions, optimizedExtensions] = await Promise.all([readJson(MANIFEST_PATH), new GLTFLoader().loadAsync(SOURCE_PATH), new GLTFLoader().loadAsync(STATIC_PATH), readExtensions(SOURCE_PATH), readExtensions(STATIC_PATH)]);
  const source = sourceGltf.scene; const optimized = optimizedGltf.scene; const sourceStats = collectSceneStats(source); const optimizedStats = collectSceneStats(optimized);
  const sourceRoot = source.getObjectByName('deep-well-root'); const semantics = sourceRoot?.userData?.sourceSemantics;
  const pivotNames = namesWhere(source, () => true); const socketNames = namesWhere(source, (node) => Boolean(node.userData.socket)); const colliderNames = namesWhere(source, (node) => Boolean(node.userData.collider));
  const maxBoundDelta = Math.max(...sourceStats.bounds.min.map((v, i) => Math.abs(v - optimizedStats.bounds.min[i])), ...sourceStats.bounds.max.map((v, i) => Math.abs(v - optimizedStats.bounds.max[i])));
  const checks = [
    check('source scene is nonempty', sourceStats.meshes > 0, { meshes: sourceStats.meshes }), check('optimized scene is nonempty', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source ground contact', Math.abs(sourceStats.bounds.min[1]) <= TOLERANCE, { minY: sourceStats.bounds.min[1], tolerance: TOLERANCE }), check('optimized ground contact', Math.abs(optimizedStats.bounds.min[1]) <= TOLERANCE, { minY: optimizedStats.bounds.min[1], tolerance: TOLERANCE }),
    check('triangle budget', sourceStats.triangles <= MAX_TRIANGLES && optimizedStats.triangles <= MAX_TRIANGLES, { source: sourceStats.triangles, optimized: optimizedStats.triangles, maxTriangles: MAX_TRIANGLES }),
    check('source pivots survive reload', includesAll(pivotNames, manifest.source.requiredPivotNames).length === 0, { missing: includesAll(pivotNames, manifest.source.requiredPivotNames) }), check('source sockets survive reload', includesAll(socketNames, manifest.source.requiredSocketNames).length === 0, { missing: includesAll(socketNames, manifest.source.requiredSocketNames) }), check('source colliders survive reload', includesAll(colliderNames, manifest.source.requiredColliderNames).length === 0, { missing: includesAll(colliderNames, manifest.source.requiredColliderNames) }),
    check('source semantic metadata survives reload', Boolean(semantics) && semantics.animationChannels?.length === manifest.source.actionChannels.length && Object.keys(semantics.destructionGroups ?? {}).length === Object.keys(manifest.source.requiredDestructionGroups).length, { loadedAnimationChannels: semantics?.animationChannels?.length ?? 0, loadedDestructionGroups: Object.keys(semantics?.destructionGroups ?? {}).length }),
    check('no decoder dependency', sourceExtensions.every((extension) => !DECODERS.has(extension)) && optimizedExtensions.every((extension) => !DECODERS.has(extension)), { sourceExtensions, optimizedExtensions }),
    check('textureless optimized material separation survives reload', manifest.optimized.materials.length === 3 && includesAll(optimizedStats.materials, manifest.optimized.materials).length === 0, { materials: optimizedStats.materials }),
    check('static bounds match source', maxBoundDelta <= TOLERANCE, { maxBoundDelta, tolerance: TOLERANCE }), check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = { schemaVersion: 1, assetId: 'deep-well', coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 }, result: checks.every((item) => item.passed) ? 'pass' : 'fail', checks, source: sourceStats, optimized: optimizedStats };
  await writeJson(RESULT_PATH, result); return result;
}
const output = document.querySelector('#output'); const write = (message) => { output.textContent += `${message}\n`; };
window.__DEEP_WELL_VALIDATION_READY__ = false;
try { write('Reloading exported GLBs with GLTFLoader…'); const result = await validateDeepWellExports(); result.checks.forEach((item) => write(`${item.passed ? 'PASS' : 'FAIL'}: ${item.name}`)); write(`Validation result: ${result.result.toUpperCase()}`); window.__DEEP_WELL_VALIDATION_RESULT__ = result; window.__DEEP_WELL_VALIDATION_READY__ = true; } catch (error) { write(`Validation failed: ${error.stack || error.message}`); window.__DEEP_WELL_VALIDATION_ERROR__ = String(error.stack || error.message); }
