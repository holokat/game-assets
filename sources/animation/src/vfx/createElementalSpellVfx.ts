import * as THREE from 'three';
import { SPELL_MOTIONS } from '../animation/spellMotion';
import type { MoveId } from '../animation/types';
import type { WarriorSocketName } from '../character/loadWarrior';
import { createEnergyMissilesVfx, ENERGY_MISSILES_END } from './spells/createEnergyMissilesVfx';
import { createFireballDirector } from './spells/createFireballDirector';
import { createHealingVfx } from './spells/createHealingVfx';
import { createLightningVfx, LIGHTNING_END } from './spells/createLightningVfx';
import { createSpellSequenceDirector } from './spells/createSpellSequenceDirector';
import { createSpellEffectContext } from './spells/spellVfxUtils';
import type { SpellTextures } from './spells/loadSpellTextures';
import type { SpellImpactResolver } from './spells/createSpellImpactResolver';

export interface ElementalSpellVfx {
  update(move: MoveId, normalizedTime: number, deltaSeconds?: number): void;
  samplePresentation(worldPosition: THREE.Vector3): number;
  reset(): void;
  dispose(): void;
}

export function createElementalSpellVfx(
  actor: THREE.Object3D,
  sockets: ReadonlyMap<WarriorSocketName, THREE.Object3D>,
  options: { textures?: SpellTextures; resolveImpact?: SpellImpactResolver } = {},
): ElementalSpellVfx {
  const context = { ...createSpellEffectContext(actor, sockets), ...options };
  const sequences = [
    { id: 'fireball' as const, director: createFireballDirector(context) },
    { id: 'lightning' as const, director: createSpellSequenceDirector(() => createLightningVfx(context), {
      capacity: 2, release: SPELL_MOTIONS.lightning.release[0]!, end: LIGHTNING_END, residualPrefix: 'LightningResidual',
    }) },
    { id: 'energy-missiles' as const, director: createSpellSequenceDirector(() => createEnergyMissilesVfx(context), {
      capacity: 2, release: SPELL_MOTIONS['energy-missiles'].release[0]!, end: ENERGY_MISSILES_END,
      residualPrefix: 'EnergyMissilesResidual',
    }) },
  ];
  const healing = createHealingVfx(context);
  const candidate = new THREE.Vector3();

  return {
    update(move, normalizedTime, deltaSeconds) {
      const progress = THREE.MathUtils.clamp(normalizedTime, 0, 1);
      for (const { id, director } of sequences) {
        director.update(move === id, progress * SPELL_MOTIONS[id].duration, deltaSeconds);
      }
      healing.root.visible = false;
      if (move === 'healing') healing.update(progress * SPELL_MOTIONS.healing.duration);
    },
    samplePresentation(worldPosition) {
      let strength = 0;
      for (const { director } of sequences) {
        const value = director.samplePresentation(candidate);
        if (value > strength) { strength = value; worldPosition.copy(candidate); }
      }
      return strength;
    },
    reset() {
      for (const { director } of sequences) director.reset();
      healing.root.visible = false;
    },
    dispose() {
      for (const { director } of sequences) director.dispose();
      healing.dispose();
    },
  };
}
