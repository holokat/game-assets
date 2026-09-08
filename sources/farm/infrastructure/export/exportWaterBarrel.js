import { createWaterBarrel } from '../assets/waterBarrel.js';
import { collectRuntimeSemantics, collectSceneStats, createWaterBarrelStatic, disposeExportRoot, exportBinaryGlb, prepareWaterBarrelSource } from './waterBarrelExportUtils.js';

const SOURCE_PATH = 'source-glb/water-barrel.source.glb';
const STATIC_PATH = 'optimized-glb/Water-Barrel.glb';
const MANIFEST_PATH = 'manifests/water-barrel.export.json';
const bytes = (value) => new Blob([value]).size;
async function writeArtifact(path, body, contentType) { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': contentType }, body }); if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`); }

export async function exportWaterBarrel() {
  const authored = createWaterBarrel({ passId: 'optimization' }); const semantics = collectRuntimeSemantics(authored); const source = prepareWaterBarrelSource(authored); const optimized = createWaterBarrelStatic(authored);
  try {
    const [sourceBinary, optimizedBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1, assetId: 'water-barrel', generatedBy: 'src/export/exportWaterBarrel.js', coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: { path: SOURCE_PATH, bytes: bytes(sourceBinary), ...collectSceneStats(source), semantics: { pivots: semantics.pivotNames.length, sockets: semantics.socketNames.length, colliders: semantics.colliderNames.length, destructionGroups: Object.keys(semantics.destructionGroups).length, animationChannels: semantics.animationChannels.length }, runtimeDecoderDependencies: [], requiredPivotNames: semantics.pivotNames, requiredSocketNames: semantics.socketNames, requiredColliderNames: semantics.colliderNames, requiredDestructionGroups: semantics.destructionGroups, actionChannels: semantics.animationChannels, optimizationNotes: ['Preserves named hierarchy, sockets, colliders, destruction groups, and action-channel metadata in glTF extras.'] },
      optimized: { path: STATIC_PATH, bytes: bytes(optimizedBinary), ...collectSceneStats(optimized), semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 }, runtimeDecoderDependencies: [], optimizationNotes: ['Textureless visible meshes are baked to world space and merged by compatible local material signature.', 'Unused UV, tangent, and skin attributes are removed after mapped-material rejection.', 'No Draco, Meshopt, texture, or animation decoder is required.'] },
    };
    await Promise.all([writeArtifact(SOURCE_PATH, sourceBinary, 'model/gltf-binary'), writeArtifact(STATIC_PATH, optimizedBinary, 'model/gltf-binary'), writeArtifact(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json')]); return manifest;
  } finally { disposeExportRoot(source); disposeExportRoot(optimized); authored.userData.sculptRuntime?.dispose(); }
}

const output = document.querySelector('#output'); const write = (message) => { output.textContent += `${message}\n`; };
window.__WATER_BARREL_EXPORT_READY__ = false;
try { write('Exporting Water Barrel source and optimized GLBs…'); const manifest = await exportWaterBarrel(); write(`Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.triangles.toLocaleString()} triangles.`); write(`Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls.`); window.__WATER_BARREL_EXPORT_MANIFEST__ = manifest; window.__WATER_BARREL_EXPORT_READY__ = true; } catch (error) { write(`Export failed: ${error.stack || error.message}`); window.__WATER_BARREL_EXPORT_ERROR__ = String(error.stack || error.message); }
