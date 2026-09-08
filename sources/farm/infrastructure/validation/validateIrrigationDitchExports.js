import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/irrigation-ditch.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Irrigation-Ditch.glb';
const MANIFEST_PATH = './manifests/irrigation-ditch.export.json';
const RESULT_PATH = 'manifests/irrigation-ditch.validation.json';
const DECODERS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);

function item(name, passed, details) { return { name, passed, details }; }
async function json(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read ${path}.`);
  return response.json();
}
async function extensions(path) {
  const buffer = await (await fetch(path, { cache: 'no-store' })).arrayBuffer();
  const length = new DataView(buffer).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)).trim()).extensionsUsed ?? [];
}
function names(root, predicate) {
  const values = [];
  root.traverse((node) => { if (predicate(node)) values.push(node.name); });
  return values;
}
function absent(actual, expected) {
  const set = new Set(actual);
  return expected.filter((value) => !set.has(value));
}
function boundsDelta(a, b) {
  return Math.max(...a.bounds.min.map((value, index) => Math.abs(value - b.bounds.min[index])), ...a.bounds.max.map((value, index) => Math.abs(value - b.bounds.max[index])));
}

export async function validateIrrigationDitchExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceExtensions, optimizedExtensions] = await Promise.all([
    json(MANIFEST_PATH),
    new GLTFLoader().loadAsync(SOURCE_PATH),
    new GLTFLoader().loadAsync(OPTIMIZED_PATH),
    extensions(SOURCE_PATH),
    extensions(OPTIMIZED_PATH),
  ]);
  const source = sourceGltf.scene;
  const optimized = optimizedGltf.scene;
  const sourceStats = collectSceneStats(source);
  const optimizedStats = collectSceneStats(optimized);
  const allNames = names(source, () => true);
  const socketNames = names(source, (node) => Boolean(node.userData.socket));
  const colliderNames = names(source, (node) => Boolean(node.userData.collider));
  const delta = boundsDelta(sourceStats, optimizedStats);
  const checks = [
    item('source scene is nonempty', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    item('optimized scene is nonempty', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    item('source ground contact', Math.abs(sourceStats.bounds.min[1]) <= 0.006, { minY: sourceStats.bounds.min[1] }),
    item('optimized ground contact', Math.abs(optimizedStats.bounds.min[1]) <= 0.006, { minY: optimizedStats.bounds.min[1] }),
    item('triangle budget', sourceStats.triangles <= 5000 && optimizedStats.triangles <= 5000, { source: sourceStats.triangles, optimized: optimizedStats.triangles }),
    item('pivots survive reload', absent(allNames, manifest.source.requiredPivotNames).length === 0, { missing: absent(allNames, manifest.source.requiredPivotNames) }),
    item('flow sockets survive reload', absent(socketNames, manifest.source.requiredSocketNames).length === 0, { missing: absent(socketNames, manifest.source.requiredSocketNames) }),
    item('colliders survive reload', absent(colliderNames, manifest.source.requiredColliderNames).length === 0, { missing: absent(colliderNames, manifest.source.requiredColliderNames) }),
    item('static action policy is explicit', manifest.source.actionChannels.length === 0, { actionChannels: manifest.source.actionChannels.length }),
    item('source needs no decoder', sourceExtensions.every((value) => !DECODERS.has(value)), { extensionsUsed: sourceExtensions }),
    item('optimized needs no decoder', optimizedExtensions.every((value) => !DECODERS.has(value)), { extensionsUsed: optimizedExtensions }),
    item('bounds match', delta <= 0.006, { maxDelta: delta }),
    item('draw calls reduced', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = { schemaVersion: 1, assetId: 'irrigation-ditch', result: checks.every((check) => check.passed) ? 'pass' : 'fail', checks, source: sourceStats, optimized: optimizedStats };
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(RESULT_PATH)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result, null, 2) });
  if (!response.ok) throw new Error(`Cannot write ${RESULT_PATH}.`);
  return result;
}

const output = document.querySelector('#output');
window.__IRRIGATION_DITCH_VALIDATION_READY__ = false;
try {
  const result = await validateIrrigationDitchExports();
  result.checks.forEach((check) => { output.textContent += `${check.passed ? 'PASS' : 'FAIL'}: ${check.name}\n`; });
  output.textContent += `Validation result: ${result.result.toUpperCase()}\n`;
  window.__IRRIGATION_DITCH_VALIDATION_RESULT__ = result;
  window.__IRRIGATION_DITCH_VALIDATION_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__IRRIGATION_DITCH_VALIDATION_ERROR__ = String(error.stack || error.message);
}
