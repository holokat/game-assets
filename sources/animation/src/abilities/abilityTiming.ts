import { MOVE_BY_ID } from '../animation/moveCatalog';
import type { AbilityDefinition } from './types';
import { summonKind, SUMMON_TAIL } from './summonDefinitions';

const ACTION_TIMING: Readonly<Record<string, readonly [number, number]>> = {
  lunge: [.58,.68], blink: [.28,.42], shadowstep: [.28,.42], disengage: [.22,.65],
  snare: [.8,.9], 'beast-call': [1.15,.8], fireball: [.78,.57],
};

/** Preview time is separate from gameplay cooldown and persistent buff duration. */
export function abilityTiming(ability: AbilityDefinition) {
  const move = MOVE_BY_ID.get(ability.visual.motion)!;
  const event = move.events.find(item => /impact|release|pulse|land/.test(item.type));
  const marker = ability.visual.pose === 'bow' || ['snare','beast-call','lunge','disengage','blink'].includes(ability.id) ? .5 : event ? event.at / move.duration : ability.visual.motion === 'lightning' ? .45 : .58;
  const custom = ACTION_TIMING[ability.id];
  const release = custom?.[0] ?? (ability.cast && ability.cast > 0 ? ability.cast : ability.visual.pose === 'bow' ? .85 : Math.max(.42, move.duration * marker));
  const recovery = custom?.[1] ?? (ability.visual.pose === 'bow' ? .8 : Math.max(.45, move.duration * (1 - marker)));
  const tail = summonKind(ability.id) ? SUMMON_TAIL : ability.id === 'meteor' ? 3.5 : ['fireball', 'aura', 'shield', 'portal', 'heal', 'song', 'mark', 'trap'].includes(ability.id === 'fireball' ? ability.id : ability.visual.family) ? 2.5 : 1.7;
  return { release, marker, recovery, duration: release + recovery + tail };
}
