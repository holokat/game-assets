import type { MoveDefinition, MoveId } from './types';
import { JUMP_ARC_DURATION, JUMP_ARC_LAND_EVENT } from './recipes/jumpArcRecipe';
import { SPELL_MOTIONS } from './spellMotion';
import { WHIRLWIND_TIMING } from './whirlwindMotion';

export const MOVE_CATALOG: readonly MoveDefinition[] = [
  {
    id: 'idle', label: 'Relaxed idle', category: 'Stance', keys: ['1'], duration: 5.6, loop: true,
    description: 'Asymmetrical rest with breathing, ankle corrections, and quiet weight transfer.',
    fadeIn: 0.24, fadeOut: 0.2, cooldown: 0, movementScale: 1, showInDeck: true, events: [],
  },
  {
    id: 'combat-idle', label: 'Combat idle', category: 'Stance', keys: ['2'], duration: 2.8, loop: true,
    description: 'Staggered guard with soft knees, a protected centerline, and active balance.',
    fadeIn: 0.2, fadeOut: 0.18, cooldown: 0, movementScale: 1, showInDeck: true, events: [],
  },
  {
    id: 'idle-shift', label: 'Idle weight shift', category: 'Stance', keys: [], duration: 2.4, loop: false,
    description: 'Transfers support to the opposite leg, settles the pelvis, then recovers.',
    fadeIn: 0.24, fadeOut: 0.26, cooldown: 0, movementScale: 1, showInDeck: true, events: [],
  },
  {
    id: 'idle-scan', label: 'Idle scan', category: 'Stance', keys: [], duration: 2.9, loop: false,
    description: 'A restrained head check with delayed shoulders and a small grip adjustment.',
    fadeIn: 0.24, fadeOut: 0.28, cooldown: 0, movementScale: 1, showInDeck: true, events: [],
  },
  {
    id: 'walk-start', label: 'Walk start', category: 'Locomotion', keys: [], duration: 0.52, loop: false,
    description: 'Falls forward from the ankles, releases the rear foot, and establishes cadence.',
    fadeIn: 0.1, fadeOut: 0.12, cooldown: 0, movementScale: 1, travelSpeed: 1.18, showInDeck: true, events: [],
  },
  {
    id: 'walk', label: 'Walk forward', category: 'Locomotion', keys: ['W'], duration: 1.04, loop: true,
    description: 'Eight-phase forward gait with foot roll, pelvis transfer, and opposing arm swing.',
    fadeIn: 0.14, fadeOut: 0.14, cooldown: 0, movementScale: 1, travelSpeed: 1.18, showInDeck: true, events: [],
  },
  {
    id: 'walk-stop', label: 'Walk stop', category: 'Locomotion', keys: [], duration: 0.48, loop: false,
    description: 'Shortens the final step, absorbs momentum, and settles over one foot.',
    fadeIn: 0.08, fadeOut: 0.2, cooldown: 0, movementScale: 1, travelSpeed: 0.55, showInDeck: true, events: [],
  },
  {
    id: 'walk-backward', label: 'Walk backward', category: 'Locomotion', keys: ['S'], duration: 1.18, loop: true,
    description: 'Cautious toe-first retreat with the chest guarding forward and shorter steps.',
    fadeIn: 0.16, fadeOut: 0.16, cooldown: 0, movementScale: 1, travelSpeed: 0.82, showInDeck: true, events: [],
  },
  {
    id: 'strafe-left', label: 'Strafe left', category: 'Locomotion', keys: ['A'], duration: 1.08, loop: true,
    description: 'Leftward combat step with lateral push, crossover avoidance, and level guard.',
    fadeIn: 0.15, fadeOut: 0.15, cooldown: 0, movementScale: 1, travelSpeed: 0.92, showInDeck: true, events: [],
  },
  {
    id: 'strafe-right', label: 'Strafe right', category: 'Locomotion', keys: ['D'], duration: 1.08, loop: true,
    description: 'Mirrored rightward combat step with the pelvis held over the supporting foot.',
    fadeIn: 0.15, fadeOut: 0.15, cooldown: 0, movementScale: 1, travelSpeed: 0.92, showInDeck: true, events: [],
  },
  {
    id: 'run-start', label: 'Run start', category: 'Locomotion', keys: [], duration: 0.46, loop: false,
    description: 'Drops the center of mass and drives through the first accelerating step.',
    fadeIn: 0.08, fadeOut: 0.1, cooldown: 0, movementScale: 1, travelSpeed: 2.45, showInDeck: true, events: [],
  },
  {
    id: 'run', label: 'Run', category: 'Locomotion', keys: ['Shift', 'W'], duration: 0.72, loop: true,
    description: 'Forward-leaning run with flight phases, compact arm drive, and hip counterrotation.',
    fadeIn: 0.12, fadeOut: 0.12, cooldown: 0, movementScale: 1, travelSpeed: 2.45, showInDeck: true, events: [],
  },
  {
    id: 'run-stop', label: 'Run stop', category: 'Locomotion', keys: [], duration: 0.64, loop: false,
    description: 'Braking steps lower the hips before the chest catches up and settles.',
    fadeIn: 0.08, fadeOut: 0.2, cooldown: 0, movementScale: 1, travelSpeed: 1.1, showInDeck: true, events: [],
  },
  {
    id: 'turn-left', label: 'Turn left', category: 'Locomotion', keys: ['Z'], duration: 0.68, loop: false,
    description: 'Plants the left foot, opens the pelvis, then lets the shoulders and head arrive.',
    fadeIn: 0.1, fadeOut: 0.18, cooldown: 0.18, movementScale: 0, showInDeck: true, events: [],
  },
  {
    id: 'turn-right', label: 'Turn right', category: 'Locomotion', keys: ['X'], duration: 0.68, loop: false,
    description: 'Mirrored pivot led by the supporting foot and pelvis rather than the shoulders.',
    fadeIn: 0.1, fadeOut: 0.18, cooldown: 0.18, movementScale: 0, showInDeck: true, events: [],
  },
  {
    id: 'jump-launch', label: 'Jump launch', category: 'Airborne', keys: ['Space'], duration: 0.46, loop: false,
    description: 'Two-stage crouch, backward arm load, and coordinated ankle-knee-hip extension.',
    fadeIn: 0.06, fadeOut: 0.08, cooldown: 0.32, movementScale: 0.5, showInDeck: true,
    events: [{ at: 0.36, type: 'jump-launch' }],
  },
  {
    id: 'jump-air', label: 'Vertical jump flight', category: 'Airborne', keys: [], duration: 0.66, loop: false,
    description: 'Straight rising line, overhead reach, relaxed apex, and controlled landing preparation.',
    fadeIn: 0.06, fadeOut: 0.06, cooldown: 0, movementScale: 0, showInDeck: true, events: [],
  },
  {
    id: 'running-leap', label: 'Running leap', category: 'Airborne', keys: ['Shift', 'Space'], duration: 1.42, loop: false,
    description: 'Long final stride, one-foot drive, split flight, lead-foot landing, and run-through recovery.',
    fadeIn: 0.05, fadeOut: 0.1, cooldown: 0.5, movementScale: 0, travelSpeed: 2.06, showInDeck: true,
    events: [{ at: 0.4, type: 'jump-launch' }, { at: 1.09, type: 'jump-land' }],
  },
  {
    id: 'airborne', label: 'Airborne loop', category: 'Airborne', keys: [], duration: 0.86, loop: true,
    description: 'Asymmetrical tuck, apex relaxation, and feet reaching toward the floor.',
    fadeIn: 0.08, fadeOut: 0.08, cooldown: 0, movementScale: 0.5, showInDeck: true, events: [],
  },
  {
    id: 'surface-swim', label: 'Surface swim', category: 'Swimming', keys: ['W'], duration: 1.6, loop: true,
    description: 'Depth-gated freestyle with alternating reach, pull, recovery, body roll, and flutter kick.',
    fadeIn: 0.24, fadeOut: 0.22, cooldown: 0, movementScale: 1, travelSpeed: 1.35, showInDeck: true, events: [],
  },
  {
    id: 'tread-water', label: 'Tread water', category: 'Swimming', keys: [], duration: 2.4, loop: true,
    description: 'Stationary deep-water support with sculling hands and alternating compact kicks.',
    fadeIn: 0.22, fadeOut: 0.22, cooldown: 0, movementScale: 0, showInDeck: true, events: [],
  },
  {
    id: 'land-soft', label: 'Soft landing', category: 'Airborne', keys: [], duration: 0.72, loop: false,
    description: 'Foot contact, deep knee absorption, delayed torso follow-through, and quiet recovery.',
    fadeIn: 0.05, fadeOut: 0.2, cooldown: 0.18, movementScale: 0.2, showInDeck: true,
    events: [{ at: 0.06, type: 'jump-land' }],
  },
  {
    id: 'land-hard', label: 'Hard landing', category: 'Airborne', keys: [], duration: 0.92, loop: false,
    description: 'Deep impact compression with delayed chest, arm, and head follow-through.',
    fadeIn: 0.04, fadeOut: 0.26, cooldown: 0.38, movementScale: 0, showInDeck: true,
    events: [{ at: 0.09, type: 'jump-land' }],
  },
  {
    id: 'dodge', label: 'Dodge', category: 'Airborne', keys: ['C'], duration: 0.62, loop: false,
    description: 'Loads the opposite leg, drives laterally, and leaves a readable recovery.',
    fadeIn: 0.05, fadeOut: 0.14, cooldown: 0.65, movementScale: 0, showInDeck: true,
    events: [{ at: 0.08, type: 'dodge-start' }],
  },
  {
    id: 'light-attack', label: 'Light attack', category: 'Weapon', keys: ['F'], duration: 0.72, loop: false,
    description: 'Fast hip-led cut with a compact windup, contact frame, follow-through, and recovery.',
    fadeIn: 0.06, fadeOut: 0.16, cooldown: 0.38, movementScale: 0.16, showInDeck: true,
    events: [{ at: 0.28, type: 'swing-trail' }, { at: 0.45, type: 'swing-impact' }],
  },
  {
    id: 'heavy-attack', label: 'Heavy attack', category: 'Weapon', keys: ['G'], duration: 1.34, loop: false,
    description: 'Long weight transfer into a committed diagonal strike with vulnerable recovery.',
    fadeIn: 0.08, fadeOut: 0.24, cooldown: 0.92, movementScale: 0.08, showInDeck: true,
    events: [{ at: 0.55, type: 'swing-trail' }, { at: 0.78, type: 'swing-impact' }],
  },
  {
    id: 'two-handed-strike', label: 'Two-handed overhead strike', category: 'Weapon', keys: ['R'], duration: 1.62, loop: false,
    description: 'Loads the rear leg, raises both hands overhead, cuts through a braced impact, and recovers under control.',
    fadeIn: 0.08, fadeOut: 0.24, cooldown: 1.05, movementScale: 0, showInDeck: true,
    events: [{ at: 0.64, type: 'swing-trail' }, { at: 0.82, type: 'swing-impact' }],
  },
  {
    id: 'cast', label: 'Spell cast', category: 'Magic', keys: ['E'], duration: 1.25, loop: false,
    description: 'Circles one orb with both hands, then pushes it forward from a lightly bent stance.',
    fadeIn: 0.1, fadeOut: 0.2, cooldown: 0.85, movementScale: 0, showInDeck: true,
    events: [{ at: 0.24, type: 'cast-gather' }, { at: 0.78, type: 'cast-release' }],
  },
  {
    id: 'fireball', label: 'Fireball', category: 'Magic', keys: ['3'], duration: SPELL_MOTIONS.fireball.duration, loop: false,
    description: 'Steps back to gather power between both hands, then drives one fireball forward.',
    fadeIn: 0.07, fadeOut: 0.16, cooldown: 0.82, movementScale: 0, showInDeck: true,
    events: [
      { at: SPELL_MOTIONS.fireball.gather, type: 'cast-gather' },
      { at: SPELL_MOTIONS.fireball.release[0]!, type: 'cast-release' },
    ],
  },
  {
    id: 'lightning', label: 'Lightning', category: 'Magic', keys: ['4'], duration: SPELL_MOTIONS.lightning.duration, loop: false,
    description: 'Raises both arms to charge overhead, then directs the strike down and forward.',
    fadeIn: 0.08, fadeOut: 0.18, cooldown: 0.88, movementScale: 0, showInDeck: true,
    events: [
      { at: SPELL_MOTIONS.lightning.gather, type: 'cast-gather' },
      { at: SPELL_MOTIONS.lightning.release[0]!, type: 'cast-release' },
    ],
  },
  {
    id: 'energy-missiles', label: 'Energy missiles', category: 'Magic', keys: ['5'], duration: SPELL_MOTIONS['energy-missiles'].duration, loop: false,
    description: 'Fires three quick alternating palm strikes from a compact casting guard.',
    fadeIn: 0.05, fadeOut: 0.13, cooldown: 0.82, movementScale: 0, showInDeck: true,
    events: [
      { at: SPELL_MOTIONS['energy-missiles'].gather, type: 'cast-gather' },
      ...SPELL_MOTIONS['energy-missiles'].release.map((at) => ({ at, type: 'cast-release' as const })),
    ],
  },
  {
    id: 'healing', label: 'Healing', category: 'Magic', keys: ['6'], duration: SPELL_MOTIONS.healing.duration, loop: false,
    description: 'Raises open hands, gathers energy at the heart, and extends both palms outward.',
    fadeIn: 0.1, fadeOut: 0.22, cooldown: 1.12, movementScale: 0, showInDeck: true,
    events: [
      { at: SPELL_MOTIONS.healing.gather, type: 'cast-gather' },
      { at: SPELL_MOTIONS.healing.release[0]!, type: 'cast-release' },
    ],
  },
  {
    id: 'whirlwind', label: 'Whirlwind', category: 'Weapon', keys: ['Q'], duration: WHIRLWIND_TIMING.duration, loop: false,
    description: 'Compresses into a quick sword sweep, completes a full turn, and plants before recovering.',
    fadeIn: WHIRLWIND_TIMING.fadeIn, fadeOut: WHIRLWIND_TIMING.fadeOut,
    cooldown: WHIRLWIND_TIMING.cooldown, movementScale: 0, showInDeck: true,
    events: [
      { at: WHIRLWIND_TIMING.windupEnd, type: 'whirlwind-start' },
      { at: WHIRLWIND_TIMING.firstCut, type: 'whirlwind-pulse' },
      { at: WHIRLWIND_TIMING.finalCut, type: 'whirlwind-pulse' },
    ],
  },
  {
    id: 'jump', label: 'Standing jump', category: 'Airborne', keys: ['J'], duration: JUMP_ARC_DURATION, loop: false,
    description: 'The whole standing jump in one clip: crouch, drive, flight, and a landing the knees absorb.',
    fadeIn: 0.06, fadeOut: 0.18, cooldown: 0.34, movementScale: 0, showInDeck: true,
    events: [{ at: 0.36, type: 'jump-launch' }, { at: JUMP_ARC_LAND_EVENT, type: 'jump-land' }],
  },
  {
    id: 'die', label: 'Death', category: 'Reaction', keys: ['K'], duration: 1.4, loop: false,
    description: 'A hit throws the chest back, the knees give, the body lands on its back, and the head arrives last.',
    fadeIn: 0.05, fadeOut: 0.3, cooldown: 0.5, movementScale: 0, showInDeck: true,
    events: [{ at: 0.07, type: 'hit-react' }],
  },
  {
    id: 'hit', label: 'Hit reaction', category: 'Reaction', keys: ['H'], duration: 0.5, loop: false,
    description: 'Directional recoil travels from the hips through the spine, head, and hands.',
    fadeIn: 0.035, fadeOut: 0.13, cooldown: 0.2, movementScale: 0, showInDeck: true,
    events: [{ at: 0.05, type: 'hit-react' }],
  },
] as const;

export const MOVE_BY_ID = new Map<MoveId, MoveDefinition>(
  MOVE_CATALOG.map((move) => [move.id, move]),
);
