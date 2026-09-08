import { createBarn } from '../assets/barn.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/barn.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Barn.glb';
const MANIFEST_PATH = 'manifests/barn.export.json';

const byteLength = (value) => new Blob([value]).size;

async function writeArtifact(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

export async function exportBarn() {
  const authored = createBarn();
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored, 'Barn');

  try {
    const [sourceGlb, optimizedGlb] = await Promise.all([
      exportBinaryGlb(source),
      exportBinaryGlb(optimized),
    ]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'barn',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: {
        path: SOURCE_PATH,
        bytes: byteLength(sourceGlb),
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
        destructionGroups: semantics.destructionGroups,
        actionChannels: semantics.animationChannels,
        runtimeDecoderDependencies: [],
      },
      optimized: {
        path: OPTIMIZED_PATH,
        bytes: byteLength(optimizedGlb),
        ...collectSceneStats(optimized),
        semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 },
        runtimeDecoderDependencies: [],
        optimizationNotes: [
          'Textureless static geometry baked and merged by material.',
          'No mesh or texture decoder is required.',
        ],
      },
    };

    await Promise.all([
      writeArtifact(SOURCE_PATH, sourceGlb, 'model/gltf-binary'),
      writeArtifact(OPTIMIZED_PATH, optimizedGlb, 'model/gltf-binary'),
      writeArtifact(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json'),
    ]);
    return manifest;
  } finally {
    disposeExportRoot(source);
    disposeExportRoot(optimized);
    authored.userData.sculptRuntime?.dispose();
  }
}

const output = document.querySelector('#output');
window.__BARN_EXPORT_READY__ = false;
try {
  const manifest = await exportBarn();
  output.textContent += `Source: ${manifest.source.bytes} bytes, ${manifest.source.triangles} triangles, ${manifest.source.drawCalls} draw calls.\n`;
  output.textContent += `Optimized: ${manifest.optimized.bytes} bytes, ${manifest.optimized.triangles} triangles, ${manifest.optimized.drawCalls} draw calls.\n`;
  window.__BARN_EXPORT_MANIFEST__ = manifest;
  window.__BARN_EXPORT_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__BARN_EXPORT_ERROR__ = String(error.stack || error.message);
}
