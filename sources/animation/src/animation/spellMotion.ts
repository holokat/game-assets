export const ELEMENTAL_SPELL_IDS = ['fireball', 'lightning', 'energy-missiles', 'healing'] as const;

export type ElementalSpellId = typeof ELEMENTAL_SPELL_IDS[number];

export interface ElementalSpellMotion {
  readonly duration: number;
  readonly gather: number;
  readonly release: readonly number[];
  readonly recover: number;
}

export const SPELL_MOTIONS: Readonly<Record<ElementalSpellId, ElementalSpellMotion>> = {
  fireball: { duration: 1.35, gather: 0.24, release: [0.78], recover: 1.04 },
  lightning: { duration: 1.65, gather: 0.22, release: [0.74], recover: 1.18 },
  'energy-missiles': { duration: 1.1, gather: 0.18, release: [0.43, 0.60, 0.77], recover: 0.9 },
  healing: { duration: 1.8, gather: 0.28, release: [1.08], recover: 1.42 },
};

export function isElementalSpell(move: string): move is ElementalSpellId {
  return (ELEMENTAL_SPELL_IDS as readonly string[]).includes(move);
}
