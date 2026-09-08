import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UNUSED_STATIC_ATTRIBUTES = ['uv', 'uv1', 'tangent', 'skinIndex', 'skinWeight'];
const mapped = (material) => [material.map, material.alphaMap, material.aoMap, material.bumpMap, material.displacementMap, material.emissiveMap, material.lightMap, material.metalnessMap, material.normalMap, material.roughnessMap].some(Boolean);
const signature = (material) => JSON.stringify({ name: material.name, color: material.color?.getHexString(), roughness: material.roughness, metalness: material.metalness, opacity: material.opacity, transparent: material.transparent, vertexColors: material.vertexColors, flatShading: material.flatShading, side: material.side });

function bake(geometry, matrix) {
  const result = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  result.applyMatrix4(matrix); result.clearGroups();
  UNUSED_STATIC_ATTRIBUTES.forEach((name) => result.deleteAttribute(name));
  return result;
}

export function collectRuntimeSemantics(root) {
  const runtime = root.userData.sculptRuntime;
  if (!runtime) throw new Error('Rain Barrel must expose sculptRuntime before export.');
  return {
    pivotNames: Object.values(runtime.pivots).map((node) => node.name).sort(),
    socketNames: Object.values(runtime.sockets).map((node) => node.name).sort(),
    colliderNames: Object.values(runtime.colliders).map((node) => node.name).sort(),
    destructionGroups: Object.fromEntries(Object.entries(runtime.destructionGroups).map(([id, members]) => [id, [...members].sort()]).sort(([a], [b]) => a.localeCompare(b))),
    animationChannels: runtime.animationChannels.map((channel) => ({ node: channel.node.name, property: channel.property, axis: channel.axis, amplitude: channel.amplitude, frequency: channel.frequency, phase: channel.phase })),
  };
}

export function prepareRainBarrelSource(root) {
  const source = root.clone(true);
  source.userData = { assetId: root.userData.assetId, forwardAxis: root.userData.forwardAxis, unit: root.userData.unit, groundY: root.userData.groundY, exportKind: 'hierarchy-preserving-source', artDirection: root.userData.artDirection, sourceSemantics: collectRuntimeSemantics(root) };
  source.traverse((node) => { if (node.userData.collider) node.visible = true; if (node.isMesh || node.isInstancedMesh) { node.castShadow = false; node.receiveShadow = false; } });
  source.updateMatrixWorld(true); return source;
}

export function createRainBarrelStatic(root) {
  root.updateMatrixWorld(true); const groups = new Map();
  const add = (node, material, matrix) => {
    if (mapped(material)) throw new Error(`Mapped material cannot be included in textureless static export: ${material.name || node.name}`);
    const key = signature(material); const group = groups.get(key) ?? { material, geometries: [] };
    group.geometries.push(bake(node.geometry, matrix)); groups.set(key, group);
  };
  root.traverse((node) => {
    if (!node.visible || (!node.isMesh && !node.isInstancedMesh)) return;
    const material = Array.isArray(node.material) ? node.material : [node.material];
    if (material.length !== 1) throw new Error(`Multi-material mesh not supported: ${node.name}`);
    if (node.isInstancedMesh) {
      const instance = new THREE.Matrix4(); const world = new THREE.Matrix4();
      for (let index = 0; index < node.count; index += 1) { node.getMatrixAt(index, instance); world.multiplyMatrices(node.matrixWorld, instance); add(node, material[0], world); }
    } else add(node, material[0], node.matrixWorld);
  });
  const staticRoot = new THREE.Group(); staticRoot.name = 'Rain-Barrel';
  staticRoot.userData = { assetId: root.userData.assetId, forwardAxis: '+Z', unit: 'metre', groundY: 0, exportKind: 'static-optimized', optimization: { flattenedByMaterial: true, strippedUnusedAttributes: UNUSED_STATIC_ATTRIBUTES, geometryInstancingBaked: true, runtimeDecoderDependency: false } };
  for (const { material, geometries } of groups.values()) {
    const geometry = mergeGeometries(geometries, false); geometries.forEach((item) => item.dispose());
    if (!geometry) throw new Error(`Could not merge ${material.name}.`);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const item = new THREE.Mesh(geometry, material.clone()); item.material.name = material.name; item.name = `rain-barrel-static-${material.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`; item.userData.staticMaterial = material.name; staticRoot.add(item);
  }
  staticRoot.updateMatrixWorld(true); return staticRoot;
}

export function collectSceneStats(root) {
  root.updateMatrixWorld(true); const materials = new Map(); let meshes = 0; let drawCalls = 0; let triangles = 0;
  root.traverse((node) => { if (!node.visible || (!node.isMesh && !node.isInstancedMesh)) return; meshes += 1; drawCalls += 1; const count = node.geometry?.index?.count ?? node.geometry?.getAttribute('position')?.count ?? 0; triangles += (count / 3) * (node.isInstancedMesh ? node.count : 1); (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => materials.set(signature(material), material.name || 'unnamed-material')); });
  const bounds = new THREE.Box3().setFromObject(root, true); const size = new THREE.Vector3(); const center = new THREE.Vector3(); if (!bounds.isEmpty()) { bounds.getSize(size); bounds.getCenter(center); }
  return { meshes, drawCalls, triangles: Math.round(triangles), materials: [...materials.values()].sort(), bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray(), center: center.toArray() } };
}

export const exportBinaryGlb = (root) => new Promise((resolve, reject) => new GLTFExporter().parse(root, resolve, reject, { binary: true, onlyVisible: true, truncateDrawRange: true, maxTextureSize: 1024, includeCustomExtensions: false }));
export function disposeExportRoot(root) { const materials = new Set(); root.traverse((node) => { if (!node.isMesh && !node.isInstancedMesh) return; node.geometry?.dispose(); (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => materials.add(material)); }); materials.forEach((material) => material?.dispose()); }
