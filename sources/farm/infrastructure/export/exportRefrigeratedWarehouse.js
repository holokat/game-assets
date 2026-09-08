import { createRefrigeratedWarehouse } from '../assets/refrigeratedWarehouse.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/refrigerated-warehouse.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Refrigerated-Warehouse.glb';
const MANIFEST_PATH = 'manifests/refrigerated-warehouse.export.json';
const bytes = (value) => new Blob([value]).size;

async function writeArtifact(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

export async function exportRefrigeratedWarehouse() {
  const authored = createRefrigeratedWarehouse();
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored, 'Refrigerated-Warehouse');
  try {
    const [sourceGlb, optimizedGlb] = await Promise.all([
      exportBinaryGlb(source),
      exportBinaryGlb(optimized),
    ]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'refrigerated-warehouse',
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
          'Textureless visible geometry is baked and merged by material.',
          'No mesh or texture decoder is required.',
          'Use the source GLB for the condenser fan action and gameplay semantics.',
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
window.__REFRIGERATED_WAREHOUSE_EXPORT_READY__ = false;
try {
  const manifest = await exportRefrigeratedWarehouse();
  output.textContent += `Source: ${manifest.source.bytes} bytes, ${manifest.source.triangles} triangles, ${manifest.source.drawCalls} draw calls.\n`;
  output.textContent += `Optimized: ${manifest.optimized.bytes} bytes, ${manifest.optimized.triangles} triangles, ${manifest.optimized.drawCalls} draw calls.\n`;
  window.__REFRIGERATED_WAREHOUSE_EXPORT_MANIFEST__ = manifest;
  window.__REFRIGERATED_WAREHOUSE_EXPORT_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__REFRIGERATED_WAREHOUSE_EXPORT_ERROR__ = String(error.stack || error.message);
}
