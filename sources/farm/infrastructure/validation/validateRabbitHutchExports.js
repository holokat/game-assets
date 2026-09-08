import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animateRabbitHutch, createRabbitHutch } from '../assets/rabbitHutch.js';
import { collectSceneStats } from '../export/staticExportUtils.js';

const SOURCE_PATH = './source-glb/rabbit-hutch.source.glb';
const OPTIMIZED_PATH = './optimized-glb/Rabbit-Hutch.glb';
const MANIFEST_PATH = './manifests/rabbit-hutch.export.json';
const RESULT_PATH = 'manifests/rabbit-hutch.validation.json';
const REVIEW_PATH = 'review/rabbit-hutch/final-review.json';
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
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 2),
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
    for (const surface of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const slot of slots) if (surface?.[slot]) mapped.push(`${surface.name}:${slot}`);
    }
  });
  return mapped.sort();
}

export async function validateRabbitHutchExports() {
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
  const semantics = source.getObjectByName('rabbit-hutch-root')?.userData?.sourceSemantics;
  const authored = createRabbitHutch();
  const hatch = authored.userData.rabbitHutchRig.hatch;
  const cabinet = authored.userData.rabbitHutchRig.cabinet;
  const hatchRest = hatch.rotation.x;
  const cabinetRest = cabinet.rotation.x;
  const timeSeconds = 1.25;
  animateRabbitHutch(authored, timeSeconds);
  const hatchMoved = hatch.rotation.x;
  const cabinetMoved = cabinet.rotation.x;
  authored.userData.sculptRuntime.dispose();
  const mappedTextures = [...mappedTextureSlots(source), ...mappedTextureSlots(optimized)];
  const boundsDelta = maxBoundsDelta(sourceStats, optimizedStats);
  const checks = [
    check('browser GLTFLoader source reload', sourceStats.meshes > 0, { meshes: sourceStats.meshes }),
    check('browser GLTFLoader optimized reload', optimizedStats.meshes > 0, { meshes: optimizedStats.meshes }),
    check('source bytes match manifest', sourceGlb.bytes === manifest.source.bytes, { file: sourceGlb.bytes, manifest: manifest.source.bytes }),
    check('optimized bytes match manifest', optimizedGlb.bytes === manifest.optimized.bytes, { file: optimizedGlb.bytes, manifest: manifest.optimized.bytes }),
    check('exact ground contact survives both reloads', Math.abs(sourceStats.bounds.min[1]) <= TOLERANCE && Math.abs(optimizedStats.bounds.min[1]) <= TOLERANCE, { sourceMinY: sourceStats.bounds.min[1], optimizedMinY: optimizedStats.bounds.min[1], tolerance: TOLERANCE }),
    check('triangle budget', sourceStats.triangles < MAX_TRIANGLES && optimizedStats.triangles < MAX_TRIANGLES, { source: sourceStats.triangles, optimized: optimizedStats.triangles, maximumExclusive: MAX_TRIANGLES }),
    check('optimized uses 4 to 8 draw calls', optimizedStats.drawCalls >= 4 && optimizedStats.drawCalls <= 8, { drawCalls: optimizedStats.drawCalls }),
    check('source pivots survive reload', missing(allNames, manifest.source.requiredPivotNames).length === 0, { missing: missing(allNames, manifest.source.requiredPivotNames), required: manifest.source.requiredPivotNames }),
    check('source sockets survive reload', missing(socketNames, manifest.source.requiredSocketNames).length === 0, { missing: missing(socketNames, manifest.source.requiredSocketNames), required: manifest.source.requiredSocketNames }),
    check('source colliders survive reload', missing(colliderNames, manifest.source.requiredColliderNames).length === 0, { missing: missing(colliderNames, manifest.source.requiredColliderNames), required: manifest.source.requiredColliderNames }),
    check('source destruction groups survive reload', JSON.stringify(semantics?.destructionGroups) === JSON.stringify(manifest.source.requiredDestructionGroups), { destructionGroups: semantics?.destructionGroups }),
    check('only the fold-down service hatch is animated', semantics?.animationChannels?.length === 1 && semantics.animationChannels[0].node === 'rabbit-hutch-fold-down-service-hatch' && semantics.animationChannels[0].property === 'rotation' && semantics.animationChannels[0].axis === 'x', { actionChannels: semantics?.animationChannels ?? [] }),
    check('service hatch opens while cabinet stays fixed', hatchMoved - hatchRest > 0.5 && cabinetMoved === cabinetRest, { timeSeconds, hatchRest, hatchMoved, cabinetRest, cabinetMoved }),
    check('exports are textureless', mappedTextures.length === 0, { mappedTextureSlots: mappedTextures }),
    check('exports need no decoder', [...sourceGlb.extensionsUsed, ...optimizedGlb.extensionsUsed].every((extension) => !DECODER_EXTENSIONS.has(extension)), { sourceExtensions: sourceGlb.extensionsUsed, optimizedExtensions: optimizedGlb.extensionsUsed }),
    check('optimized retains five material families', optimizedStats.materials.length === 5, { materials: optimizedStats.materials }),
    check('optimized bounds match source', boundsDelta <= TOLERANCE, { maxDelta: boundsDelta, tolerance: TOLERANCE }),
    check('optimized export reduces draw calls', optimizedStats.drawCalls < sourceStats.drawCalls, { source: sourceStats.drawCalls, optimized: optimizedStats.drawCalls }),
  ];
  const result = {
    schemaVersion: 1,
    assetId: 'rabbit-hutch',
    validationMethod: 'Browser GLTFLoader reload of source and optimized GLBs',
    result: checks.every((item) => item.passed) ? 'pass' : 'fail',
    checks,
    animationEvidence: { timeSeconds, hatchRest, hatchMoved, cabinetRest, cabinetMoved },
    source: { path: manifest.source.path, bytes: sourceGlb.bytes, ...sourceStats },
    optimized: { path: manifest.optimized.path, bytes: optimizedGlb.bytes, ...optimizedStats },
  };
  await Promise.all([writeJson(RESULT_PATH, result), writeJson(REVIEW_PATH, result)]);
  return result;
}

const output = document.querySelector('#output');
window.__RABBIT_HUTCH_VALIDATION_READY__ = false;
try {
  const result = await validateRabbitHutchExports();
  result.checks.forEach((item) => { output.textContent += `${item.passed ? 'PASS' : 'FAIL'}: ${item.name}\n`; });
  output.textContent += `Validation result: ${result.result.toUpperCase()}\n`;
  window.__RABBIT_HUTCH_VALIDATION_RESULT__ = result;
  window.__RABBIT_HUTCH_VALIDATION_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__RABBIT_HUTCH_VALIDATION_ERROR__ = String(error.stack || error.message);
}
