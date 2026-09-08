import * as T from 'three';
import type { AbilityDefinition } from './types';
import { abilityTiming } from './abilityTiming';

const ease = T.MathUtils.smoothstep;
export const usesBow = (ability: AbilityDefinition) => ability.visual.pose === 'bow' || ability.id === 'disengage';

/** Preview distances, not gameplay range. Pure sampling supports reverse scrubbing. */
export function sampleActionTravel(id: string, phase: number, out: T.Vector3) {
  out.set(0, 0, 0);
  if (id === 'lunge') out.z = -.1 * ease(phase, 0, .24) + 2.1 * ease(phase, .25, .54);
  if (id === 'blink' || id === 'shadowstep') out.z = 3 * ease(phase, .43, .57);
  if (id === 'disengage') {
    const flight = T.MathUtils.clamp((phase - .22) / .52, 0, 1);
    out.z = -1.8 * ease(phase, .22, .74);
    out.y = Math.sin(flight * Math.PI) * .34;
  }
  return out;
}

export function actionPhase(ability: AbilityDefinition, time: number) {
  const t = abilityTiming(ability);
  return time < t.release ? .5 * time / t.release : Math.min(1, .5 + .5 * (time - t.release) / t.recovery);
}

export function createActionTravel(actor: T.Group, character: T.Group) {
  const start = new T.Vector3(), direction = new T.Quaternion(), offset = new T.Vector3();
  let active = false;
  return {
    begin() { start.copy(actor.position); direction.copy(actor.quaternion); active = true; },
    sample(ability: AbilityDefinition, phase: number) {
      if (!active) return;
      sampleActionTravel(ability.id, phase, offset).applyQuaternion(direction);
      actor.position.copy(start).add(offset);
      character.visible = !(ability.id === 'blink' && phase > .44 && phase < .56);
      actor.updateMatrixWorld(true);
    },
    stop() { character.visible = true; active = false; },
  };
}
