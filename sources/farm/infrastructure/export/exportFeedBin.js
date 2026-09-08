import * as THREE from 'three';
import { createFeedBin } from '../assets/feedBin.js';
import {
  collectRuntimeSemantics,
  collectSceneStats,
  createStaticOptimizedRoot,
  disposeExportRoot,
  exportBinaryGlb,
  prepareSourceHierarchy,
} from './staticExportUtils.js';

const SOURCE_PATH = 'source-glb/feed-bin.source.glb';
const OPTIMIZED_PATH = 'optimized-glb/Feed-Bin.glb';
const MANIFEST_PATH = 'manifests/feed-bin.export.json';
const byteLength = (value) => new Blob([value]).size;

function preserveSemanticNodes(optimized, authored, semantics) {
  authored.updateMatrixWorld(true);
  const pivotNames = new Set(semantics.pivotNames);
  const socketNames = new Set(semantics.socketNames);
  const colliderNames = new Set(semantics.colliderNames);
  const names = [...new Set([...semantics.pivotNames, ...semantics.socketNames, ...semantics.colliderNames])];
  for (const name of names) {
    const sourceNode = authored.getObjectByName(name);
    if (!sourceNode) throw new Error(`Missing authored semantic node: ${name}`);
    const node = new THREE.Object3D();
    node.name = name;
    sourceNode.matrixWorld.decompose(node.position, node.quaternion, node.scale);
    if (socketNames.has(name)) node.userData = { socket: { ...sourceNode.userData.socket } };
    else if (colliderNames.has(name)) node.userData = { collider: { ...sourceNode.userData.collider } };
    else if (pivotNames.has(name)) node.userData = { semanticPivot: true };
    optimized.add(node);
  }
  optimized.userData.sourceSemantics = semantics;
  optimized.userData.preservedSourceSemantics = true;
  optimized.updateMatrixWorld(true);
  return optimized;
}

async function writeArtifact(path, body, contentType) {
  const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) throw new Error(`Cannot write ${path}: ${await response.text()}`);
}

export async function exportFeedBin() {
  const authored = createFeedBin();
  const semantics = collectRuntimeSemantics(authored);
  const source = prepareSourceHierarchy(authored);
  const optimized = preserveSemanticNodes(createStaticOptimizedRoot(authored, 'Feed-Bin'), authored, semantics);
  try {
    const [sourceGlb, optimizedGlb] = await Promise.all([
      exportBinaryGlb(source),
      exportBinaryGlb(optimized),
    ]);
    const manifest = {
      schemaVersion: 1,
      assetId: 'feed-bin',
      coordinateSystem: { up: 'Y', forward: '+Z', unit: 'metre', groundY: 0 },
      source: {
        path: SOURCE_PATH,
        bytes: byteLength(sourceGlb),
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
        bytes: byteLength(optimizedGlb),
        ...collectSceneStats(optimized),
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
        optimizationNotes: [
          'Textureless visible geometry is baked and merged by material.',
          'Source pivot, socket, collider, destruction-group, and action-channel metadata remains available as semantic nodes and root extras.',
          'No mesh or texture decoder is required.',
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
window.__FEED_BIN_EXPORT_READY__ = false;
try {
  const manifest = await exportFeedBin();
  output.textContent += `Source: ${manifest.source.bytes} bytes, ${manifest.source.triangles} triangles, ${manifest.source.drawCalls} draw calls.\n`;
  output.textContent += `Optimized: ${manifest.optimized.bytes} bytes, ${manifest.optimized.triangles} triangles, ${manifest.optimized.drawCalls} draw calls.\n`;
  window.__FEED_BIN_EXPORT_MANIFEST__ = manifest;
  window.__FEED_BIN_EXPORT_READY__ = true;
} catch (error) {
  output.textContent += `${error.stack || error.message}\n`;
  window.__FEED_BIN_EXPORT_ERROR__ = String(error.stack || error.message);
}
