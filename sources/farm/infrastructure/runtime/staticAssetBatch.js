import * as THREE from 'three';

function collectTemplateMeshes(root) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((node) => {
    if (!node.visible || !node.isMesh) return;
    if (Array.isArray(node.material)) throw new Error(`StaticAssetBatch does not support multi-material mesh ${node.name}.`);
    meshes.push(node);
  });
  return meshes;
}

export class StaticAssetBatch extends THREE.Group {
  constructor(templateRoot, capacity, options = {}) {
    super();
    if (!templateRoot?.traverse) throw new Error('StaticAssetBatch requires an optimized Three.js Object3D template.');
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('StaticAssetBatch capacity must be a positive integer.');
    this.name = options.name ?? `${templateRoot.name || 'static-asset'}-instances`;
    this.capacity = capacity;
    this.instanceCount = 0;
    this.templateRoot = templateRoot;
    this.batches = [];
    this.matrixAutoUpdate = false;
    this.updateMatrix();

    const templateMeshes = collectTemplateMeshes(templateRoot);
    for (let index = 0; index < templateMeshes.length; index += 1) {
      const template = templateMeshes[index];
      const batch = new THREE.InstancedMesh(template.geometry, template.material, capacity);
      batch.name = `${this.name}-${template.name || index}`;
      batch.count = 0;
      batch.castShadow = options.castShadow ?? false;
      batch.receiveShadow = options.receiveShadow ?? false;
      batch.frustumCulled = options.frustumCulled ?? true;
      batch.matrixAutoUpdate = false;
      batch.instanceMatrix.setUsage(options.dynamic ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage);
      batch.userData.templateMeshName = template.name;
      batch.userData.sharedGeometry = true;
      batch.userData.sharedMaterial = true;
      this.batches.push(batch);
      this.add(batch);
    }
  }

  setMatrixAt(index, matrix) {
    if (!Number.isInteger(index) || index < 0 || index >= this.capacity) {
      throw new RangeError(`Instance index ${index} is outside capacity ${this.capacity}.`);
    }
    for (let batchIndex = 0; batchIndex < this.batches.length; batchIndex += 1) {
      this.batches[batchIndex].setMatrixAt(index, matrix);
    }
    if (index >= this.instanceCount) this.setCount(index + 1);
    return this;
  }

  setColorAt(index, color) {
    for (let batchIndex = 0; batchIndex < this.batches.length; batchIndex += 1) {
      this.batches[batchIndex].setColorAt(index, color);
    }
    return this;
  }

  setCount(count) {
    const next = Math.min(this.capacity, Math.max(0, Math.floor(count)));
    this.instanceCount = next;
    for (let index = 0; index < this.batches.length; index += 1) this.batches[index].count = next;
    return this;
  }

  commit() {
    for (let index = 0; index < this.batches.length; index += 1) {
      const batch = this.batches[index];
      batch.instanceMatrix.needsUpdate = true;
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
      batch.computeBoundingBox();
      batch.computeBoundingSphere();
    }
    return this;
  }

  dispose(options = {}) {
    const disposeShared = options.disposeShared ?? false;
    for (let index = 0; index < this.batches.length; index += 1) {
      const batch = this.batches[index];
      batch.dispose();
      if (disposeShared) {
        batch.geometry.dispose();
        batch.material.dispose();
      }
      batch.removeFromParent();
    }
    this.batches.length = 0;
    this.templateRoot = null;
    this.removeFromParent();
  }

  get drawCalls() {
    return this.batches.length;
  }
}

export class AssetTemplateCache {
  constructor(loadTemplate) {
    if (typeof loadTemplate !== 'function') throw new Error('AssetTemplateCache requires an async loadTemplate(path) function.');
    this.loadTemplate = loadTemplate;
    this.entries = new Map();
  }

  async acquire(path) {
    let entry = this.entries.get(path);
    if (!entry) {
      entry = { promise: Promise.resolve(this.loadTemplate(path)), template: null, references: 0 };
      this.entries.set(path, entry);
      try {
        entry.template = await entry.promise;
      } catch (error) {
        this.entries.delete(path);
        throw error;
      }
    } else if (!entry.template) {
      entry.template = await entry.promise;
    }
    entry.references += 1;
    return entry.template;
  }

  release(path) {
    const entry = this.entries.get(path);
    if (!entry) return 0;
    entry.references = Math.max(0, entry.references - 1);
    return entry.references;
  }

  dispose(path, disposeTemplate) {
    const entry = this.entries.get(path);
    if (!entry || entry.references > 0) return false;
    disposeTemplate?.(entry.template);
    this.entries.delete(path);
    return true;
  }

  clear(disposeTemplate) {
    for (const entry of this.entries.values()) disposeTemplate?.(entry.template);
    this.entries.clear();
  }
}
