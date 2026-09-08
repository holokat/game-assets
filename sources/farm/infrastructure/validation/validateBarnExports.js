import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/barn.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Barn.glb';
const MANIFEST_PATH = './manifests/barn.export.json';
const RESULT_PATH = 'manifests/barn.validation.json';
const REVIEW_PATH = 'review/barn/final-review.json';
const GROUND_TOLERANCE = 0.000001;
const BOUNDS_TOLERANCE = 0.000001;
const MAX_TRIANGLES = 6000;
const MIN_OPTIMIZED_DRAWS = 4;
const MAX_OPTIMIZED_DRAWS = 8;
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

function textureSlots(root) {
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

function channelEvidence(source, channels, timeSeconds) {
  return channels.map((channel) => {
    const node = source.getObjectByName(channel.node);
    const rest = node?.[channel.property]?.[channel.axis];
    const value = rest + Math.sin(timeSeconds * channel.frequency + channel.phase) * channel.amplitude;
    return { node: channel.node, property: channel.property, axis: channel.axis, rest, value };
  });
}

export async function validateBarnExports() {
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
  const allNames = namesWhere(source, () => true);
  const socketNames = namesWhere(source, (node) => Boolean(node.userData.socket));
  const colliderNames = namesWhere(source, (node) => Boolean(node.userData.collider));
  const semantics = source.getObjectByName('barn-root')?.userData?.sourceSemantics;
  const channels = semantics?.animationChannels ?? [];
  const animationTimeSeconds = Math.PI / (2 * 0.35);
  const animationEvidence = channelEvidence(source, channels, animationTimeSeconds);
  const mappedTextures = [...textureSlots(source), ...textureSlots(optimized)];
  const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const expectedChannels = [
    { node: 'barn-left-door', property: 'position', axis: 'x', amplitude: 0.75, frequency: 0.35, phase: 0 },
    { node: 'barn-right-door', property: 'position', axis: 'x', amplitude: -0.75, frequency: 0.35, phase: Math.PI },
  ];
  const channelsExact = expectedChannels.every((expected) => channels.some((actual) =>
    actual.node === expected.node
      && actual.property === expected.property
      && actual.axis === expected.axis
      && Math.abs(actual.amplitude - expected.amplitude) < 1e-12
      && Math.abs(actual.frequency - expected.frequency) < 1e-12
      && Math.abs(actual.phase - expected.phase) < 1e-12));
  const doorsMove = animationEvidence.length === 2
    && animationEvidence.every((item) => Number.isFinite(item.rest) && Math.abs(item.value - item.rest) > 0.7);

  const checks = [
    check('browser GLTFLoader source reload', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    check('browser GLTFLoader optimized reload', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source bytes match export manifest', sourceGlb.bytes === manifest.source.bytes, { file: sourceGlb.bytes, manifest: manifest.source.bytes }),
    check('optimized bytes match export manifest', optimizedGlb.bytes === manifest.optimized.bytes, { file: optimizedGlb.bytes, manifest: manifest.optimized.bytes }),
    check('source exact ground contact', Math.abs(sourceStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: sourceStats.bounds.min[1], tolerance: GROUND_TOLERANCE }),
    check('optimized exact ground contact', Math.abs(optimizedStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: optimizedStats.bounds.min[1], tolerance: GROUND_TOLERANCE }),
    check('source under 6000 triangles', sourceStats.triangles < MAX_TRIANGLES, { triangles: sourceStats.triangles, maximumExclusive: MAX_TRIANGLES }),
    check('optimized under 6000 triangles', optimizedStats.triangles < MAX_TRIANGLES, { triangles: optimizedStats.triangles, maximumExclusive: MAX_TRIANGLES }),
    check('optimized uses 4 to 8 draw calls', optimizedStats.drawCalls >= MIN_OPTIMIZED_DRAWS && optimizedStats.drawCalls <= MAX_OPTIMIZED_DRAWS, { drawCalls: optimizedStats.drawCalls, minimum: MIN_OPTIMIZED_DRAWS, maximum: MAX_OPTIMIZED_DRAWS }),
    check('source pivots survive GLTFLoader reload', missing(allNames, manifest.source.requiredPivotNames).length === 0, { required: manifest.source.requiredPivotNames, missing: missing(allNames, manifest.source.requiredPivotNames) }),
    check('source sockets survive GLTFLoader reload', missing(socketNames, manifest.source.requiredSocketNames).length === 0, { required: manifest.source.requiredSocketNames, missing: missing(socketNames, manifest.source.requiredSocketNames) }),
    check('source colliders survive GLTFLoader reload', missing(colliderNames, manifest.source.requiredColliderNames).length === 0, { required: manifest.source.requiredColliderNames, missing: missing(colliderNames, manifest.source.requiredColliderNames) }),
    check('double sliding-door channels survive reload unchanged', channels.length === 2 && channelsExact, { actionChannels: channels }),
    check('both sliding-door channels produce deterministic motion', doorsMove, { timeSeconds: animationTimeSeconds, samples: animationEvidence }),
    check('source and optimized exports are textureless', mappedTextures.length === 0, { mappedTextureSlots: mappedTextures }),
    check('source needs no decoder', sourceGlb.extensionsUsed.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: sourceGlb.extensionsUsed }),
    check('optimized needs no decoder', optimizedGlb.extensionsUsed.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: optimizedGlb.extensionsUsed }),
    check('optimized retains four material families', optimizedStats.materials.length === 4, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= BOUNDS_TOLERANCE, { maxDelta: boundsDelta, tolerance: BOUNDS_TOLERANCE }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = {
    schemaVersion: 1,
    assetId: 'barn',
    validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs',
    coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
    result: checks.every((item) => item.passed) ? 'pass' : 'fail',
    checks,
    animationEvidence: { timeSeconds: animationTimeSeconds, channels: animationEvidence },
    source: { path: manifest.source.path, bytes: sourceGlb.bytes, ...sourceStats },
    optimized: { path: manifest.optimized.path, bytes: optimizedGlb.bytes, ...optimizedStats },
  };
  await Promise.all([writeJson(RESULT_PATH, result), writeJson(REVIEW_PATH, result)]);
  return result;
}

const output = document.querySelector('#output');
window.__BARN_VALIDATION_READY__ = false;
try {
  const result = await validateBarnExports();
  result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; });
  output.textContent += `Validation result: ${result.result.toUpperCase()}\n`;
  window.__BARN_VALIDATION_RESULT__ = result;
  window.__BARN_VALIDATION_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__BARN_VALIDATION_ERROR__ = String(error.stack || error.message);
}
