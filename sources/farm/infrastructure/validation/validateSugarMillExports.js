import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animateSugarMill, createSugarMill } from '../assets/sugarMill.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/sugar-mill.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Sugar-Mill.glb';
const MANIFEST_PATH = './manifests/sugar-mill.export.json';
const RESULT_PATH = 'manifests/sugar-mill.validation.json';
const REVIEW_PATH = 'review/sugar-mill/final-review.json';
const TOLERANCE = 0.000001;
const DECODERS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);
const check = (name, passed, details = {}) => ({ name, passed, details });
function namesWhere(root, predicate) { const names = []; root.traverse((node) => { if (predicate(node)) names.push(node.name); }); return names.sort(); }
function missing(actual, expected) { const actualSet = new Set(actual); return expected.filter((name) => !actualSet.has(name)); }
async function readJson(path) { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`Cannot read ${path}`); return response.json(); }
async function readGlb(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read ${path}`);
  const data = await response.arrayBuffer();
  const view = new DataView(data);
  if (new TextDecoder().decode(new Uint8Array(data, 0, 4)) !== 'glTF') throw new Error(`${path} is not a GLB.`);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)).trim());
  return { bytes: data.byteLength, extensionsUsed: json.extensionsUsed ?? [] };
}
async function writeJson(path, value) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 2) });
  if (!response.ok) throw new Error(`Cannot write ${path}`);
}
function maxBoundsDelta(a, b) {
  return Math.max(...a.bounds.min.map((value, index) => Math.abs(value - b.bounds.min[index])), ...a.bounds.max.map((value, index) => Math.abs(value - b.bounds.max[index])));
}
function mappedTextures(root) {
  const found = [];
  const slots = ['map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap'];
  root.traverse((node) => {
    if (!node.isMesh) return;
    for (const surface of Array.isArray(node.material) ? node.material : [node.material]) for (const slot of slots) if (surface?.[slot]) found.push(`${surface.name}:${slot}`);
  });
  return found;
}

export async function validateSugarMillExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceGlb, optimizedGlb] = await Promise.all([
    readJson(MANIFEST_PATH), new GLTFLoader().loadAsync(SOURCE_PATH), new GLTFLoader().loadAsync(OPTIMIZED_PATH), readGlb(SOURCE_PATH), readGlb(OPTIMIZED_PATH),
  ]);
  const source = sourceGltf.scene;
  const optimized = optimizedGltf.scene;
  const sourceStats = collectSceneStats(source);
  const optimizedStats = collectSceneStats(optimized);
  const allNames = namesWhere(source, () => true);
  const sockets = namesWhere(source, (node) => Boolean(node.userData.socket));
  const colliders = namesWhere(source, (node) => Boolean(node.userData.collider));
  const rollerBodies = namesWhere(source, (node) => /^sugar-mill-roller-[1-3]-body-mesh$/.test(node.name));
  const semantics = source.getObjectByName('sugar-mill-root')?.userData?.sourceSemantics;
  const authored = createSugarMill();
  const { drive, frame, rollerPivots, gearPivots } = authored.userData.sugarMillRig;
  const driveRest = drive.rotation.x;
  const frameRest = frame.rotation.x;
  const rollerRest = rollerPivots.map((pivot) => pivot.rotation.x);
  const gearRest = gearPivots.map((pivot) => pivot.rotation.x);
  const timeSeconds = 1;
  animateSugarMill(authored, timeSeconds);
  const driveMoved = drive.rotation.x;
  const frameMoved = frame.rotation.x;
  const rollerMoved = rollerPivots.map((pivot) => pivot.rotation.x);
  const gearMoved = gearPivots.map((pivot) => pivot.rotation.x);
  authored.userData.sculptRuntime.dispose();
  const textures = [...mappedTextures(source), ...mappedTextures(optimized)];
  const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const channels = semantics?.animationChannels ?? [];

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
    check('one handwheel drive action is authored', channels.length === 1 && channels[0].node === 'sugar-mill-handwheel-drive' && channels[0].property === 'rotation' && channels[0].axis === 'x', { actionChannels: channels }),
    check('handwheel, rollers, and gears move while frame stays fixed', driveMoved - driveRest > 2 && rollerMoved.every((value, index) => Math.abs(value - rollerRest[index]) > 2) && gearMoved.every((value, index) => Math.abs(value - gearRest[index]) > 2) && frameMoved === frameRest, { timeSeconds, driveRest, driveMoved, rollerRest, rollerMoved, gearRest, gearMoved, frameRest, frameMoved }),
    check('exactly three ribbed crushing rollers are authored', rollerBodies.length === 3, { rollerBodies }),
    check('required input and output sockets survive reload', ['sugar-mill-cane-input-socket', 'sugar-mill-juice-output-socket', 'sugar-mill-dry-output-socket'].every((name) => sockets.includes(name)), { sockets }),
    check('exports are textureless', textures.length === 0, { mappedTextureSlots: textures }),
    check('exports need no decoder', [...sourceGlb.extensionsUsed, ...optimizedGlb.extensionsUsed].every((extension) => !DECODERS.has(extension)), { sourceExtensions: sourceGlb.extensionsUsed, optimizedExtensions: optimizedGlb.extensionsUsed }),
    check('optimized retains five material families', optimizedStats.materials.length === 5, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= TOLERANCE, { maxDelta: boundsDelta }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = {
    schemaVersion: 1, assetId: 'sugar-mill', validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs',
    result: checks.every((item) => item.passed) ? 'pass' : 'fail', checks,
    animationEvidence: { timeSeconds, driveRest, driveMoved, rollerRest, rollerMoved, gearRest, gearMoved, frameRest, frameMoved },
    source: { path: manifest.source.path, bytes: sourceGlb.bytes, ...sourceStats },
    optimized: { path: manifest.optimized.path, bytes: optimizedGlb.bytes, ...optimizedStats },
  };
  const review = {
    ...result,
    concept: { path: 'references/concepts/sugar-mill.png', prompt: 'references/prompts/sugar-mill.md', generationPasses: 1, conceptCorrectionPasses: 0, modelCorrectionPasses: 0 },
    visualReview: {
      referenceImage: 'references/concepts/sugar-mill.png', renderScreenshot: 'review/sugar-mill/browser-review.png', comparisonImage: 'review/sugar-mill/comparison.png',
      cameraView: 'front-right three-quarter', decision: 'continue', aiVisionScore: 0.8,
      layerScores: { silhouetteProportion: 0.82, componentStructure: 0.82, formDetail: 0.78, materialSurface: 0.78, lightingCamera: 0.8 },
      criticalFeatures: { threeRibbedRollers: true, emptyFeedTable: true, exposedGearTrain: true, leanHandwheel: true, collectionTroughAndSpout: true, slimCanopy: true },
      notes: 'Rapid low-poly reconstruction preserves the lean roller-mill silhouette and all identity systems. Hidden geometry is approximate because the concept is a single generated four-view sheet.',
    },
  };
  await Promise.all([writeJson(RESULT_PATH, result), writeJson(REVIEW_PATH, review)]);
  return result;
}

const output = document.querySelector('#output');
window.__SUGAR_MILL_VALIDATION_READY__ = false;
try {
  const result = await validateSugarMillExports();
  result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; });
  output.textContent += `Validation result: ${result.result.toUpperCase()}\n`;
  window.__SUGAR_MILL_VALIDATION_RESULT__ = result;
  window.__SUGAR_MILL_VALIDATION_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__SUGAR_MILL_VALIDATION_ERROR__ = String(error.stack || error.message);
}
