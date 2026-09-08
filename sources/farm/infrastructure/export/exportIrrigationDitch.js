import { createIrrigationDitch } from '../assets/irrigationDitch.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/irrigation-ditch.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Irrigation-Ditch.glb';
const MANIFEST_PATH = 'manifests/irrigation-ditch.export.json';

async function upload(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`);
}

export async function exportIrrigationDitch() {
  const authored = createIrrigationDitch({ passId: 'optimization-pass' });
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored, 'Irrigation-Ditch');
  try {
    const [sourceBinary, optimizedBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'irrigation-ditch',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: {
        path: SOURCE_PATH,
        bytes: new Blob([sourceBinary]).size,
        ...collectSceneStats(source),
        semantics: {
          pivots: semantics.pivotNames.length,
          sockets: semantics.socketNames.length,
          colliders: semantics.colliderNames.length,
          destructionGroups: Object.keys(semantics.destructionGroups).length,
          animationChannels: 0,
        },
        requiredPivotNames: semantics.pivotNames,
        requiredSocketNames: semantics.socketNames,
        requiredColliderNames: semantics.colliderNames,
        requiredDestructionGroups: semantics.destructionGroups,
        actionChannels: [],
        runtimeDecoderDependencies: [],
      },
      optimized: {
        path: OPTIMIZED_PATH,
        bytes: new Blob([optimizedBinary]).size,
        ...collectSceneStats(optimized),
        semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 },
        runtimeDecoderDependencies: [],
        optimizationNotes: [
          'Static textureless geometry is merged by compatible material signature.',
          'No animation was invented because the concept contains no moving mechanism.',
          'Named input and output sockets preserve flow direction for gameplay systems.',
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
window.__IRRIGATION_DITCH_EXPORT_READY__ = false;
try {
  const manifest = await exportIrrigationDitch();
  output.textContent += `Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.drawCalls} draws, ${manifest.source.triangles.toLocaleString()} triangles.\n`;
  output.textContent += `Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draws.\n`;
  window.__IRRIGATION_DITCH_EXPORT_MANIFEST__ = manifest;
  window.__IRRIGATION_DITCH_EXPORT_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__IRRIGATION_DITCH_EXPORT_ERROR__ = String(error.stack || error.message);
}
