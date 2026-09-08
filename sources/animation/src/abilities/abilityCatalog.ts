import brief from './abilityBrief.json';
import { ABILITY_VISUALS } from './abilityVisuals';
import type { AbilityDefinition, AbilitySchool } from './types';

export const ABILITY_SCHOOLS: readonly AbilitySchool[] = ['Warrior', 'Ranger', 'Mage', 'Sorcerer', 'Necromancer', 'Healer', 'Rogue', 'Bard', 'Everyone'];
export const ABILITIES: readonly AbilityDefinition[] = brief.map(entry => {
  const visual = ABILITY_VISUALS[entry.id];
  if (!visual) throw new Error(`Missing effect direction for ${entry.name}.`);
  return { ...entry, school: entry.school as AbilitySchool, visual };
});
export const ABILITY_BY_ID = new Map(ABILITIES.map(ability => [ability.id, ability]));
export const isMagicSchool = (school: AbilitySchool): boolean => ['Mage', 'Sorcerer', 'Necromancer', 'Healer'].includes(school);
