import type { ClipRecipe, PoseFrame } from './types';
import { STANDING_JUMP_RECIPES } from './standingJumpRecipes';

/**
 * The whole standing jump as one clip: crouch, drive, flight, and a landing the
 * knees absorb. Every pose here is already in the library. Playing jump-launch,
 * jump-air and land-soft back to back leaves the mixer to invent the two seams,
 * which is fine when the player is holding the controls and wrong when a remote
 * character has to be told "he jumped" once.
 *
 * The three parts run 0.46 + 0.66 + 0.72 = 1.84 s on their own. This arc is
 * 1.5 s, so the flight and the landing are compressed and the launch keeps its
 * native timing: the crouch and the extension are what sell the weight, and
 * they are the part a player watches.
 *
 * Two frames are dropped at the seams, both of them redundant. jump-air opens
 * on exactly the pose jump-launch closes on, so its first frame would be a
 * repeated time. jump-air closes on the same limb pose land-soft opens on, one
 * beat higher off the floor, so land-soft's contact frame replaces it and the
 * pelvis carries on falling through the seam instead of pausing on it.
 */

interface Segment {
  readonly id: 'jump-launch' | 'jump-air' | 'land-soft';
  readonly span: number;
  readonly dropFirst: boolean;
  readonly dropLast: boolean;
}

const SEGMENTS: readonly Segment[] = [
  { id: 'jump-launch', span: 0.46, dropFirst: false, dropLast: false },
  { id: 'jump-air', span: 0.42, dropFirst: true, dropLast: true },
  { id: 'land-soft', span: 0.62, dropFirst: false, dropLast: false },
];

export const JUMP_ARC_DURATION = SEGMENTS.reduce((total, segment) => total + segment.span, 0);

/** The soft landing's own contact event, moved onto the arc's timeline. */
export const JUMP_ARC_LAND_EVENT = 0.88 + 0.06 * (0.62 / 0.72);

function compose(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  let offset = 0;
  for (const segment of SEGMENTS) {
    const source = STANDING_JUMP_RECIPES.find((recipe) => recipe.id === segment.id);
    if (!source) throw new Error(`The jump arc needs the ${segment.id} recipe.`);
    const native = source.frames.at(-1)?.time ?? 0;
    if (native <= 0) throw new Error(`The ${segment.id} recipe has no duration to rescale.`);
    const scale = segment.span / native;
    const slice = source.frames.slice(segment.dropFirst ? 1 : 0, segment.dropLast ? -1 : undefined);
    for (const frame of slice) frames.push({ ...frame, time: offset + frame.time * scale });
    offset += segment.span;
  }
  // Rounding on three rescaled segments must not leave the clip a microsecond
  // short of the duration the catalog publishes.
  const last = frames.at(-1);
  if (!last) throw new Error('The jump arc composed no frames.');
  frames[frames.length - 1] = { ...last, time: JUMP_ARC_DURATION };
  for (let index = 1; index < frames.length; index += 1) {
    if (frames[index]!.time <= frames[index - 1]!.time) {
      throw new Error(`The jump arc has a stalled frame at ${frames[index]!.time}.`);
    }
  }
  return frames;
}

export const JUMP_ARC_RECIPE: ClipRecipe = {
  id: 'jump',
  basePose: 'relaxed',
  frames: compose(),
};
