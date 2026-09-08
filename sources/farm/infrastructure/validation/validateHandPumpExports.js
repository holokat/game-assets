import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/handPumpExportUtils.js';

const SOURCE_PATH = './source-glb/hand-pump.source.glb';
const STATIC_PATH = './optimized-glb/Hand-Pump.glb';
const MANIFEST_PATH = './manifests/hand-pump.export.json';
const RESULT_PATH = 'manifests/hand-pump.validation.json';
const GROUND_TOLERANCE_METRES = 0.006;
const MAX_TRIANGLES = 5000;
const DECODER_EXTENSIONS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boundsAreFinite(bounds) {
  return [...bounds.min, ...bounds.max, ...bounds.size, ...bounds.center].every(Number.isFinite);
}

function namesWhere(root, predicate) {
  const names = [];
  root.traverse((node) => { if (predicate(node)) names.push(node.name); });
  return names.sort();
}

function includesAll(actual, expected) {
  const available = new Set(actual);
  return expected.filter((name) => !available.has(name));
}

function serializeCheck(name, passed, details) {
  return { name, passed, details };
}

async function readJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`);
  return response.json();
}

async function readGlbExtensions(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`);
  const data = await response.arrayBuffer();
  const view = new DataView(data);
  assert(new TextDecoder().decode(new Uint8Array(data, 0, 4)) === 'glTF', `${path} is not a GLB.`);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)).trim());
  return json.extensionsUsed ?? [];
}

async function writeJson(path, value) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value, null, 2),
  });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

function compareBounds(source, optimized) {
  const sourceBounds = source.bounds;
  const optimizedBounds = optimized.bounds;
  const deltas = sourceBounds.min.map((value, index) => Math.abs(value - optimizedBounds.min[index]))
    .concat(sourceBounds.max.map((value, index) => Math.abs(value - optimizedBounds.max[index])));
  return Math.max(...deltas);
}

export async function validateHandPumpExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceExtensions, optimizedExtensions] = await Promise.all([
    readJson(MANIFEST_PATH),
    new GLTFLoader().loadAsync(SOURCE_PATH),
    new GLTFLoader().loadAsync(STATIC_PATH),
    readGlbExtensions(SOURCE_PATH),
    readGlbExtensions(STATIC_PATH),
  ]);
  const source = sourceGltf.scene;
  const optimized = optimizedGltf.scene;
  const sourceStats = collectSceneStats(source);
  const optimizedStats = collectSceneStats(optimized);
  const sourceSocketNames = namesWhere(source, (node) => Boolean(node.userData.socket));
  const sourceColliderNames = namesWhere(source, (node) => Boolean(node.userData.collider));
  const sourceNodeNames = namesWhere(source, () => true);
  const sourceRoot = source.getObjectByName('hand-pump-root');
  const sourceMetadata = sourceRoot?.userData?.sourceSemantics;
  const staticMaterials = new Set(optimizedStats.materials);
  const expectedMaterials = manifest.optimized.materials;
  const boundsDelta = compareBounds(sourceStats, optimizedStats);
  const checks = [
    serializeCheck('source scene is nonempty', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    serializeCheck('optimized scene is nonempty', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    serializeCheck('source bounds are finite', boundsAreFinite(sourceStats.bounds), sourceStats.bounds),
    serializeCheck('optimized bounds are finite', boundsAreFinite(optimizedStats.bounds), optimizedStats.bounds),
    serializeCheck('source ground contact', Math.abs(sourceStats.bounds.min[1]) <= GROUND_TOLERANCE_METRES, { minY: sourceStats.bounds.min[1], tolerance: GROUND_TOLERANCE_METRES }),
    serializeCheck('optimized ground contact', Math.abs(optimizedStats.bounds.min[1]) <= GROUND_TOLERANCE_METRES, { minY: optimizedStats.bounds.min[1], tolerance: GROUND_TOLERANCE_METRES }),
    serializeCheck('source triangle budget', sourceStats.triangles <= MAX_TRIANGLES, { triangles: sourceStats.triangles, maxTriangles: MAX_TRIANGLES }),
    serializeCheck('optimized triangle budget', optimizedStats.triangles <= MAX_TRIANGLES, { triangles: optimizedStats.triangles, maxTriangles: MAX_TRIANGLES }),
    serializeCheck('source pivot semantics survive reload', includesAll(sourceNodeNames, manifest.source.requiredPivotNames).length === 0, { missing: includesAll(sourceNodeNames, manifest.source.requiredPivotNames) }),
    serializeCheck('source socket semantics survive reload', includesAll(sourceSocketNames, manifest.source.requiredSocketNames).length === 0, { missing: includesAll(sourceSocketNames, manifest.source.requiredSocketNames) }),
    serializeCheck('source collider semantics survive reload', includesAll(sourceColliderNames, manifest.source.requiredColliderNames).length === 0, { missing: includesAll(sourceColliderNames, manifest.source.requiredColliderNames) }),
    serializeCheck('source semantic metadata survives reload', Boolean(sourceMetadata)
      && sourceMetadata.animationChannels?.length === manifest.source.actionChannels.length
      && Object.keys(sourceMetadata.destructionGroups ?? {}).length === Object.keys(manifest.source.requiredDestructionGroups).length, {
      loadedAnimationChannels: sourceMetadata?.animationChannels?.length ?? 0,
      expectedAnimationChannels: manifest.source.actionChannels.length,
      loadedDestructionGroups: Object.keys(sourceMetadata?.destructionGroups ?? {}).length,
      expectedDestructionGroups: Object.keys(manifest.source.requiredDestructionGroups).length,
    }),
    serializeCheck('source has no decoder-compression dependency', sourceExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: sourceExtensions }),
    serializeCheck('optimized export has no decoder-compression dependency', optimizedExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: optimizedExtensions }),
    serializeCheck('static material separation survives reload', expectedMaterials.length >= 3 && includesAll(staticMaterials, expectedMaterials).length === 0, { expectedMaterials, loadedMaterials: [...staticMaterials].sort() }),
    serializeCheck('static bounds match source', boundsDelta <= GROUND_TOLERANCE_METRES, { maxDelta: boundsDelta, tolerance: GROUND_TOLERANCE_METRES }),
    serializeCheck('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = {
    schemaVersion: 1,
    assetId: 'hand-pump',
    coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
    result: checks.every((check) => check.passed) ? 'pass' : 'fail',
    checks,
    source: sourceStats,
    optimized: optimizedStats,
  };
  await writeJson(RESULT_PATH, result);
  return result;
}

const output = document.querySelector('#output');
function write(message) {
  output.textContent += `${message}\n`;
}

window.__HAND_PUMP_VALIDATION_READY__ = false;
try {
  write('Reloading exported GLBs with GLTFLoader…');
  const result = await validateHandPumpExports();
  result.checks.forEach((check) => write(`${check.passed ? 'PASS' : 'FAIL'}: ${check.name}`));
  write(`Validation result: ${result.result.toUpperCase()}`);
  window.__HAND_PUMP_VALIDATION_RESULT__ = result;
  window.__HAND_PUMP_VALIDATION_READY__ = true;
} catch (error) {
  write(`Validation failed: ${error.stack || error.message}`);
  window.__HAND_PUMP_VALIDATION_ERROR__ = String(error.stack || error.message);
}
