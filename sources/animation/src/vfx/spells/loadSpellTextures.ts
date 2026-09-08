import * as THREE from 'three';

export interface SpellTextures {
  readonly fire: THREE.Texture;
  readonly smoke: THREE.Texture;
  dispose(): void;
}

export async function loadSpellTextures(): Promise<SpellTextures> {
  const loader = new THREE.TextureLoader();
  const results = await Promise.allSettled([
    loader.loadAsync('/vfx/spell-fire-explosion-atlas.png'),
    loader.loadAsync('/vfx/spell-smoke-atlas.png'),
  ]);
  const [fireResult, smokeResult] = results;
  if (fireResult.status !== 'fulfilled' || smokeResult.status !== 'fulfilled') {
    for (const result of results) if (result.status === 'fulfilled') result.value.dispose();
    throw fireResult.status === 'rejected' ? fireResult.reason
      : smokeResult.status === 'rejected' ? smokeResult.reason : new Error('Spell textures unavailable.');
  }
  const fire = fireResult.value;
  const smoke = smokeResult.value;
  for (const texture of [fire, smoke]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  }
  return { fire, smoke, dispose() { fire.dispose(); smoke.dispose(); } };
}
