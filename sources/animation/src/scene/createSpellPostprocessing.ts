import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SelectiveSpellBloomPass } from './SelectiveSpellBloomPass';

export interface SpellPresentation {
  readonly position: THREE.Vector3;
  readonly strength: number;
  /** Radius in normalized screen height. */
  readonly radius?: number;
}

export interface SpellPostprocessing {
  render(deltaSeconds?: number): void;
  setSize(width: number, height: number): void;
  setSpellPresentation(value: SpellPresentation | null): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

const DISTORTION_SHADER = {
  name: 'LocalizedSpellDistortion',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uStrength: { value: 0 },
    uRadius: { value: 0.14 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uCenter;
    uniform float uStrength;
    uniform float uRadius;
    uniform float uAspect;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec2 fromCenter = vUv - uCenter;
      vec2 metric = vec2(fromCenter.x * uAspect, fromCenter.y);
      float distanceFromCenter = length(metric);
      float mask = 1.0 - smoothstep(uRadius * 0.28, uRadius, distanceFromCenter);
      vec2 direction = metric / max(distanceFromCenter, 0.0001);
      float wave = sin(distanceFromCenter * 92.0 - uTime * 15.0) * 0.55
        + sin(distanceFromCenter * 47.0 + uTime * 9.0) * 0.45;
      vec2 offset = direction * wave * mask * uStrength * 0.006;
      offset.x /= uAspect;
      gl_FragColor = texture2D(tDiffuse, clamp(vUv + offset, vec2(0.001), vec2(0.999)));
    }
  `,
};

export function createSpellPostprocessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  bloomResolutionScale = 1,
): SpellPostprocessing {
  const composer = new EffectComposer(renderer);
  let composerPixelRatio = renderer.getPixelRatio();
  composer.setPixelRatio(composerPixelRatio);
  // Keep renderer.info representative of the complete composer frame rather than its final pass.
  renderer.info.autoReset = false;
  if (renderer.capabilities.isWebGL2) {
    composer.renderTarget1.samples = 2;
    composer.renderTarget2.samples = 2;
  }
  const renderPass = new RenderPass(scene, camera);
  const distortionPass = new ShaderPass(DISTORTION_SHADER);
  const bloomPass = new SelectiveSpellBloomPass(scene, camera, bloomResolutionScale);
  const outputPass = new OutputPass();
  distortionPass.enabled = false;
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(distortionPass);
  composer.addPass(outputPass);

  const worldPosition = new THREE.Vector3();
  const projectedPosition = new THREE.Vector3();
  let requestedStrength = 0;
  let requestedRadius = 0.14;
  let enabled = true;
  let elapsedTime = 0;

  function updateDistortion(): void {
    projectedPosition.copy(worldPosition).project(camera);
    const visible = requestedStrength > 0.0001
      && projectedPosition.z >= -1 && projectedPosition.z <= 1
      && Math.abs(projectedPosition.x) < 1.3 && Math.abs(projectedPosition.y) < 1.3;
    distortionPass.enabled = visible;
    if (!visible) return;
    distortionPass.uniforms.uCenter!.value.set(
      projectedPosition.x * 0.5 + 0.5,
      projectedPosition.y * 0.5 + 0.5,
    );
    distortionPass.uniforms.uStrength!.value = requestedStrength;
    distortionPass.uniforms.uRadius!.value = requestedRadius;
    distortionPass.uniforms.uTime!.value = elapsedTime;
  }

  return {
    render(deltaSeconds = 0) {
      renderer.info.reset();
      if (!enabled) {
        renderer.render(scene, camera);
        return;
      }
      const safeDelta = Number.isFinite(deltaSeconds) ? THREE.MathUtils.clamp(deltaSeconds, 0, 0.05) : 0;
      elapsedTime += safeDelta;
      updateDistortion();
      composer.render(safeDelta);
    },
    setSize(width, height) {
      const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
      const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
      const nextPixelRatio = renderer.getPixelRatio();
      if (Math.abs(composerPixelRatio - nextPixelRatio) > 0.0001) {
        composerPixelRatio = nextPixelRatio;
        composer.setPixelRatio(composerPixelRatio);
      }
      composer.setSize(safeWidth, safeHeight);
      distortionPass.uniforms.uAspect!.value = safeWidth / safeHeight;
    },
    setSpellPresentation(value) {
      if (!value) {
        requestedStrength = 0;
        distortionPass.enabled = false;
        return;
      }
      worldPosition.copy(value.position);
      const finitePosition = Number.isFinite(worldPosition.x)
        && Number.isFinite(worldPosition.y)
        && Number.isFinite(worldPosition.z);
      requestedStrength = finitePosition && Number.isFinite(value.strength)
        ? THREE.MathUtils.clamp(value.strength, 0, 1) : 0;
      requestedRadius = Number.isFinite(value.radius ?? 0.14)
        ? THREE.MathUtils.clamp(value.radius ?? 0.14, 0.04, 0.32) : 0.14;
    },
    setEnabled(value) {
      enabled = value;
    },
    dispose() {
      distortionPass.dispose();
      bloomPass.dispose();
      outputPass.dispose();
      composer.dispose();
    },
  };
}
