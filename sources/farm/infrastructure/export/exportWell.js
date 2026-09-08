import { createWell } from '../assets/well.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './handPumpExportUtils.js';

const SOURCE_PATH = 'source-glb/well.source.glb';
const STATIC_PATH = 'optimized-glb/Well.glb';
const MANIFEST_PATH = 'manifests/well.export.json';

function bytes(binary) { return new Blob([binary]).size; }

async function upload(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST', headers: { 'Content-Type': contentType }, body,
  });
  if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`);
}

function sourceEntry(binary, root, semantics) {
  return {
    path: SOURCE_PATH, bytes: bytes(binary), ...collectSceneStats(root),
    semantics: {
      pivots: semantics.pivotNames.length, sockets: semantics.socketNames.length,
      colliders: semantics.colliderNames.length, destructionGroups: Object.keys(semantics.destructionGroups).length,
      animationChannels: semantics.animationChannels.length,
    },
    runtimeDecoderDependencies: [],
    requiredPivotNames: semantics.pivotNames,
    requiredSocketNames: semantics.socketNames,
    requiredColliderNames: semantics.colliderNames,
    requiredDestructionGroups: semantics.destructionGroups,
    actionChannels: semantics.animationChannels,
    optimizationNotes: [
      'Preserves authored hierarchy and named semantic nodes in glTF extras.',
      'Collider nodes are exported as visible mesh-less nodes so their metadata survives onlyVisible export.',
    ],
  };
}

function optimizedEntry(binary, root) {
  return {
    path: STATIC_PATH, bytes: bytes(binary), ...collectSceneStats(root),
    semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 },
    runtimeDecoderDependencies: [],
    optimizationNotes: [
      'Visible meshes are baked to world space and aggressively merged only by matching textureless material signatures.',
      'Repeated wedges, wraps, staves, hardware, and hoops are flattened to static compatible geometry.',
      'Unused UV, tangent, skin, and secondary-UV attributes are removed after confirming no material uses a texture map.',
      'The result needs no mesh, texture, or animation decoder at runtime. Source GLB retains rig semantics.',
    ],
  };
}

export async function exportWell() {
  const authored = createWell({ passId: 'optimization-pass' });
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored);
  optimized.name = 'Well';
  try {
    const [sourceBinary, staticBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1, assetId: 'well', generatedBy: 'src/export/exportWell.js',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: sourceEntry(sourceBinary, source, semantics), optimized: optimizedEntry(staticBinary, optimized),
    };
    await upload(SOURCE_PATH, sourceBinary, 'model/gltf-binary');
    await upload(STATIC_PATH, staticBinary, 'model/gltf-binary');
    await upload(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json');
    return manifest;
  } finally {
    disposeExportRoot(optimized);
    authored.userData.sculptRuntime?.dispose();
  }
}

const output = document.querySelector('#output');
function write(message) { output.textContent += `${message}\n`; }
window.__WELL_EXPORT_READY__ = false;
try {
  write('Exporting Well source hierarchy and static optimized GLB...');
  const manifest = await exportWell();
  write(`Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.meshes} meshes, ${manifest.source.triangles.toLocaleString()} triangles.`);
  write(`Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls, ${manifest.optimized.triangles.toLocaleString()} triangles.`);
  window.__WELL_EXPORT_MANIFEST__ = manifest;
  window.__WELL_EXPORT_READY__ = true;
} catch (error) {
  write(`Export failed: ${error.stack || error.message}`);
  window.__WELL_EXPORT_ERROR__ = String(error.stack || error.message);
}
