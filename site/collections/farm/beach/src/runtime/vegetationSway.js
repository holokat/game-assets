const SWAY_PATCH_VERSION = 'beach-farm-vegetation-sway-v1';
const materialUniformBindings = new WeakMap();

export function createVegetationSwayUniforms(options = {}) {
  return {
    uWindTime: { value: Number.isFinite(options.time) ? options.time : 0 },
    uWindAmplitude: { value: Number.isFinite(options.amplitude) ? options.amplitude : 0.035 },
    uWindSpeed: { value: Number.isFinite(options.speed) ? options.speed : 1.15 },
    uWindFrequency: { value: Number.isFinite(options.frequency) ? options.frequency : 1.7 },
    uWindBaseHeight: { value: Number.isFinite(options.baseHeight) ? options.baseHeight : 0.05 },
    uWindTopHeight: { value: Number.isFinite(options.topHeight) ? options.topHeight : 1.4 },
  };
}

function patchMaterial(material, uniforms) {
  if (!material?.isMaterial) return false;
  const existingUniforms = materialUniformBindings.get(material);
  if (existingUniforms) {
    if (existingUniforms !== uniforms) {
      throw new Error('Vegetation sway material is already bound to a different shared uniform set.');
    }
    return false;
  }

  const originalCompile = material.onBeforeCompile?.bind(material);
  const originalCacheKey = material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    originalCompile?.(shader, renderer);
    if (!shader.vertexShader.includes('#include <common>') || !shader.vertexShader.includes('#include <begin_vertex>')) {
      throw new Error('Vegetation sway could not find the required Three.js vertex shader injection points.');
    }
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uWindTime;
uniform float uWindAmplitude;
uniform float uWindSpeed;
uniform float uWindFrequency;
uniform float uWindBaseHeight;
uniform float uWindTopHeight;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
#ifdef USE_INSTANCING
  float vegetationWindPhase = instanceMatrix[3].x * 0.173 + instanceMatrix[3].z * 0.137;
#else
  float vegetationWindPhase = modelMatrix[3].x * 0.173 + modelMatrix[3].z * 0.137;
#endif
float vegetationWindSpan = max(0.001, uWindTopHeight - uWindBaseHeight);
float vegetationWindWeight = smoothstep(0.0, 1.0, (position.y - uWindBaseHeight) / vegetationWindSpan);
float vegetationWindWave = sin(uWindTime * uWindSpeed + vegetationWindPhase + position.y * uWindFrequency);
transformed.x += vegetationWindWave * uWindAmplitude * vegetationWindWeight;`,
      );
  };
  material.customProgramCacheKey = () => `${originalCacheKey?.() ?? ''}|${SWAY_PATCH_VERSION}`;
  material.userData = { ...material.userData, vegetationSwayVersion: SWAY_PATCH_VERSION };
  materialUniformBindings.set(material, uniforms);
  material.needsUpdate = true;
  return true;
}

export function installVegetationSway(root, uniforms = createVegetationSwayUniforms()) {
  if (!root?.traverse) throw new Error('installVegetationSway requires a Three.js Object3D root.');
  const patchedMaterials = new Set();
  let patchCount = 0;
  root.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (let index = 0; index < materials.length; index += 1) {
      const material = materials[index];
      if (!material || patchedMaterials.has(material)) continue;
      if (patchMaterial(material, uniforms)) patchCount += 1;
      patchedMaterials.add(material);
    }
  });
  return { uniforms, materialCount: patchedMaterials.size, patchCount };
}

export class VegetationSwayClock {
  constructor(uniforms = createVegetationSwayUniforms()) {
    this.uniforms = uniforms;
    this.enabled = true;
    this.isDisposed = false;
  }

  update(dt) {
    if (this.isDisposed || !this.enabled) return this.uniforms.uWindTime.value;
    const delta = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    this.uniforms.uWindTime.value += delta;
    return this.uniforms.uWindTime.value;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    return this;
  }

  dispose() {
    this.enabled = false;
    this.isDisposed = true;
  }
}

export const vegetationSwayPatchVersion = SWAY_PATCH_VERSION;
