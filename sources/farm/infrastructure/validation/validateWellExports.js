import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/handPumpExportUtils.js';

const SOURCE_PATH = './source-glb/well.source.glb';
const STATIC_PATH = './optimized-glb/Well.glb';
const MANIFEST_PATH = './manifests/well.export.json';
const RESULT_PATH = 'manifests/well.validation.json';
const GROUND_TOLERANCE_METRES = 0.006;
const MAX_TRIANGLES = 6000;
const DECODER_EXTENSIONS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);

function assert(condition, message) { if (!condition) throw new Error(message); }
function namesWhere(root, predicate) { const names = []; root.traverse((node) => { if (predicate(node)) names.push(node.name); }); return names.sort(); }
function missing(actual, expected) { const set = new Set(actual); return expected.filter((value) => !set.has(value)); }
function check(name, passed, details) { return { name, passed, details }; }
function finite(bounds) { return [...bounds.min, ...bounds.max, ...bounds.size, ...bounds.center].every(Number.isFinite); }
async function readJson(path) { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`); return response.json(); }
async function extensions(path) {
  const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`);
  const data = await response.arrayBuffer(); const view = new DataView(data);
  assert(new TextDecoder().decode(new Uint8Array(data, 0, 4)) === 'glTF', `${path} is not a GLB.`);
  const jsonLength = view.getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)).trim()).extensionsUsed ?? [];
}
async function writeJson(path, value) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 2) });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

export async function validateWellExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceExtensions, optimizedExtensions] = await Promise.all([
    readJson(MANIFEST_PATH), new GLTFLoader().loadAsync(SOURCE_PATH), new GLTFLoader().loadAsync(STATIC_PATH), extensions(SOURCE_PATH), extensions(STATIC_PATH),
  ]);
  const source = sourceGltf.scene; const optimized = optimizedGltf.scene;
  const sourceStats = collectSceneStats(source); const optimizedStats = collectSceneStats(optimized);
  const nodes = namesWhere(source, () => true);
  const sockets = namesWhere(source, (node) => Boolean(node.userData.socket));
  const colliders = namesWhere(source, (node) => Boolean(node.userData.collider));
  const metadata = source.getObjectByName('well-root')?.userData?.sourceSemantics;
  const maxDelta = Math.max(...sourceStats.bounds.min.map((value, index) => Math.abs(value - optimizedStats.bounds.min[index])), ...sourceStats.bounds.max.map((value, index) => Math.abs(value - optimizedStats.bounds.max[index])));
  const loadedMaterials = new Set(optimizedStats.materials);
  const checks = [
    check('source scene is nonempty', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    check('optimized scene is nonempty', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source bounds are finite', finite(sourceStats.bounds), sourceStats.bounds),
    check('optimized bounds are finite', finite(optimizedStats.bounds), optimizedStats.bounds),
    check('source ground contact', Math.abs(sourceStats.bounds.min[1]) <= GROUND_TOLERANCE_METRES, { minY: sourceStats.bounds.min[1], tolerance: GROUND_TOLERANCE_METRES }),
    check('optimized ground contact', Math.abs(optimizedStats.bounds.min[1]) <= GROUND_TOLERANCE_METRES, { minY: optimizedStats.bounds.min[1], tolerance: GROUND_TOLERANCE_METRES }),
    check('source triangle budget', sourceStats.triangles <= MAX_TRIANGLES, { triangles: sourceStats.triangles, maxTriangles: MAX_TRIANGLES }),
    check('optimized triangle budget', optimizedStats.triangles <= MAX_TRIANGLES, { triangles: optimizedStats.triangles, maxTriangles: MAX_TRIANGLES }),
    check('source pivot semantics survive reload', missing(nodes, manifest.source.requiredPivotNames).length === 0, { missing: missing(nodes, manifest.source.requiredPivotNames) }),
    check('source socket semantics survive reload', missing(sockets, manifest.source.requiredSocketNames).length === 0, { missing: missing(sockets, manifest.source.requiredSocketNames) }),
    check('source collider semantics survive reload', missing(colliders, manifest.source.requiredColliderNames).length === 0, { missing: missing(colliders, manifest.source.requiredColliderNames) }),
    check('source action and destruction semantics survive reload', Boolean(metadata) && metadata.animationChannels?.length === manifest.source.actionChannels.length && Object.keys(metadata.destructionGroups ?? {}).length === Object.keys(manifest.source.requiredDestructionGroups).length, { loadedAnimationChannels: metadata?.animationChannels?.length ?? 0, expectedAnimationChannels: manifest.source.actionChannels.length, loadedDestructionGroups: Object.keys(metadata?.destructionGroups ?? {}).length, expectedDestructionGroups: Object.keys(manifest.source.requiredDestructionGroups).length }),
    check('source has no decoder-compression dependency', sourceExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: sourceExtensions }),
    check('optimized export has no decoder-compression dependency', optimizedExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: optimizedExtensions }),
    check('static material separation survives reload', manifest.optimized.materials.length >= 5 && manifest.optimized.materials.every((material) => loadedMaterials.has(material)), { expectedMaterials: manifest.optimized.materials, loadedMaterials: [...loadedMaterials].sort() }),
    check('static bounds match source', maxDelta <= GROUND_TOLERANCE_METRES, { maxDelta, tolerance: GROUND_TOLERANCE_METRES }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = { schemaVersion: 1, assetId: 'well', coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 }, result: checks.every((item) => item.passed) ? 'pass' : 'fail', checks, source: sourceStats, optimized: optimizedStats };
  await writeJson(RESULT_PATH, result);
  return result;
}
const output = document.querySelector('#output');
function write(message) { output.textContent += `${message}\n`; }
window.__WELL_VALIDATION_READY__ = false;
try {
  write('Reloading Well GLBs with GLTFLoader...');
  const result = await validateWellExports();
  result.checks.forEach((item) => write(`${item.passed ? 'PASS' : 'FAIL'}: ${item.name}`));
  write(`Validation result: ${result.result.toUpperCase()}`);
  window.__WELL_VALIDATION_RESULT__ = result; window.__WELL_VALIDATION_READY__ = true;
} catch (error) { write(`Validation failed: ${error.stack || error.message}`); window.__WELL_VALIDATION_ERROR__ = String(error.stack || error.message); }
