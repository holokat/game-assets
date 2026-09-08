import * as THREE from 'three';
import { enableSpellBloom } from './spellBloom';

interface Uniform<T> { value: T }

export interface SpellGlowUniforms {
  readonly [uniform: string]: Uniform<unknown>;
  readonly uColor: Uniform<THREE.Color>;
  readonly uAlpha: Uniform<number>;
  readonly uTime: Uniform<number>;
  readonly uIntensity: Uniform<number>;
  readonly uSize: Uniform<number>;
}

export interface SpellGlow {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly uniforms: SpellGlowUniforms;
  dispose(): void;
}

export function createSpellGlow(color: THREE.ColorRepresentation, size: number): SpellGlow {
  const uniforms: SpellGlowUniforms = {
    uColor: { value: new THREE.Color(color) },
    uAlpha: { value: 1 },
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uSize: { value: size },
  };
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = enableSpellBloom(new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uSize;
      varying vec2 vDisc;
      void main() {
        vDisc = position.xy;
        vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float worldScale = 0.5 * (length(modelMatrix[0].xyz) + length(modelMatrix[1].xyz));
        center.xy += position.xy * uSize * worldScale;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vDisc;
      void main() {
        float radius = length(vDisc);
        float angle = atan(vDisc.y, vDisc.x);
        float flame = sin(angle * 7.0 + uTime * 9.0) * 0.035
          + sin(angle * 13.0 - uTime * 13.0) * 0.018;
        float shapedRadius = radius / max(0.82, 1.0 + flame);
        float outer = 1.0 - smoothstep(0.12, 1.0, shapedRadius);
        float core = pow(max(0.0, 1.0 - radius), 5.0);
        float alpha = uAlpha * outer * (0.3 + core * 0.7);
        if (alpha < 0.004) discard;
        vec3 hot = mix(uColor, vec3(1.0), core * 0.72);
        gl_FragColor = vec4(hot * uIntensity, alpha);
      }
    `,
  }));
  material.toneMapped = false;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export interface SpellRibbonUniforms {
  readonly [uniform: string]: Uniform<unknown>;
  readonly uColor: Uniform<THREE.Color>;
  readonly uAlpha: Uniform<number>;
  readonly uTime: Uniform<number>;
  readonly uWidth: Uniform<number>;
}

export interface SpellRibbon {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly uniforms: SpellRibbonUniforms;
  update(points: readonly THREE.Vector3[] | Float32Array): void;
  dispose(): void;
}

export function createSpellRibbon(
  color: THREE.ColorRepresentation,
  pointCount: number,
  width: number,
): SpellRibbon {
  if (pointCount < 2) throw new Error('A spell ribbon requires at least two points.');
  const positions = new Float32Array(pointCount * 2 * 3);
  const previous = new Float32Array(pointCount * 2 * 3);
  const next = new Float32Array(pointCount * 2 * 3);
  const sides = new Float32Array(pointCount * 2);
  const tapers = new Float32Array(pointCount * 2);
  const indices = new Uint16Array((pointCount - 1) * 6);
  for (let index = 0; index < pointCount; index += 1) {
    const progress = index / (pointCount - 1);
    const taper = Math.pow(progress, 0.42);
    sides[index * 2] = -1;
    sides[index * 2 + 1] = 1;
    tapers[index * 2] = taper;
    tapers[index * 2 + 1] = taper;
    if (index === pointCount - 1) continue;
    const vertex = index * 2;
    const offset = index * 6;
    indices.set([vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2], offset);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPrevious', new THREE.BufferAttribute(previous, 3));
  geometry.setAttribute('aNext', new THREE.BufferAttribute(next, 3));
  geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
  geometry.setAttribute('aTaper', new THREE.BufferAttribute(tapers, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  const uniforms: SpellRibbonUniforms = {
    uColor: { value: new THREE.Color(color) },
    uAlpha: { value: 1 },
    uTime: { value: 0 },
    uWidth: { value: width },
  };
  const material = enableSpellBloom(new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uWidth;
      attribute vec3 aPrevious;
      attribute vec3 aNext;
      attribute float aSide;
      attribute float aTaper;
      varying float vAcross;
      varying float vTaper;
      void main() {
        vec3 currentView = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vec3 previousView = (modelViewMatrix * vec4(aPrevious, 1.0)).xyz;
        vec3 nextView = (modelViewMatrix * vec4(aNext, 1.0)).xyz;
        vec3 tangent = normalize(nextView - previousView + vec3(0.00001));
        vec3 viewDirection = normalize(-currentView);
        vec3 normal = normalize(cross(tangent, viewDirection) + vec3(0.00001));
        float worldScale = length(modelMatrix[0].xyz);
        currentView += normal * uWidth * worldScale * aSide * aTaper;
        vAcross = aSide;
        vTaper = aTaper;
        gl_Position = projectionMatrix * vec4(currentView, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uTime;
      varying float vAcross;
      varying float vTaper;
      void main() {
        float softEdge = pow(max(0.0, 1.0 - abs(vAcross)), 0.65);
        float plasma = 0.78 + 0.22 * sin(uTime * 24.0 + vTaper * 8.0);
        float alpha = uAlpha * softEdge * vTaper;
        if (alpha < 0.004) discard;
        vec3 hot = mix(uColor, vec3(1.0), softEdge * 0.46) * plasma;
        gl_FragColor = vec4(hot, alpha);
      }
    `,
  }));
  material.toneMapped = false;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  const point = new THREE.Vector3();
  const prior = new THREE.Vector3();
  const following = new THREE.Vector3();

  return {
    mesh,
    uniforms,
    update(points) {
      const packed = points instanceof Float32Array;
      if (points.length !== (packed ? pointCount * 3 : pointCount)) {
        throw new Error(`Expected ${pointCount} spell ribbon points.`);
      }
      const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      const previousAttribute = geometry.getAttribute('aPrevious') as THREE.BufferAttribute;
      const nextAttribute = geometry.getAttribute('aNext') as THREE.BufferAttribute;
      for (let index = 0; index < pointCount; index += 1) {
        if (packed) {
          point.fromArray(points as Float32Array, index * 3);
          prior.fromArray(points as Float32Array, Math.max(0, index - 1) * 3);
          following.fromArray(points as Float32Array, Math.min(pointCount - 1, index + 1) * 3);
        } else {
          point.copy((points as readonly THREE.Vector3[])[index]!);
          prior.copy((points as readonly THREE.Vector3[])[Math.max(0, index - 1)]!);
          following.copy((points as readonly THREE.Vector3[])[Math.min(pointCount - 1, index + 1)]!);
        }
        for (let side = 0; side < 2; side += 1) {
          const vertex = index * 2 + side;
          positionAttribute.setXYZ(vertex, point.x, point.y, point.z);
          previousAttribute.setXYZ(vertex, prior.x, prior.y, prior.z);
          nextAttribute.setXYZ(vertex, following.x, following.y, following.z);
        }
      }
      positionAttribute.needsUpdate = true;
      previousAttribute.needsUpdate = true;
      nextAttribute.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
