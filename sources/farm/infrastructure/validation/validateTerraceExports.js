import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/terrace.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Terrace.glb';
const MANIFEST_PATH = './manifests/terrace.export.json';
const RESULT_PATH = 'manifests/terrace.validation.json';
const GROUND_TOLERANCE = 0.006;
const MAX_TRIANGLES = 2500;
const DECODER_EXTENSIONS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);

const check = (name, passed, details) => ({ name, passed, details });
const missing = (actual, expected) => {
  const present = new Set(actual);
  return expected.filter((value) => !present.has(value));
};
const namesWhere = (root, predicate) => {
  const names = [];
  root.traverse((node) => { if (predicate(node)) names.push(node.name); });
  return names.sort();
};

async function readJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`);
  return response.json();
}

async function writeJson(path, value) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value, null, 2),
  });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

async function extensionsUsed(path) {
  const response = await fetch(path, { cache: 'no-store' });
  const data = await response.arrayBuffer();
  const view = new DataView(data);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)).trim());
  return json.extensionsUsed ?? [];
}

function maxBoundsDelta(a, b) {
  return Math.max(
    ...a.bounds.min.map((value, index) => Math.abs(value - b.bounds.min[index])),
    ...a.bounds.max.map((value, index) => Math.abs(value - b.bounds.max[index])),
  );
}

export async function validateTerraceExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceExtensions, optimizedExtensions] = await Promise.all([
    readJson(MANIFEST_PATH),
    new GLTFLoader().loadAsync(SOURCE_PATH),
    new GLTFLoader().loadAsync(OPTIMIZED_PATH),
    extensionsUsed(SOURCE_PATH),
    extensionsUsed(OPTIMIZED_PATH),
  ]);
  const source = sourceGltf.scene;
  const optimized = optimizedGltf.scene;
  const sourceStats = collectSceneStats(source);
  const optimizedStats = collectSceneStats(optimized);
  const nodeNames = namesWhere(source, () => true);
  const socketNames = namesWhere(source, (node) => Boolean(node.userData.socket));
  const colliderNames = namesWhere(source, (node) => Boolean(node.userData.collider));
  const metadata = source.getObjectByName('terrace-root')?.userData?.sourceSemantics;
  const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const terrainSockets = manifest.source.requiredSocketNames.filter((name) => name.includes('-terrain-socket'));
  const drainSockets = manifest.source.requiredSocketNames.filter((name) => name.includes('drain-'));
  const adjacencySockets = manifest.source.requiredSocketNames.filter((name) => name.includes('adjacency'));
  const checks = [
    check('source scene is nonempty', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    check('optimized scene is nonempty', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source ground contact', Math.abs(sourceStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: sourceStats.bounds.min[1] }),
    check('optimized ground contact', Math.abs(optimizedStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: optimizedStats.bounds.min[1] }),
    check('source triangle budget', sourceStats.triangles <= MAX_TRIANGLES, { triangles: sourceStats.triangles, max: MAX_TRIANGLES }),
    check('optimized triangle budget', optimizedStats.triangles <= MAX_TRIANGLES, { triangles: optimizedStats.triangles, max: MAX_TRIANGLES }),
    check('source pivots survive GLTFLoader reload', missing(nodeNames, manifest.source.requiredPivotNames).length === 0, { missing: missing(nodeNames, manifest.source.requiredPivotNames) }),
    check('source sockets survive GLTFLoader reload', missing(socketNames, manifest.source.requiredSocketNames).length === 0, { missing: missing(socketNames, manifest.source.requiredSocketNames) }),
    check('source colliders survive GLTFLoader reload', missing(colliderNames, manifest.source.requiredColliderNames).length === 0, { missing: missing(colliderNames, manifest.source.requiredColliderNames) }),
    check('source gameplay metadata survives GLTFLoader reload', Boolean(metadata) && metadata.animationChannels?.length === 0, { animationChannels: metadata?.animationChannels?.length ?? -1 }),
    check('terrain socket family is complete', terrainSockets.length === 3, { terrainSockets }),
    check('drain socket family is complete', drainSockets.length === 2, { drainSockets }),
    check('adjacency socket family is complete', adjacencySockets.length === 5, { adjacencySockets }),
    check('source has no fabricated action channels', manifest.source.actionChannels.length === 0, { actionChannels: manifest.source.actionChannels.length }),
    check('source needs no decoder', sourceExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: sourceExtensions }),
    check('optimized needs no decoder', optimizedExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: optimizedExtensions }),
    check('optimized uses 2 to 5 draw calls', optimizedStats.drawCalls >= 2 && optimizedStats.drawCalls <= 5, { drawCalls: optimizedStats.drawCalls, minimum: 2, maximum: 5 }),
    check('optimized retains four material families', optimizedStats.materials.length === 4, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= GROUND_TOLERANCE, { maxDelta: boundsDelta }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = {
    schemaVersion: 1,
    assetId: 'terrace',
    validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs',
    result: checks.every((item) => item.passed) ? 'pass' : 'fail',
    checks,
    source: sourceStats,
    optimized: optimizedStats,
  };
  await writeJson(RESULT_PATH, result);
  return result;
}

const output = document.querySelector('#output');
window.__TERRACE_VALIDATION_READY__ = false;
try {
  const result = await validateTerraceExports();
  result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; });
  output.textContent += `Validation result: ${result.result.toUpperCase()}\n`;
  window.__TERRACE_VALIDATION_RESULT__ = result;
  window.__TERRACE_VALIDATION_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__TERRACE_VALIDATION_ERROR__ = String(error.stack || error.message);
}
