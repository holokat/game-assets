import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UNUSED_STATIC_ATTRIBUTES = ['uv', 'uv1', 'tangent', 'skinIndex', 'skinWeight'];

function materialSignature(material) {
  return JSON.stringify({
    name: material.name,
    color: material.color?.getHexString(),
    emissive: material.emissive?.getHexString(),
    emissiveIntensity: material.emissiveIntensity ?? 0,
    roughness: material.roughness,
    metalness: material.metalness,
    opacity: material.opacity,
    transparent: material.transparent,
    vertexColors: material.vertexColors,
    flatShading: material.flatShading,
    side: material.side,
  });
}

function staticMaterialIsSafe(material) {
  return ![
    material.map,
    material.alphaMap,
    material.aoMap,
    material.bumpMap,
    material.displacementMap,
    material.emissiveMap,
    material.lightMap,
    material.metalnessMap,
    material.normalMap,
    material.roughnessMap,
  ].some(Boolean);
}

function bakeGeometry(geometry, matrix) {
  const baked = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  baked.applyMatrix4(matrix);
  baked.clearGroups();
  for (const attribute of UNUSED_STATIC_ATTRIBUTES) baked.deleteAttribute(attribute);
  return baked;
}

export function collectRuntimeSemantics(root) {
  const runtime = root.userData.sculptRuntime;
  if (!runtime) throw new Error(`${root.userData.assetId || root.name} must expose sculptRuntime before source export.`);
  return {
    pivotNames: Object.values(runtime.pivots).map((node) => node.name).sort(),
    socketNames: Object.values(runtime.sockets).map((node) => node.name).sort(),
    colliderNames: Object.values(runtime.colliders).map((node) => node.name).sort(),
    destructionGroups: Object.fromEntries(Object.entries(runtime.destructionGroups)
      .map(([id, members]) => [id, [...members].sort()])
      .sort(([a], [b]) => a.localeCompare(b))),
    animationChannels: runtime.animationChannels.map((channel) => ({
      node: channel.node.name,
      property: channel.property,
      axis: channel.axis,
      amplitude: channel.amplitude,
      frequency: channel.frequency,
      phase: channel.phase,
    })),
  };
}

export function prepareSourceHierarchy(sourceRoot) {
  const source = sourceRoot.clone(true);
  source.name = sourceRoot.name;
  source.userData = {
    assetId: sourceRoot.userData.assetId,
    forwardAxis: sourceRoot.userData.forwardAxis,
    unit: sourceRoot.userData.unit,
    groundY: sourceRoot.userData.groundY,
    exportKind: 'hierarchy-preserving-source',
    artDirection: sourceRoot.userData.artDirection,
    sourceSemantics: collectRuntimeSemantics(sourceRoot),
  };
  source.traverse((node) => {
    if (node.userData.collider) node.visible = true;
    if (node.isMesh) {
      node.castShadow = false;
      node.receiveShadow = false;
    }
  });
  source.updateMatrixWorld(true);
  return source;
}

export function createStaticOptimizedRoot(sourceRoot, label) {
  sourceRoot.updateMatrixWorld(true);
  const groups = new Map();
  sourceRoot.traverse((node) => {
    if (!node.visible || (!node.isMesh && !node.isInstancedMesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    if (materials.length !== 1) throw new Error(`Multi-material mesh is unsupported: ${node.name}`);
    const material = materials[0];
    if (!staticMaterialIsSafe(material)) throw new Error(`Mapped material cannot use textureless static merge: ${material.name || node.name}`);
    const signature = materialSignature(material);
    const group = groups.get(signature) ?? { material, geometries: [] };
    if (node.isInstancedMesh) {
      const instanceMatrix = new THREE.Matrix4();
      const worldMatrix = new THREE.Matrix4();
      for (let index = 0; index < node.count; index += 1) {
        node.getMatrixAt(index, instanceMatrix);
        worldMatrix.multiplyMatrices(node.matrixWorld, instanceMatrix);
        group.geometries.push(bakeGeometry(node.geometry, worldMatrix));
      }
    } else {
      group.geometries.push(bakeGeometry(node.geometry, node.matrixWorld));
    }
    groups.set(signature, group);
  });

  const root = new THREE.Group();
  root.name = label;
  root.userData = {
    assetId: sourceRoot.userData.assetId,
    forwardAxis: sourceRoot.userData.forwardAxis,
    unit: sourceRoot.userData.unit,
    groundY: sourceRoot.userData.groundY,
    exportKind: 'static-optimized',
    optimization: {
      flattenedByMaterial: true,
      strippedUnusedAttributes: UNUSED_STATIC_ATTRIBUTES,
      geometryInstancingBaked: true,
      runtimeDecoderDependency: false,
      textureless: true,
    },
  };
  for (const { material, geometries } of groups.values()) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error(`Could not merge geometry for material: ${material.name}`);
    const exportMaterial = material.clone();
    exportMaterial.name = material.name;
    const mesh = new THREE.Mesh(merged, exportMaterial);
    mesh.name = `${sourceRoot.userData.assetId}-static-${material.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`;
    root.add(mesh);
  }
  root.updateMatrixWorld(true);
  return root;
}

export function collectSceneStats(root) {
  root.updateMatrixWorld(true);
  const materials = new Map();
  let meshes = 0;
  let drawCalls = 0;
  let triangles = 0;
  root.traverse((node) => {
    if (!node.visible || (!node.isMesh && !node.isInstancedMesh)) return;
    meshes += 1;
    drawCalls += 1;
    const position = node.geometry?.getAttribute('position');
    const baseTriangles = (node.geometry?.index?.count ?? position?.count ?? 0) / 3;
    triangles += baseTriangles * (node.isInstancedMesh ? node.count : 1);
    (Array.isArray(node.material) ? node.material : [node.material])
      .forEach((material) => materials.set(materialSignature(material), material.name || 'unnamed-material'));
  });
  const bounds = new THREE.Box3().setFromObject(root, true);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  if (!bounds.isEmpty()) {
    bounds.getSize(size);
    bounds.getCenter(center);
  }
  return {
    meshes,
    drawCalls,
    triangles: Math.round(triangles),
    materials: [...materials.values()].sort(),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray(), center: center.toArray() },
  };
}

export async function exportBinaryGlb(root) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => exporter.parse(root, resolve, reject, {
    binary: true,
    onlyVisible: true,
    truncateDrawRange: true,
    maxTextureSize: 1024,
    includeCustomExtensions: false,
  }));
}

export function disposeExportRoot(root) {
  const materials = new Set();
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose();
    (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => materials.add(material));
  });
  materials.forEach((material) => material?.dispose());
}
