import { createHandPump } from '../assets/handPump.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './handPumpExportUtils.js';

const SOURCE_PATH = 'source-glb/hand-pump.source.glb';
const STATIC_PATH = 'optimized-glb/Hand-Pump.glb';
const MANIFEST_PATH = 'manifests/hand-pump.export.json';

function byteSize(bytes) {
  return new Blob([bytes]).size;
}

async function uploadArtifact(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`);
  return response.json();
}

function sourceManifestEntry(binary, root, semantics) {
  return {
    path: SOURCE_PATH,
    bytes: byteSize(binary),
    ...collectSceneStats(root),
    semantics: {
      pivots: semantics.pivotNames.length,
      sockets: semantics.socketNames.length,
      colliders: semantics.colliderNames.length,
      destructionGroups: Object.keys(semantics.destructionGroups).length,
      animationChannels: semantics.animationChannels.length,
    },
    runtimeDecoderDependencies: [],
    requiredPivotNames: semantics.pivotNames,
    requiredSocketNames: semantics.socketNames,
    requiredColliderNames: semantics.colliderNames,
    requiredDestructionGroups: semantics.destructionGroups,
    actionChannels: semantics.animationChannels,
    optimizationNotes: ['Preserves authored hierarchy and named semantic nodes in glTF extras.', 'Collider nodes are intentionally exported as visible, mesh-less nodes so onlyVisible export retains their metadata.'],
  };
}

function staticManifestEntry(binary, root) {
  return {
    path: STATIC_PATH,
    bytes: byteSize(binary),
    ...collectSceneStats(root),
    semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 },
    runtimeDecoderDependencies: [],
    optimizationNotes: [
      'Visible meshes are baked into world space and merged only within matching material signatures.',
      'Instanced fasteners are expanded into merged static geometry.',
      'UV, secondary UV, tangent, and skin attributes are removed after checking that every source material has no texture map.',
      'The result requires no mesh, texture, or animation decoder at runtime.',
    ],
  };
}

export async function exportHandPump() {
  const authored = createHandPump({ passId: 'optimization-pass' });
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored);
  try {
    const [sourceBinary, staticBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'hand-pump',
      generatedBy: 'src/export/exportHandPump.js',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: sourceManifestEntry(sourceBinary, source, semantics),
      optimized: staticManifestEntry(staticBinary, optimized),
    };
    await uploadArtifact(SOURCE_PATH, sourceBinary, 'model/gltf-binary');
    await uploadArtifact(STATIC_PATH, staticBinary, 'model/gltf-binary');
    await uploadArtifact(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json');
    return manifest;
  } finally {
    disposeExportRoot(optimized);
    authored.userData.sculptRuntime?.dispose();
  }
}

const output = document.querySelector('#output');
function write(message) {
  output.textContent += `${message}\n`;
}

window.__HAND_PUMP_EXPORT_READY__ = false;
try {
  write('Exporting hierarchy-preserving source GLB and static optimized GLB…');
  const manifest = await exportHandPump();
  write(`Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.meshes} meshes, ${manifest.source.triangles.toLocaleString()} triangles.`);
  write(`Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls, ${manifest.optimized.triangles.toLocaleString()} triangles.`);
  write('Manifest written. Run validate-hand-pump.html next.');
  window.__HAND_PUMP_EXPORT_MANIFEST__ = manifest;
  window.__HAND_PUMP_EXPORT_READY__ = true;
} catch (error) {
  write(`Export failed: ${error.stack || error.message}`);
  window.__HAND_PUMP_EXPORT_ERROR__ = String(error.stack || error.message);
}
