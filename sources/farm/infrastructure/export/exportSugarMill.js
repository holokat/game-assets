import { createSugarMill } from '../assets/sugarMill.js';
import { collectRuntimeSemantics, collectSceneStats, createStaticOptimizedRoot, disposeExportRoot, exportBinaryGlb, prepareSourceHierarchy } from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/sugar-mill.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Sugar-Mill.glb';
const MANIFEST_PATH = 'manifests/sugar-mill.export.json';
const byteSize = (value) => new Blob([value]).size;
async function write(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

export async function exportSugarMill() {
  const authored = createSugarMill({ passId: 'optimization-pass' });
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored, 'Sugar Mill');
  try {
    const [sourceGlb, optimizedGlb] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'sugar-mill',
      generatedBy: 'src/export/exportSugarMill.js',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: {
        path: SOURCE_PATH, bytes: byteSize(sourceGlb), ...collectSceneStats(source),
        semantics: { pivots: semantics.pivotNames.length, sockets: semantics.socketNames.length, colliders: semantics.colliderNames.length, destructionGroups: Object.keys(semantics.destructionGroups).length, animationChannels: semantics.animationChannels.length },
        requiredPivotNames: semantics.pivotNames, requiredSocketNames: semantics.socketNames, requiredColliderNames: semantics.colliderNames,
        requiredDestructionGroups: semantics.destructionGroups, actionChannels: semantics.animationChannels, runtimeDecoderDependencies: [],
      },
      optimized: {
        path: OPTIMIZED_PATH, bytes: byteSize(optimizedGlb), ...collectSceneStats(optimized),
        semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 },
        runtimeDecoderDependencies: [],
        optimizationNotes: ['Visible geometry is baked to world space and merged by compatible material signature.', 'The optimized GLB is textureless and requires no mesh or texture decoder.', 'Use the source GLB for the coupled handwheel, rollers, gear train, and gameplay semantics.'],
      },
    };
    await Promise.all([write(SOURCE_PATH, sourceGlb, 'model/gltf-binary'), write(OPTIMIZED_PATH, optimizedGlb, 'model/gltf-binary'), write(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json')]);
    return manifest;
  } finally {
    disposeExportRoot(source);
    disposeExportRoot(optimized);
    authored.userData.sculptRuntime?.dispose();
  }
}

const output = document.querySelector('#output');
window.__SUGAR_MILL_EXPORT_READY__ = false;
try {
  const manifest = await exportSugarMill();
  output.textContent += `Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.drawCalls} draw calls, ${manifest.source.triangles.toLocaleString()} triangles.\nOptimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls, ${manifest.optimized.triangles.toLocaleString()} triangles.\n`;
  window.__SUGAR_MILL_EXPORT_MANIFEST__ = manifest;
  window.__SUGAR_MILL_EXPORT_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__SUGAR_MILL_EXPORT_ERROR__ = String(error.stack || error.message);
}
