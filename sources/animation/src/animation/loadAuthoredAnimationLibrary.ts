import * as THREE from 'three';
import type { MoveEventType, MoveId } from './types';
import { correctRelaxedIdlePosture } from './correctRelaxedIdlePosture';

interface SerializedAnimationBank {
  readonly version: 1;
  readonly clips: readonly ReturnType<typeof THREE.AnimationClip.toJSON>[];
  readonly sources?: readonly unknown[];
}

export interface AuthoredClipMapping {
  readonly move: MoveId;
  readonly sourceClips: readonly string[];
  readonly duration: number;
  readonly eventPhases?: Readonly<Partial<Record<MoveEventType, number>>>;
}

export interface AuthoredAnimationLibrary {
  readonly clips: ReadonlyMap<MoveId, THREE.AnimationClip>;
  readonly authoredMoves: ReadonlySet<MoveId>;
  readonly eventPhases: ReadonlyMap<MoveId, Readonly<Partial<Record<MoveEventType, number>>>>;
  readonly travelSpeeds: ReadonlyMap<MoveId, number>;
  readonly mappings: readonly AuthoredClipMapping[];
  readonly sources: readonly unknown[];
  readonly available: boolean;
}

interface DirectBinding {
  readonly move: MoveId;
  readonly candidates: readonly string[];
}

const DIRECT_BINDINGS: readonly DirectBinding[] = [
  { move: 'idle', candidates: ['Idle_Loop'] },
  { move: 'combat-idle', candidates: ['Idle_Shield_Loop', 'Sword_Idle', 'Sword_Idle_Loop'] },
  { move: 'walk', candidates: ['Walk_Loop'] },
  { move: 'run', candidates: ['Sprint_Loop', 'Jog_Fwd_Loop'] },
  { move: 'surface-swim', candidates: ['Swim_Fwd_Loop'] },
  { move: 'tread-water', candidates: ['Swim_Idle_Loop'] },
];

const normalizeName = (name: string) => name.split('|').at(-1)?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? '';

function findClip(clips: readonly THREE.AnimationClip[], candidates: readonly string[]): THREE.AnimationClip | undefined {
  const byName = new Map(clips.map((clip) => [normalizeName(clip.name), clip]));
  return candidates.map(normalizeName).map((name) => byName.get(name)).find(Boolean);
}

function namedClone(source: THREE.AnimationClip, move: MoveId): THREE.AnimationClip {
  const clip = source.clone();
  clip.name = move;
  clip.resetDuration();
  return clip;
}

function joinClips(move: MoveId, segments: readonly THREE.AnimationClip[]): THREE.AnimationClip {
  const trackNames = new Set(segments.flatMap((clip) => clip.tracks.map((track) => track.name)));
  const tracks: THREE.KeyframeTrack[] = [];
  for (const trackName of trackNames) {
    const sourceTracks = segments.map((clip) => clip.tracks.find((track) => track.name === trackName));
    const prototype = sourceTracks.find(Boolean);
    if (!prototype) continue;
    const valueSize = prototype.getValueSize();
    const times: number[] = [];
    const values: number[] = [];
    let offset = 0;
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex]!;
      const track = sourceTracks[segmentIndex];
      if (track) {
        for (let key = 0; key < track.times.length; key += 1) {
          if (segmentIndex > 0 && key === 0 && track.times[key] === 0) continue;
          times.push(offset + track.times[key]!);
          for (let value = 0; value < valueSize; value += 1) values.push(track.values[key * valueSize + value]!);
        }
      }
      offset += segment.duration;
    }
    const joined = prototype.clone();
    joined.times = new Float32Array(times);
    joined.values = new Float32Array(values);
    tracks.push(joined);
  }
  const duration = segments.reduce((sum, clip) => sum + clip.duration, 0);
  return new THREE.AnimationClip(move, duration, tracks).optimize();
}

function addMapping(
  clips: Map<MoveId, THREE.AnimationClip>,
  mappings: AuthoredClipMapping[],
  move: MoveId,
  clip: THREE.AnimationClip,
  sourceClips: readonly string[],
  eventPhases?: Readonly<Partial<Record<MoveEventType, number>>>,
): void {
  clips.set(move, clip);
  mappings.push({ move, sourceClips, duration: clip.duration, ...(eventPhases ? { eventPhases } : {}) });
}

export function createAuthoredAnimationLibrary(bank: SerializedAnimationBank): AuthoredAnimationLibrary {
  if (bank.version !== 1 || !Array.isArray(bank.clips)) throw new Error('Unsupported authored animation bank.');
  const parsed = bank.clips.map((json) => THREE.AnimationClip.parse(json));
  const clips = new Map<MoveId, THREE.AnimationClip>();
  const mappings: AuthoredClipMapping[] = [];

  for (const binding of DIRECT_BINDINGS) {
    const source = findClip(parsed, binding.candidates);
    if (!source) continue;
    addMapping(clips, mappings, binding.move, namedClone(source, binding.move), [source.name]);
  }

  // UAL2 publishes its one-handed strikes and matching recovery clips
  // separately. Joining each authored pair preserves the native attack and
  // settle instead of stretching a short strike or truncating its recovery.
  const lightStrike = findClip(parsed, ['Sword_Regular_B', 'Regular_B']);
  const lightRecovery = findClip(parsed, ['Sword_Regular_B_Rec', 'Regular_B_Rec']);
  if (lightStrike && lightRecovery) {
    const clip = joinClips('light-attack', [lightStrike, lightRecovery]);
    addMapping(clips, mappings, 'light-attack', clip, [lightStrike.name, lightRecovery.name], {
      'swing-trail': 0.1,
      'swing-impact': 0.16,
    });
  }

  const heavyStrike = findClip(parsed, ['Sword_Dash']);
  if (heavyStrike) {
    addMapping(clips, mappings, 'heavy-attack', namedClone(heavyStrike, 'heavy-attack'), [heavyStrike.name], {
      'swing-trail': 0.15,
      'swing-impact': 0.2,
    });
  }

  const eventPhases = new Map<MoveId, Readonly<Partial<Record<MoveEventType, number>>>>();
  for (const mapping of mappings) if (mapping.eventPhases) eventPhases.set(mapping.move, mapping.eventPhases);
  // Speeds measured from the planted sole's backward travel in the retargeted
  // loops keep the stage translation synchronized with the authored stride.
  const travelSpeeds = new Map<MoveId, number>();
  if (clips.has('walk')) {
    for (const move of ['walk-start', 'walk', 'walk-stop'] as const) travelSpeeds.set(move, 0.89);
  }
  if (clips.has('run')) {
    for (const move of ['run-start', 'run', 'run-stop'] as const) travelSpeeds.set(move, 7.98);
  }
  return {
    clips,
    authoredMoves: new Set(clips.keys()),
    eventPhases,
    travelSpeeds,
    mappings,
    sources: bank.sources ?? [],
    available: clips.size > 0,
  };
}

export async function loadAuthoredAnimationLibrary(
  url = '/animations/quaternius-retargeted.json',
): Promise<AuthoredAnimationLibrary> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Animation bank request failed with ${response.status}.`);
    return createAuthoredAnimationLibrary(await response.json() as SerializedAnimationBank);
  } catch (error) {
    console.warn('Using procedural animation fallback.', error);
    return {
      clips: new Map(), authoredMoves: new Set(), eventPhases: new Map(), mappings: [], sources: [], available: false,
      travelSpeeds: new Map(),
    };
  }
}

export function mergeAnimationLibraries(
  procedural: ReadonlyMap<MoveId, THREE.AnimationClip>,
  authored: ReadonlyMap<MoveId, THREE.AnimationClip>,
): ReadonlyMap<MoveId, THREE.AnimationClip> {
  const merged = new Map(procedural);
  for (const [move, clip] of authored) merged.set(move, clip);
  const sourceIdle = authored.get('idle'), relaxedIdle = procedural.get('idle');
  if (sourceIdle && relaxedIdle) merged.set('idle', correctRelaxedIdlePosture(sourceIdle, relaxedIdle));
  return merged;
}
