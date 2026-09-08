import { animateQuarantinePen, createQuarantinePen } from '../assets/quarantinePen.js';
import { collectRuntimeSemantics, collectSceneStats, createStaticOptimizedRoot, disposeExportRoot, exportBinaryGlb, prepareSourceHierarchy } from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/quarantine-pen.source.glb'; const OPTIMIZED_PATH = 'optimized-glb/Quarantine-Pen.glb';
const MANIFEST_PATH = 'manifests/quarantine-pen.export.json'; const EVIDENCE_PATH = 'review/quarantine-pen/animation-evidence.json';
async function upload(path, body, contentType) { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': contentType }, body }); if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`); }
const byteSize = (bytes) => new Blob([bytes]).size;

export async function exportQuarantinePen() {
  const authored = createQuarantinePen({ passId: 'optimization-pass' }); const runtime = authored.userData.sculptRuntime;
  const before = Object.fromEntries(Object.entries(runtime.pivots).map(([id, node]) => [id, node.rotation.toArray().slice(0, 3)])); animateQuarantinePen(authored, 1.25, 1);
  const after = Object.fromEntries(Object.entries(runtime.pivots).map(([id, node]) => [id, node.rotation.toArray().slice(0, 3)])); const changedPivots = Object.keys(after).filter((id) => after[id].some((value, index) => Math.abs(value - before[id][index]) > 1e-9));
  const animationEvidence = { assetId: 'quarantine-pen', method: 'Deterministic browser runtime state probe', timeSeconds: 1.25, intensity: 1, changedPivots, entryGate: { beforeRotationY: before['entry-gate'][1], afterRotationY: after['entry-gate'][1], deltaRadians: after['entry-gate'][1] - before['entry-gate'][1] }, otherPivotsUnchanged: changedPivots.length === 1 && changedPivots[0] === 'entry-gate' };
  animateQuarantinePen(authored, 0, 1); const semantics = collectRuntimeSemantics(authored); const source = prepareSourceHierarchy(authored); const optimized = createStaticOptimizedRoot(authored, 'Quarantine Pen');
  try {
    const [sourceBinary, optimizedBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = { schemaVersion: 1, assetId: 'quarantine-pen', generatedBy: 'src/export/exportQuarantinePen.js', coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 }, source: { path: SOURCE_PATH, bytes: byteSize(sourceBinary), ...collectSceneStats(source), semantics: { pivots: semantics.pivotNames.length, sockets: semantics.socketNames.length, colliders: semantics.colliderNames.length, destructionGroups: Object.keys(semantics.destructionGroups).length, animationChannels: semantics.animationChannels.length }, requiredPivotNames: semantics.pivotNames, requiredSocketNames: semantics.socketNames, requiredColliderNames: semantics.colliderNames, requiredDestructionGroups: semantics.destructionGroups, actionChannels: semantics.animationChannels, runtimeDecoderDependencies: [] }, optimized: { path: OPTIMIZED_PATH, bytes: byteSize(optimizedBinary), ...collectSceneStats(optimized), semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 }, runtimeDecoderDependencies: [], optimizationNotes: ['Visible geometry is baked to world space and merged by compatible material signature.', 'The optimized GLB is textureless and requires no mesh or texture decoder.', 'Use the source GLB when entry-gate motion or gameplay semantics are required.'] } };
    await upload(SOURCE_PATH, sourceBinary, 'model/gltf-binary'); await upload(OPTIMIZED_PATH, optimizedBinary, 'model/gltf-binary'); await upload(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json'); await upload(EVIDENCE_PATH, JSON.stringify(animationEvidence, null, 2), 'application/json'); return manifest;
  } finally { disposeExportRoot(optimized); authored.userData.sculptRuntime?.dispose(); }
}

const output = document.querySelector('#output'); window.__QUARANTINE_PEN_EXPORT_READY__ = false;
try { const manifest = await exportQuarantinePen(); output.textContent += `Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.drawCalls} draw calls, ${manifest.source.triangles.toLocaleString()} triangles.\n`; output.textContent += `Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls, ${manifest.optimized.triangles.toLocaleString()} triangles.\n`; window.__QUARANTINE_PEN_EXPORT_MANIFEST__ = manifest; window.__QUARANTINE_PEN_EXPORT_READY__ = true; }
catch (error) { output.textContent += `${error.stack || error.message}\n`; window.__QUARANTINE_PEN_EXPORT_ERROR__ = String(error.stack || error.message); }
