import { BASE_POSES } from './basePoses';
import { degrees, type ClipRecipe, type Vec3 } from './types';

/** Distribute gait recoil through the spine while keeping the gaze steady.
 * These are joint rotations, baked into the clip so seeking and blending retain
 * the same posture without moving the head independently of its skeleton.
 */
export function withGaitPosture(recipe: ClipRecipe): ClipRecipe {
  if (recipe.id !== 'walk' && recipe.id !== 'run') return recipe;
  const base = BASE_POSES[recipe.basePose ?? 'relaxed'];
  const running = recipe.id === 'run';
  const heights = recipe.frames.map((frame) => (frame.positions?.Hips ?? base.positions.Hips)![1]);
  const low = Math.min(...heights);
  const span = Math.max(...heights) - low;

  return {
    ...recipe,
    frames: recipe.frames.map((frame, index) => {
      const rotations = { ...frame.rotations };
      const pose = (name: string): Vec3 => rotations[name] ?? base.rotations[name] ?? [0, 0, 0];
      // Extend slightly in support, then absorb the rise with thoracic flexion.
      const lift = span > 0 ? (heights[index]! - low) / span : 0.5;
      const recoil = running ? degrees(-4 + 16 * lift) : 0;
      for (const [name, share] of [['Spine', 0.5], ['Spine1', 0.35], ['Spine2', 0.15]] as const) {
        const [x, y, z] = pose(name);
        rotations[name] = [x + recoil * share, y, z];
      }
      const chain = ['Hips', 'Spine', 'Spine1', 'Spine2'].map(pose);
      const pitch = chain.reduce((sum, angle) => sum + angle[0], 0);
      const roll = chain.reduce((sum, angle) => sum + angle[2], 0);
      const neck = pose('Neck');
      const head = pose('Head');
      const gazePitch = running ? degrees(3) : degrees(0.5);
      rotations.Neck = [(gazePitch - pitch) * 0.72, neck[1], -roll * 0.65];
      rotations.Head = [(gazePitch - pitch) * 0.28, head[1], -roll * 0.35];
      return { ...frame, rotations };
    }),
  };
}
