import * as THREE from 'three';
import type { SpellEffect } from './types';

export interface SpellSequenceEffect extends SpellEffect {
  reset(): void;
  samplePresentation(worldPosition: THREE.Vector3): number;
  stopEmission?(): void;
}

interface SequenceOptions {
  readonly capacity: number;
  readonly release: number;
  readonly end: number;
  readonly residualPrefix: string;
}

/** Bounded instances let released effects finish after their casting pose ends. */
export function createSpellSequenceDirector(createEffect: () => SpellSequenceEffect, options: SequenceOptions) {
  const slots = Array.from({ length: options.capacity }, (_, index) => {
    const effect = createEffect();
    if (index) effect.root.name = `${options.residualPrefix}${index}`;
    return { effect, age: -1 };
  });
  let active = -1;
  let wasCasting = false;
  let previousTime = -1;
  const candidatePosition = new THREE.Vector3();
  function reset() {
    for (const slot of slots) { slot.effect.reset(); slot.age = -1; }
    active = -1;
    wasCasting = false;
    previousTime = -1;
  }
  return {
    reset,
    update(casting: boolean, time: number, delta?: number) {
      // Explicit seeks reconstruct a single pose. Paused live frames pass 0.
      if (delta === undefined) {
        reset();
        if (casting) {
          slots[0]!.effect.update(time);
          slots[0]!.age = time;
          active = 0;
        }
        wasCasting = casting;
        previousTime = time;
        return;
      }
      const step = Number.isFinite(delta) ? THREE.MathUtils.clamp(delta, 0, .1) : 0;
      const newCast = casting && (!wasCasting || time < previousTime - .00001);
      if (newCast) {
        if (active >= 0 && slots[active]!.age >= options.release) slots[active]!.effect.stopEmission?.();
        if (active >= 0 && slots[active]!.age < options.release) {
          slots[active]!.effect.reset();
          slots[active]!.age = -1;
        }
        active = slots.findIndex(slot => slot.age < 0);
        if (active < 0) {
          active = 0;
          for (let i = 1; i < slots.length; i++) if (slots[i]!.age > slots[active]!.age) active = i;
        }
        slots[active]!.effect.reset();
        slots[active]!.age = time;
      }
      if (!casting && wasCasting && active >= 0) {
        if (slots[active]!.age < options.release) {
          slots[active]!.effect.reset();
          slots[active]!.age = -1;
        }
        else slots[active]!.effect.stopEmission?.();
        active = -1;
      }
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!;
        if (slot.age < 0) continue;
        slot.age = casting && i === active ? time : slot.age + step;
        if (slot.age >= options.end) { slot.effect.reset(); slot.age = -1; }
        else slot.effect.update(slot.age);
      }
      wasCasting = casting;
      previousTime = time;
    },
    samplePresentation(worldPosition: THREE.Vector3) {
      let strength = 0;
      for (const slot of slots) {
        const value = slot.effect.samplePresentation(candidatePosition);
        if (value > strength) { strength = value; worldPosition.copy(candidatePosition); }
      }
      return strength;
    },
    dispose() { for (const slot of slots) slot.effect.dispose(); },
  };
}
