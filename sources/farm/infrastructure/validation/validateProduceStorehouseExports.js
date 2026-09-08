import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/produce-storehouse.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Produce-Storehouse.glb';
const MANIFEST_PATH = './manifests/produce-storehouse.export.json';
const RESULT_PATH = 'manifests/produce-storehouse.validation.json';
const REVIEW_PATH = 'review/produce-storehouse/final-review.json';
const GROUND_TOLERANCE = 0.000001;
const BOUNDS_TOLERANCE = 0.000001;
const MAX_TRIANGLES = 6000;
const DECODER_EXTENSIONS = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression']);
const REQUIRED_SOCKET_IDS = ['ground', 'terrain', 'loading', 'storage', 'ventilation', 'service', 'attachment', 'adjacency'];

const check = (name, passed, details = {}) => ({ name, passed, details });
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

export async function validateProduceStorehouseExports() {
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
  const semantics = source.getObjectByName('produce-storehouse-root')?.userData?.sourceSemantics;
  const channels = semantics?.animationChannels ?? [];
  const channel = channels[0];
  const door = source.getObjectByName('produce-storehouse-sliding-loading-door');
  const animationTimeSeconds = Math.PI / (2 * 0.32);
  const restX = door?.position.x;
  const movedX = restX + Math.sin(animationTimeSeconds * (channel?.frequency ?? 0) + (channel?.phase ?? 0)) * (channel?.amplitude ?? 0);
  const socketFamilies = Object.fromEntries(REQUIRED_SOCKET_IDS.map((id) => [id, socketNames.filter((name) => name === `produce-storehouse-${id}-socket`)]));
  const mappedTextures = [...mappedTextureSlots(source), ...mappedTextureSlots(optimized)];
  const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const checks = [
    check('browser GLTFLoader source reload', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    check('browser GLTFLoader optimized reload', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source bytes match export manifest', sourceGlb.bytes === manifest.source.bytes, { file: sourceGlb.bytes, manifest: manifest.source.bytes }),
    check('optimized bytes match export manifest', optimizedGlb.bytes === manifest.optimized.bytes, { file: optimizedGlb.bytes, manifest: manifest.optimized.bytes }),
    check('source exact ground contact', Math.abs(sourceStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: sourceStats.bounds.min[1], tolerance: GROUND_TOLERANCE }),
    check('optimized exact ground contact', Math.abs(optimizedStats.bounds.min[1]) <= GROUND_TOLERANCE, { minY: optimizedStats.bounds.min[1], tolerance: GROUND_TOLERANCE }),
    check('source under 6000 triangles', sourceStats.triangles < MAX_TRIANGLES, { triangles: sourceStats.triangles, maximumExclusive: MAX_TRIANGLES }),
    check('optimized under 6000 triangles', optimizedStats.triangles < MAX_TRIANGLES, { triangles: optimizedStats.triangles, maximumExclusive: MAX_TRIANGLES }),
    check('optimized uses 4 to 8 draw calls', optimizedStats.drawCalls >= 4 && optimizedStats.drawCalls <= 8, { drawCalls: optimizedStats.drawCalls, minimum: 4, maximum: 8 }),
    check('source pivots survive GLTFLoader reload', missing(allNames, manifest.source.requiredPivotNames).length === 0, { required: manifest.source.requiredPivotNames, missing: missing(allNames, manifest.source.requiredPivotNames) }),
    check('all required socket families survive reload', Object.values(socketFamilies).every((items) => items.length === 1), { socketFamilies }),
    check('source sockets match export manifest', missing(socketNames, manifest.source.requiredSocketNames).length === 0, { required: manifest.source.requiredSocketNames, missing: missing(socketNames, manifest.source.requiredSocketNames) }),
    check('building, platform, and door colliders survive reload', ['produce-storehouse-collider-building', 'produce-storehouse-collider-platform', 'produce-storehouse-collider-door'].every((name) => colliderNames.includes(name)), { colliderNames }),
    check('source colliders match export manifest', missing(colliderNames, manifest.source.requiredColliderNames).length === 0, { required: manifest.source.requiredColliderNames, missing: missing(colliderNames, manifest.source.requiredColliderNames) }),
    check('only the visible sliding door is animated', channels.length === 1 && channel.node === 'produce-storehouse-sliding-loading-door' && channel.property === 'position' && channel.axis === 'x', { actionChannels: channels }),
    check('sliding-door channel produces deterministic motion', Number.isFinite(restX) && Math.abs(movedX - restX) > 1, { timeSeconds: animationTimeSeconds, node: channel?.node, restX, movedX }),
    check('source and optimized exports are textureless', mappedTextures.length === 0, { mappedTextureSlots: mappedTextures }),
    check('source needs no decoder', sourceGlb.extensionsUsed.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: sourceGlb.extensionsUsed }),
    check('optimized needs no decoder', optimizedGlb.extensionsUsed.every((extension) => !DECODER_EXTENSIONS.has(extension)), { extensionsUsed: optimizedGlb.extensionsUsed }),
    check('optimized retains five material families', optimizedStats.materials.length === 5, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= BOUNDS_TOLERANCE, { maxDelta: boundsDelta, tolerance: BOUNDS_TOLERANCE }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = {
    schemaVersion: 1,
    assetId: 'produce-storehouse',
    validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs',
    coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
    result: checks.every((item) => item.passed) ? 'pass' : 'fail',
    checks,
    animationEvidence: {
      timeSeconds: animationTimeSeconds,
      channel,
      restX,
      movedX,
    },
    source: { path: manifest.source.path, bytes: sourceGlb.bytes, ...sourceStats },
    optimized: { path: manifest.optimized.path, bytes: optimizedGlb.bytes, ...optimizedStats },
  };
  await Promise.all([writeJson(RESULT_PATH, result), writeJson(REVIEW_PATH, result)]);
  return result;
}

const output = document.querySelector('#output');
window.__PRODUCE_STOREHOUSE_VALIDATION_READY__ = false;
try {
  const result = await validateProduceStorehouseExports();
  result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; });
  output.textContent += `Validation result: ${result.result.toUpperCase()}\n`;
  window.__PRODUCE_STOREHOUSE_VALIDATION_RESULT__ = result;
  window.__PRODUCE_STOREHOUSE_VALIDATION_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__PRODUCE_STOREHOUSE_VALIDATION_ERROR__ = String(error.stack || error.message);
}
