import { createProduceStorehouse } from '../assets/produceStorehouse.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/produce-storehouse.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Produce-Storehouse.glb';
const MANIFEST_PATH = 'manifests/produce-storehouse.export.json';
const bytes = (value) => new Blob([value]).size;

async function writeArtifact(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

export async function exportProduceStorehouse() {
  const authored = createProduceStorehouse();
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored, 'Produce-Storehouse');
  try {
    const [sourceGlb, optimizedGlb] = await Promise.all([
      exportBinaryGlb(source),
      exportBinaryGlb(optimized),
    ]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'produce-storehouse',
      generatedBy: 'src/export/exportProduceStorehouse.js',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: {
        path: SOURCE_PATH,
        bytes: bytes(sourceGlb),
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
        bytes: bytes(optimizedGlb),
        ...collectSceneStats(optimized),
        semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 },
        runtimeDecoderDependencies: [],
        optimizationNotes: [
          'Visible textureless geometry is baked to world space and merged by compatible material signature.',
          'No mesh or texture decoder is required.',
          'Use the source GLB when sliding-door motion or gameplay semantics are required.',
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
window.__PRODUCE_STOREHOUSE_EXPORT_READY__ = false;
try {
  const manifest = await exportProduceStorehouse();
  output.textContent += `Source: ${manifest.source.bytes} bytes, ${manifest.source.triangles} triangles, ${manifest.source.drawCalls} draw calls.\n`;
  output.textContent += `Optimized: ${manifest.optimized.bytes} bytes, ${manifest.optimized.triangles} triangles, ${manifest.optimized.drawCalls} draw calls.\n`;
  window.__PRODUCE_STOREHOUSE_EXPORT_MANIFEST__ = manifest;
  window.__PRODUCE_STOREHOUSE_EXPORT_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__PRODUCE_STOREHOUSE_EXPORT_ERROR__ = String(error.stack || error.message);
}
