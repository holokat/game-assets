import { createFireballVfx, FIREBALL_END, FIREBALL_RELEASE } from './createFireballVfx';
import { createSpellSequenceDirector } from './createSpellSequenceDirector';
import type { SpellEffectContext } from './types';

/** Three reusable sequences let an impact finish while the next cast starts. */
export function createFireballDirector(context: SpellEffectContext) {
  return createSpellSequenceDirector(() => createFireballVfx(context), {
    capacity: 3,
    release: FIREBALL_RELEASE,
    end: FIREBALL_END,
    residualPrefix: 'FireballResidual',
  });
}
