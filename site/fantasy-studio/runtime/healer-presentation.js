import {HEALER_EFFECT_IDS} from './healer/healer-vfx.js';
import {createEnchantmentLighting} from './enchantment-lighting.js';

const supported = new Set(HEALER_EFFECT_IDS);
export function isHealerPreview(state) {
  return state?.type === 'ability' && supported.has(state.id);
}

/** Stage presentation belongs to the workspace, never to a weapon or character. */
export function createHealerPresentation(stage, viewport) {
  const lighting = createEnchantmentLighting(stage, viewport);
  return {
    sync(state, active) { lighting.set(active && isHealerPreview(state) && state.showEffects); },
    dispose() { lighting.dispose(); },
  };
}

const views = Object.freeze({
  front: [0, -39, 14], side: [-39, 0, 14], back: [0, 39, 14],
  three: [12, -39, 15], elevated: [14, -28, 28], top: [0, -.001, 36],
});
/** Include the crown and ground seal when inspecting a tall healer effect. */
export function frameHealerPreview(stage, view = 'three') {
  const position = views[view];
  if (!position) return false;
  stage.controls.target.set(0, 0, 7.4);
  stage.camera.position.set(...position);
  stage.controls.maxDistance = 65;
  stage.controls.update();
  return true;
}
