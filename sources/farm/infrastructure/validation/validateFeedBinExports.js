import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/feed-bin.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Feed-Bin.glb';
const MANIFEST_PATH = './manifests/feed-bin.export.json';
const RESULT_PATH = 'manifests/feed-bin.validation.json';
const REVIEW_PATH = 'review/feed-bin/final-review.json';
const TOLERANCE = 0.000001;
const MAX_TRIANGLES = 6000;
const DECODER_EXTENSIONS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);

const check = (name, passed, details = {}) => ({ name, passed, details });
const namesWhere = (root, predicate) => {
  const names = [];
  root.traverse((node) => { if (predicate(node)) names.push(node.name); });
  return names.sort();
};
const missing = (actual, expected) => {
  const present = new Set(actual);
  return expected.filter((value) => !present.has(value));
};

async function readJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`);
  return response.json();
}

async function readGlb(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read ${path}: ${response.status}`);
  const data = await response.arrayBuffer();
  const view = new DataView(data);
  if (new TextDecoder().decode(new Uint8Array(data, 0, 4)) !== 'glTF') throw new Error(`${path} is not a GLB.`);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)).trim());
  return { bytes: data.byteLength, extensionsUsed: json.extensionsUsed ?? [] };
}

async function writeJson(path, value) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value, null, 2),
  });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

function maxBoundsDelta(a, b) {
  return Math.max(
    ...a.bounds.min.map((value, index) => Math.abs(value - b.bounds.min[index])),
    ...a.bounds.max.map((value, index) => Math.abs(value - b.bounds.max[index])),
  );
}

function mappedTextureSlots(root) {
  const mapped = [];
  const slots = ['map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap'];
  root.traverse((node) => {
    if (!node.isMesh) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const slot of slots) if (material?.[slot]) mapped.push(`${material.name}:${slot}`);
    }
  });
  return mapped.sort();
}

function semanticEvidence(root, manifestSection) {
  const allNames = namesWhere(root, () => true);
  const socketNames = namesWhere(root, (node) => Boolean(node.userData.socket));
  const colliderNames = namesWhere(root, (node) => Boolean(node.userData.collider));
  return {
    missingPivots: missing(allNames, manifestSection.requiredPivotNames),
    missingSockets: missing(socketNames, manifestSection.requiredSocketNames),
    missingColliders: missing(colliderNames, manifestSection.requiredColliderNames),
  };
}

export async function validateFeedBinExports() {
  const [manifest, sourceGltf, optimizedGltf, sourceGlb, optimizedGlb] = await Promise.all([
    readJson(MANIFEST_PATH),
    new GLTFLoader().loadAsync(SOURCE_PATH),
    new GLTFLoader().loadAsync(OPTIMIZED_PATH),
    readGlb(SOURCE_PATH),
    readGlb(OPTIMIZED_PATH),
  ]);
  const source = sourceGltf.scene;
  const optimized = optimizedGltf.scene;
  const sourceStats = collectSceneStats(source);
  const optimizedStats = collectSceneStats(optimized);
  const sourceSemantics = source.getObjectByName('feed-bin-root')?.userData?.sourceSemantics;
  const optimizedSemantics = optimized.getObjectByName('Feed-Bin')?.userData?.sourceSemantics;
  const sourceEvidence = semanticEvidence(source, manifest.source);
  const optimizedEvidence = semanticEvidence(optimized, manifest.optimized);
  const channel = sourceSemantics?.animationChannels?.[0];
  const gate = source.getObjectByName('feed-bin-dispensing-gate');
  const timeSeconds = Math.PI / (2 * 0.55);
  const restY = gate?.position.y;
  const movedY = restY + Math.sin(timeSeconds * (channel?.frequency ?? 0) + (channel?.phase ?? 0)) * (channel?.amplitude ?? 0);
  const mappedTextures = [...mappedTextureSlots(source), ...mappedTextureSlots(optimized)];
  const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const destructionGroupsMatch = JSON.stringify(sourceSemantics?.destructionGroups) === JSON.stringify(manifest.source.requiredDestructionGroups)
    && JSON.stringify(optimizedSemantics?.destructionGroups) === JSON.stringify(manifest.optimized.requiredDestructionGroups);
  const checks = [
    check('browser GLTFLoader source reload', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    check('browser GLTFLoader optimized reload', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source bytes match manifest', sourceGlb.bytes === manifest.source.bytes, { file: sourceGlb.bytes, manifest: manifest.source.bytes }),
    check('optimized bytes match manifest', optimizedGlb.bytes === manifest.optimized.bytes, { file: optimizedGlb.bytes, manifest: manifest.optimized.bytes }),
    check('exact ground contact survives both reloads', Math.abs(sourceStats.bounds.min[1]) <= TOLERANCE && Math.abs(optimizedStats.bounds.min[1]) <= TOLERANCE, { sourceMinY: sourceStats.bounds.min[1], optimizedMinY: optimizedStats.bounds.min[1], tolerance: TOLERANCE }),
    check('triangle budget', sourceStats.triangles < MAX_TRIANGLES && optimizedStats.triangles < MAX_TRIANGLES, { source: sourceStats.triangles, optimized: optimizedStats.triangles, maximumExclusive: MAX_TRIANGLES }),
    check('optimized uses 4 to 8 draw calls', optimizedStats.drawCalls >= 4 && optimizedStats.drawCalls <= 8, { drawCalls: optimizedStats.drawCalls }),
    check('source pivots, sockets, and colliders survive reload', Object.values(sourceEvidence).every((items) => items.length === 0), sourceEvidence),
    check('optimized pivots, sockets, and colliders survive reload', Object.values(optimizedEvidence).every((items) => items.length === 0), optimizedEvidence),
    check('destruction groups survive source and optimized reloads', destructionGroupsMatch, { source: sourceSemantics?.destructionGroups, optimized: optimizedSemantics?.destructionGroups }),
    check('only the visible dispensing gate is animated', sourceSemantics?.animationChannels?.length === 1 && channel?.node === 'feed-bin-dispensing-gate' && channel?.property === 'position' && channel?.axis === 'y', { actionChannels: sourceSemantics?.animationChannels ?? [] }),
    check('optimized action metadata matches source', JSON.stringify(optimizedSemantics?.animationChannels) === JSON.stringify(sourceSemantics?.animationChannels), { source: sourceSemantics?.animationChannels, optimized: optimizedSemantics?.animationChannels }),
    check('dispensing gate produces deterministic motion', Number.isFinite(restY) && Math.abs(movedY - restY) > 0.35, { timeSeconds, restY, movedY }),
    check('exports are textureless', mappedTextures.length === 0, { mappedTextureSlots: mappedTextures }),
    check('exports need no decoder', [...sourceGlb.extensionsUsed, ...optimizedGlb.extensionsUsed].every((extension) => !DECODER_EXTENSIONS.has(extension)), { sourceExtensions: sourceGlb.extensionsUsed, optimizedExtensions: optimizedGlb.extensionsUsed }),
    check('optimized retains four material families', optimizedStats.materials.length === 4, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= TOLERANCE, { maxDelta: boundsDelta, tolerance: TOLERANCE }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = {
    schemaVersion: 1,
    assetId: 'feed-bin',
    validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs',
    result: checks.every((item) => item.passed) ? 'pass' : 'fail',
    checks,
    animationEvidence: { timeSeconds, node: channel?.node, restY, movedY, channel },
    source: { path: manifest.source.path, bytes: sourceGlb.bytes, ...sourceStats },
    optimized: { path: manifest.optimized.path, bytes: optimizedGlb.bytes, ...optimizedStats },
  };
  await Promise.all([writeJson(RESULT_PATH, result), writeJson(REVIEW_PATH, result)]);
  return result;
}

const output = document.querySelector('#output');
window.__FEED_BIN_VALIDATION_READY__ = false;
try {
  const result = await validateFeedBinExports();
  result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; });
  output.textContent += `Validation result: ${result.result.toUpperCase()}\n`;
  window.__FEED_BIN_VALIDATION_RESULT__ = result;
  window.__FEED_BIN_VALIDATION_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__FEED_BIN_VALIDATION_ERROR__ = String(error.stack || error.message);
}
