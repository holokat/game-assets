import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createSpellBloomSelection } from './createSpellBloomSelection';

/** Bloom contains only opted-in VFX. The lit character never enters its bright pass. */
export class SelectiveSpellBloomPass extends Pass {
  private readonly source = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  private readonly bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .52, .34, .65);
  private readonly selection: ReturnType<typeof createSpellBloomSelection>;
  private readonly clearColor = new THREE.Color();
  private readonly combine = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { tBase: { value: null }, tBloom: { value: null }, uBloomActive: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D tBase;uniform sampler2D tBloom;uniform float uBloomActive;varying vec2 vUv;
      void main(){vec4 base=texture2D(tBase,vUv);gl_FragColor=vec4(base.rgb+texture2D(tBloom,vUv).rgb*uBloomActive,base.a);}`,
  });
  private readonly quad = new FullScreenQuad(this.combine);
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly drawEmission = () => {
    const renderer = this.renderer!;
    renderer.setRenderTarget(this.source);
    renderer.clear(true, true, true);
    renderer.render(this.scene, this.camera);
  };

  constructor(private readonly scene: THREE.Scene, private readonly camera: THREE.Camera,
    private readonly resolutionScale = 1) {
    super();
    this.selection = createSpellBloomSelection(scene);
    this.source.texture.name = 'Spell bloom emission';
    this.combine.uniforms.tBloom!.value = this.bloom.renderTargetsHorizontal[0]!.texture;
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget, delta: number): void {
    const background = this.scene.background;
    const oldTarget = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    const shadowAutoUpdate = renderer.shadowMap.autoUpdate;
    const clearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    let active = false;
    try {
      this.renderer = renderer;
      this.scene.background = null;
      renderer.autoClear = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setClearColor(0x000000, 0);
      active = this.selection.render(this.drawEmission);
    } finally {
      this.scene.background = background;
      renderer.setClearColor(this.clearColor, clearAlpha);
      renderer.autoClear = autoClear;
      renderer.shadowMap.autoUpdate = shadowAutoUpdate;
      renderer.setRenderTarget(oldTarget);
      this.renderer = null;
    }
    if (active) this.bloom.render(renderer, writeBuffer, this.source, delta, false);
    // Use the blurred texture, not the emission source, to avoid adding the spell core twice.
    this.combine.uniforms.tBase!.value = readBuffer.texture;
    this.combine.uniforms.uBloomActive!.value = active ? 1 : 0;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  override setSize(width: number, height: number): void {
    const scaledWidth = Math.max(1, Math.round(width * this.resolutionScale));
    const scaledHeight = Math.max(1, Math.round(height * this.resolutionScale));
    this.source.setSize(scaledWidth, scaledHeight);
    this.bloom.setSize(scaledWidth, scaledHeight);
  }

  override dispose(): void {
    this.source.dispose();
    this.bloom.dispose();
    this.combine.dispose();
    this.quad.dispose();
  }
}
