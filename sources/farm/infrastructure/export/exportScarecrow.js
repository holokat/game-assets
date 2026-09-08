import { createScarecrow } from '../assets/scarecrow.js';
import { collectRuntimeSemantics, collectSceneStats, createWindPumpStatic, disposeExportRoot, exportBinaryGlb, prepareWindPumpSource } from './windPumpExportUtils.js';

const sourcePath = 'source-glb/scarecrow.source.glb', optimizedPath = 'optimized-glb/Scarecrow.glb', manifestPath = 'manifests/scarecrow.export.json';
const bytes = (value) => new Blob([value]).size;
const write = (path, value, type) => fetch(`/__artifact__?path=${path}`, { method: 'POST', headers: { 'Content-Type': type }, body: value });
const asset = createScarecrow(), semantics = collectRuntimeSemantics(asset), source = prepareWindPumpSource(asset), optimized = createWindPumpStatic(asset);
try {
  const [sourceGlb, optimizedGlb] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
  const manifest = { assetId: 'scarecrow', source: { path: sourcePath, bytes: bytes(sourceGlb), ...collectSceneStats(source), requiredPivotNames: semantics.pivotNames, requiredSocketNames: semantics.socketNames, requiredColliderNames: semantics.colliderNames, actionChannels: semantics.animationChannels }, optimized: { path: optimizedPath, bytes: bytes(optimizedGlb), ...collectSceneStats(optimized) } };
  await Promise.all([write(sourcePath, sourceGlb, 'model/gltf-binary'), write(optimizedPath, optimizedGlb, 'model/gltf-binary'), write(manifestPath, JSON.stringify(manifest, null, 2), 'application/json')]);
  window.__SCARECROW_EXPORT = manifest;
} finally { disposeExportRoot(source); disposeExportRoot(optimized); asset.userData.sculptRuntime.dispose(); }
