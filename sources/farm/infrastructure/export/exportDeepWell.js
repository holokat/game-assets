import { createDeepWell } from '../assets/deepWell.js';
import { collectRuntimeSemantics, collectSceneStats, createStaticOptimizedRoot, disposeExportRoot, exportBinaryGlb, prepareSourceHierarchy } from './handPumpExportUtils.js';

const SOURCE_PATH = 'source-glb/deep-well.source.glb';
const STATIC_PATH = 'optimized-glb/Deep-Well.glb';
const MANIFEST_PATH = 'manifests/deep-well.export.json';
const byteSize = (bytes) => new Blob([bytes]).size;
async function uploadArtifact(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`);
  return response.json();
}
function sourceEntry(binary, root, semantics) {
  return { path: SOURCE_PATH, bytes: byteSize(binary), ...collectSceneStats(root), semantics: { pivots: semantics.pivotNames.length, sockets: semantics.socketNames.length, colliders: semantics.colliderNames.length, destructionGroups: Object.keys(semantics.destructionGroups).length, animationChannels: semantics.animationChannels.length }, runtimeDecoderDependencies: [], requiredPivotNames: semantics.pivotNames, requiredSocketNames: semantics.socketNames, requiredColliderNames: semantics.colliderNames, requiredDestructionGroups: semantics.destructionGroups, actionChannels: semantics.animationChannels, optimizationNotes: ['Preserves the authored hierarchy and named semantic nodes in glTF extras.', 'Collider nodes are visible mesh-less nodes so onlyVisible export retains their metadata.'] };
}
function staticEntry(binary, root) {
  return { path: STATIC_PATH, bytes: byteSize(binary), ...collectSceneStats(root), semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 }, runtimeDecoderDependencies: [], optimizationNotes: ['Visible meshes are baked into world space and merged only within matching material signatures.', 'UV, secondary UV, tangent, and skin attributes are stripped after confirming all materials are textureless.', 'The result requires no mesh, texture, or animation decoder at runtime.'] };
}
export async function exportDeepWell() {
  const authored = createDeepWell({ passId: 'optimization-pass' });
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = createStaticOptimizedRoot(authored);
  optimized.name = 'Deep-Well';
  try {
    const [sourceBinary, staticBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = { schemaVersion: 1, assetId: 'deep-well', generatedBy: 'src/export/exportDeepWell.js', coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 }, source: sourceEntry(sourceBinary, source, semantics), optimized: staticEntry(staticBinary, optimized) };
    await uploadArtifact(SOURCE_PATH, sourceBinary, 'model/gltf-binary');
    await uploadArtifact(STATIC_PATH, staticBinary, 'model/gltf-binary');
    await uploadArtifact(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json');
    return manifest;
  } finally { disposeExportRoot(optimized); authored.userData.sculptRuntime?.dispose(); }
}
const output = document.querySelector('#output');
function write(message) { output.textContent += `${message}\n`; }
window.__DEEP_WELL_EXPORT_READY__ = false;
try { write('Exporting hierarchy-preserving source GLB and static optimized GLB…'); const manifest = await exportDeepWell(); write(`Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.meshes} meshes, ${manifest.source.triangles.toLocaleString()} triangles.`); write(`Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls, ${manifest.optimized.triangles.toLocaleString()} triangles.`); window.__DEEP_WELL_EXPORT_MANIFEST__ = manifest; window.__DEEP_WELL_EXPORT_READY__ = true; } catch (error) { write(`Export failed: ${error.stack || error.message}`); window.__DEEP_WELL_EXPORT_ERROR__ = String(error.stack || error.message); }
