import { createTerrace } from '../assets/terrace.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/terrace.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Terrace.glb';
const MANIFEST_PATH = 'manifests/terrace.export.json';

async function upload(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`);
}

function byteSize(bytes) {
  return new Blob([bytes]).size;
}

export async function exportTerrace() {
  const authored = createTerrace({ passId: 'optimization-pass' });
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored, 'Terrace');
  try {
    const [sourceBinary, optimizedBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'terrace',
      generatedBy: 'src/export/exportTerrace.js',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: {
        path: SOURCE_PATH,
        bytes: byteSize(sourceBinary),
        ...collectSceneStats(source),
        semantics: {
          pivots: semantics.pivotNames.length,
          sockets: semantics.socketNames.length,
          colliders: semantics.colliderNames.length,
          destructionGroups: Object.keys(semantics.destructionGroups).length,
          animationChannels: semantics.animationChannels.length,
        },
        requiredPivotNames: semantics.pivotNames,
        requiredSocketNames: semantics.socketNames,
        requiredColliderNames: semantics.colliderNames,
        requiredDestructionGroups: semantics.destructionGroups,
        actionChannels: semantics.animationChannels,
        runtimeDecoderDependencies: [],
      },
      optimized: {
        path: OPTIMIZED_PATH,
        bytes: byteSize(optimizedBinary),
        ...collectSceneStats(optimized),
        semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 },
        runtimeDecoderDependencies: [],
        optimizationNotes: [
          'Visible geometry is baked to world space and merged by compatible material signature.',
          'The optimized GLB is textureless and requires no mesh or texture decoder.',
          'Use the source GLB when terrain, drain, adjacency, collider, or destruction semantics are required.',
        ],
      },
    };
    await upload(SOURCE_PATH, sourceBinary, 'model/gltf-binary');
    await upload(OPTIMIZED_PATH, optimizedBinary, 'model/gltf-binary');
    await upload(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json');
    return manifest;
  } finally {
    disposeExportRoot(optimized);
    authored.userData.sculptRuntime?.dispose();
  }
}

const output = document.querySelector('#output');
window.__TERRACE_EXPORT_READY__ = false;
try {
  const manifest = await exportTerrace();
  output.textContent += `Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.drawCalls} draw calls, ${manifest.source.triangles.toLocaleString()} triangles.\n`;
  output.textContent += `Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls, ${manifest.optimized.triangles.toLocaleString()} triangles.\n`;
  window.__TERRACE_EXPORT_MANIFEST__ = manifest;
  window.__TERRACE_EXPORT_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__TERRACE_EXPORT_ERROR__ = String(error.stack || error.message);
}
