import { animateFencedGrazingField, createFencedGrazingField } from '../assets/fencedGrazingField.js';
import { collectRuntimeSemantics, collectSceneStats, createStaticOptimizedRoot, disposeExportRoot, exportBinaryGlb, prepareSourceHierarchy } from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/fenced-grazing-field.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Fenced-Grazing-Field.glb';
const MANIFEST_PATH = 'manifests/fenced-grazing-field.export.json';
const EVIDENCE_PATH = 'review/fenced-grazing-field/animation-evidence.json';
async function upload(path, body, contentType) { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': contentType }, body }); if (!response.ok) throw new Error(`Unable to write ${path}: ${await response.text()}`); }
const byteSize = (bytes) => new Blob([bytes]).size;

export async function exportFencedGrazingField() {
  const authored = createFencedGrazingField({ passId: 'optimization-pass' }); const runtime = authored.userData.sculptRuntime;
  const before = Object.fromEntries(Object.entries(runtime.pivots).map(([id, node]) => [id, node.rotation.toArray().slice(0, 3)]));
  animateFencedGrazingField(authored, 1.25, 1);
  const after = Object.fromEntries(Object.entries(runtime.pivots).map(([id, node]) => [id, node.rotation.toArray().slice(0, 3)]));
  const changedPivots = Object.keys(after).filter((id) => after[id].some((value, index) => Math.abs(value - before[id][index]) > 1e-9));
  const animationEvidence = {
    assetId: 'fenced-grazing-field', method: 'Deterministic browser runtime state probe', timeSeconds: 1.25, intensity: 1, changedPivots,
    frontGate: { beforeRotationY: before['broad-front-gate'][1], afterRotationY: after['broad-front-gate'][1], deltaRadians: after['broad-front-gate'][1] - before['broad-front-gate'][1] },
    otherPivotsUnchanged: changedPivots.length === 1 && changedPivots[0] === 'broad-front-gate',
  };
  animateFencedGrazingField(authored, 0, 1);
  const semantics = collectRuntimeSemantics(authored); const source = prepareSourceHierarchy(authored); const optimized = createStaticOptimizedRoot(authored, 'Fenced Grazing Field');
  try {
    const [sourceBinary, optimizedBinary] = await Promise.all([exportBinaryGlb(source), exportBinaryGlb(optimized)]);
    const manifest = {
      schemaVersion: 1, assetId: 'fenced-grazing-field', generatedBy: 'src/export/exportFencedGrazingField.js', coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: {
        path: SOURCE_PATH, bytes: byteSize(sourceBinary), ...collectSceneStats(source),
        semantics: { pivots: semantics.pivotNames.length, sockets: semantics.socketNames.length, colliders: semantics.colliderNames.length, destructionGroups: Object.keys(semantics.destructionGroups).length, animationChannels: semantics.animationChannels.length },
        requiredPivotNames: semantics.pivotNames, requiredSocketNames: semantics.socketNames, requiredColliderNames: semantics.colliderNames,
        requiredDestructionGroups: semantics.destructionGroups, actionChannels: semantics.animationChannels, runtimeDecoderDependencies: [],
      },
      optimized: {
        path: OPTIMIZED_PATH, bytes: byteSize(optimizedBinary), ...collectSceneStats(optimized), semantics: { pivots: 0, sockets: 0, colliders: 0, destructionGroups: 0, animationChannels: 0 }, runtimeDecoderDependencies: [],
        optimizationNotes: ['Visible geometry is baked to world space and merged by compatible material signature.', 'The optimized GLB is textureless and requires no mesh or texture decoder.', 'Use the source GLB when front-gate animation or gameplay semantics are required.'],
      },
    };
    await upload(SOURCE_PATH, sourceBinary, 'model/gltf-binary'); await upload(OPTIMIZED_PATH, optimizedBinary, 'model/gltf-binary');
    await upload(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'application/json'); await upload(EVIDENCE_PATH, JSON.stringify(animationEvidence, null, 2), 'application/json'); return manifest;
  } finally { disposeExportRoot(optimized); authored.userData.sculptRuntime?.dispose(); }
}

const output = document.querySelector('#output'); window.__FENCED_GRAZING_FIELD_EXPORT_READY__ = false;
try { const manifest = await exportFencedGrazingField(); output.textContent += `Source: ${manifest.source.bytes.toLocaleString()} bytes, ${manifest.source.drawCalls} draw calls, ${manifest.source.triangles.toLocaleString()} triangles.\n`; output.textContent += `Optimized: ${manifest.optimized.bytes.toLocaleString()} bytes, ${manifest.optimized.drawCalls} draw calls, ${manifest.optimized.triangles.toLocaleString()} triangles.\n`; window.__FENCED_GRAZING_FIELD_EXPORT_MANIFEST__ = manifest; window.__FENCED_GRAZING_FIELD_EXPORT_READY__ = true; }
catch (error) { output.textContent += `${error.stack || error.message}\n`; window.__FENCED_GRAZING_FIELD_EXPORT_ERROR__ = String(error.stack || error.message); }
