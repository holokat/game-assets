import { createRainBarrel } from '../assets/rainBarrel.js';
import { collectRuntimeSemantics, collectSceneStats, createRainBarrelStatic, disposeExportRoot, exportBinaryGlb, prepareRainBarrelSource } from './rainBarrelExportUtils.js';

const SOURCE_PATH = 'source-glb/rain-barrel.source.glb'; const STATIC_PATH = 'optimized-glb/Rain-Barrel.glb'; const MANIFEST_PATH = 'manifests/rain-barrel.export.json';
const bytes = (value) => new Blob([value]).size;
async function writeArtifact(path, body, contentType) { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': contentType }, body }); if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`); }

export async function exportRainBarrel() {
  const authored = createRainBarrel({ passId: 'optimization' }); const semantics = collectRuntimeSemantics(authored); const source = prepareRainBarrelSource(authored); const optimized = createRainBarrelStatic(authored);
  try {
    const [sourceBinary, optimizedBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1, assetId: 'rain-barrel', generatedBy: 'src/export/exportRainBarrel.js', coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: { path: SOURCE_PATH, bytes: bytes(sourceBinary), ...collectSceneStats(source), semantics: { pivots: semantics.pivotNames.length, sockets: semantics.socketNames.length, colliders: semantics.colliderNames.length, destructionGroups: Object.keys(semantics.destructionGroups).length, animationChannels: semantics.animationChannels.length }, runtimeDecoderDependencies: [], requiredPivotNames: semantics.pivotNames, requiredSocketNames: semantics.socketNames, requiredColliderNames: semantics.colliderNames, requiredDestructionGroups: semantics.destructionGroups, actionChannels: semantics.animationChannels, optimizationNotes: ['Preserves named pivots, sockets, primitive collider extras, destruction groups, and tap action-channel metadata in the hierarchy source GLB.'] },
      optimized: { path: STATIC_PATH, bytes: bytes(optimizedBinary), ...collectSceneStats(optimized), semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 }, runtimeDecoderDependencies: [], optimizationNotes: ['Textureless visible meshes are baked to world space and merged by compatible local material signature.', 'Unused UV, tangent, and skin attributes are removed after mapped-material rejection.', 'No Draco, Meshopt, texture, or animation decoder is required.'] },
    };
    await Promise.all([writeArtifact(SOURCE_PATH, sourceBinary, 'model/gltf-binary'), writeArtifact(STATIC_PATH, optimizedBinary, 'model/gltf-binary'), writeArtifact(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json')]); return manifest;
  } finally { disposeExportRoot(source); disposeExportRoot(optimized); authored.userData.sculptRuntime?.dispose(); }
}
const output = document.querySelector('#output'); const write = (message) => { output.textContent += `${message}\n`; }; window.__RAIN_BARREL_EXPORT_READY__ = false;
try { write('Exporting Rain Barrel source and optimized GLBs…'); const manifest = await exportRainBarrel(); write(`Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.triangles.toLocaleString()} triangles.`); write(`Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls.`); window.__RAIN_BARREL_EXPORT_MANIFEST__ = manifest; window.__RAIN_BARREL_EXPORT_READY__ = true; } catch (error) { write(`Export failed: ${error.stack || error.message}`); window.__RAIN_BARREL_EXPORT_ERROR__ = String(error.stack || error.message); }
