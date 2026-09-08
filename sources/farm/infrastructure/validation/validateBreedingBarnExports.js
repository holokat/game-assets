import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/breeding-barn.source.glb'; const OPTIMIZED_PATH = './optimized-glb/Breeding-Barn.glb';
const MANIFEST_PATH = './manifests/breeding-barn.export.json'; const RESULT_PATH = 'manifests/breeding-barn.validation.json';
const GROUND_TOLERANCE = 0.000001; const MAX_TRIANGLES = 5000; const DECODER_EXTENSIONS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);
const check = (name, passed, details) => ({ name, passed, details }); const missing = (actual, expected) => { const present = new Set(actual); return expected.filter((value) => !present.has(value)); };
const namesWhere = (root, predicate) => { const names = []; root.traverse((node) => { if (predicate(node)) names.push(node.name); }); return names.sort(); };
async function readJson(path) { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`); return response.json(); }
async function writeJson(path, value) { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 2) }); if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`); }
async function extensionsUsed(path) { const response = await fetch(path, { cache: 'no-store' }); const data = await response.arrayBuffer(); const view = new DataView(data); const jsonLength = view.getUint32(12, true); const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)).trim()); return json.extensionsUsed ?? []; }
function maxBoundsDelta(a, b) { return Math.max(...a.bounds.min.map((value, index) => Math.abs(value - b.bounds.min[index])), ...a.bounds.max.map((value, index) => Math.abs(value - b.bounds.max[index]))); }

export async function validateBreedingBarnExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceExtensions, optimizedExtensions] = await Promise.all([readJson(MANIFEST_PATH), new GLTFLoader().loadAsync(SOURCE_PATH), new GLTFLoader().loadAsync(OPTIMIZED_PATH), extensionsUsed(SOURCE_PATH), extensionsUsed(OPTIMIZED_PATH)]);
  const source = sourceGltf.scene; const optimized = optimizedGltf.scene; const sourceStats = collectSceneStats(source); const optimizedStats = collectSceneStats(optimized);
  const nodeNames = namesWhere(source, () => true); const socketNames = namesWhere(source, (node) => Boolean(node.userData.socket)); const colliderNames = namesWhere(source, (node) => Boolean(node.userData.collider));
  const metadata = source.getObjectByName('breeding-barn-root')?.userData?.sourceSemantics; const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const requiredFamilies = ['ground', 'terrain', 'livestock-entry', 'livestock-exit', 'bay-a', 'bay-b', 'transfer', 'water-input', 'power-input', 'ventilation', 'service', 'attachment', 'adjacency'];
  const socketFamilies = Object.fromEntries(requiredFamilies.map((family) => [family, manifest.source.requiredSocketNames.filter((name) => name.includes(family))]));
  const ventFrames = nodeNames.filter((name) => /^breeding-barn-vent-[12]-frame-mesh$/.test(name));
  const externalGatePivots = ['breeding-barn-bay-a-external-gate', 'breeding-barn-bay-b-external-gate'].filter((name) => nodeNames.includes(name));
  const checks = [
    check('source scene is nonempty', sourceStats.meshes > 0, { meshes: sourceStats.meshes }), check('optimized scene is nonempty', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source has exact ground contact', Math.abs(sourceStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: sourceStats.bounds.min[1], tolerance: GROUND_TOLERANCE }), check('optimized has exact ground contact', Math.abs(optimizedStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: optimizedStats.bounds.min[1], tolerance: GROUND_TOLERANCE }),
    check('source triangle budget', sourceStats.triangles <= MAX_TRIANGLES, { triangles: sourceStats.triangles, max: MAX_TRIANGLES }), check('optimized triangle budget', optimizedStats.triangles <= MAX_TRIANGLES, { triangles: optimizedStats.triangles, max: MAX_TRIANGLES }),
    check('source pivots survive GLTFLoader reload', missing(nodeNames, manifest.source.requiredPivotNames).length === 0, { missing: missing(nodeNames, manifest.source.requiredPivotNames) }), check('source sockets survive GLTFLoader reload', missing(socketNames, manifest.source.requiredSocketNames).length === 0, { missing: missing(socketNames, manifest.source.requiredSocketNames) }),
    check('source colliders survive GLTFLoader reload', missing(colliderNames, manifest.source.requiredColliderNames).length === 0, { missing: missing(colliderNames, manifest.source.requiredColliderNames) }), check('source gameplay metadata survives GLTFLoader reload', Boolean(metadata) && metadata.animationChannels?.length === 1, { animationChannels: metadata?.animationChannels?.length ?? -1 }),
    check('required socket families are complete', Object.values(socketFamilies).every((values) => values.length > 0), { socketFamilies }),
    check('two ventilation panels are authored', ventFrames.length === 2, { ventilationPanels: ventFrames.length }), check('two external livestock gates are authored', externalGatePivots.length === 2, { externalGatePivots }),
    check('only internal transfer gate action channel is authored', manifest.source.actionChannels.length === 1 && manifest.source.actionChannels[0].node === 'breeding-barn-internal-transfer-gate', { actionChannels: manifest.source.actionChannels }),
    check('source needs no decoder', sourceExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: sourceExtensions }), check('optimized needs no decoder', optimizedExtensions.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: optimizedExtensions }),
    check('optimized uses 4 to 6 draw calls', optimizedStats.drawCalls >= 4 && optimizedStats.drawCalls <= 6, { drawCalls: optimizedStats.drawCalls, minimum: 4, maximum: 6 }), check('optimized retains five material families', optimizedStats.materials.length === 5, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= GROUND_TOLERANCE, { maxDelta: boundsDelta }), check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = { schemaVersion: 1, assetId: 'breeding-barn', validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs', result: checks.every((item) => item.passed) ? 'pass' : 'fail', checks, source: sourceStats, optimized: optimizedStats };
  await writeJson(RESULT_PATH, result); return result;
}

const output = document.querySelector('#output'); window.__BREEDING_BARN_VALIDATION_READY__ = false;
try { const result = await validateBreedingBarnExports(); result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; }); output.textContent += `Validation result: ${result.result.toUpperCase()}\n`; window.__BREEDING_BARN_VALIDATION_RESULT__ = result; window.__BREEDING_BARN_VALIDATION_READY__ = true; }
catch (error) { output.textContent += `${error.stack || error.message}\n`; window.__BREEDING_BARN_VALIDATION_ERROR__ = String(error.stack || error.message); }
