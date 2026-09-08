import * as THREE from 'three';

// Multiple preview layers can request the same lighting without capturing one
// another's temporary colors. The final owner restores the original studio.
const previews = new WeakMap();
export function createEnchantmentLighting(stage, viewport) {
  const owner = {};
  let active = false;
  function restore() {
    if (!active) return;
    active = false;
    const state = previews.get(stage);
    state.owners.delete(owner);
    if (![...state.owners.values()].includes(viewport)) viewport?.classList.remove('enchantment-night');
    if (state.owners.size) return;
    stage.scene.background = state.background;
    stage.scene.environmentIntensity = state.environmentIntensity;
    if (stage.scene.fog && state.fog) stage.scene.fog.color.copy(state.fog);
    if (stage.ground && state.ground) stage.ground.material.color.copy(state.ground);
    for (const [light, intensity] of state.lights) light.intensity = intensity;
    previews.delete(stage);
  }
  return {
    set(enabled) {
      if (!enabled) { restore(); return; }
      if (active) return;
      let state = previews.get(stage);
      if (!state) {
        const lights = stage.scene.children.filter(child => child.isLight).map(light => [light, light.intensity]);
        state = {background: stage.scene.background, environmentIntensity: stage.scene.environmentIntensity,
          ground: stage.ground?.material.color.clone(), fog: stage.scene.fog?.color.clone(), lights, owners: new Map()};
        previews.set(stage, state);
        stage.scene.background = new THREE.Color('#141b27');
        stage.scene.environmentIntensity = .32;
        stage.scene.fog?.color.set('#141b27');
        stage.ground?.material.color.set('#171d25');
        for (const [light, intensity] of lights) light.intensity = intensity * (light.isHemisphereLight ? .65 : .48);
      }
      state.owners.set(owner, viewport);
      active = true;
      viewport?.classList.add('enchantment-night');
    },
    get active() { return active; },
    dispose: restore,
  };
}
