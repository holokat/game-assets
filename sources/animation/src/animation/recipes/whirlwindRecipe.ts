import type { ClipRecipe, PoseFrame } from './types';
import { rotation } from './types';
import { WHIRLWIND_TIMING } from '../whirlwindMotion';

export const WHIRLWIND_DURATION = WHIRLWIND_TIMING.duration;

/** The pelvis leads the release; the sword arm opens as the free arm tucks in. */
function spinFrame(
  time: number,
  yaw: number,
  hipsYaw: number,
  chestYaw: number,
  depth: number,
  knees: readonly [number, number],
  extension: number,
  lean: number,
  side: number,
): PoseFrame {
  const [leftKnee, rightKnee] = knees;
  return {
    time,
    rotations: {
      Root: rotation(0, yaw, 0),
      Hips: rotation(2, hipsYaw, side * 2),
      Spine: rotation(lean * 0.3, chestYaw * 0.25, -side),
      Spine1: rotation(lean * 0.45, chestYaw * 0.4, side * 0.6),
      Spine2: rotation(lean * 0.25, chestYaw * 0.35, -side * 0.3),
      Head: rotation(-lean * 0.32, -chestYaw * 0.18, 0),
      LeftUpLeg: rotation(leftKnee * 0.46, -4, 4),
      RightUpLeg: rotation(rightKnee * 0.46, 4, -4),
      LeftLeg: rotation(-leftKnee),
      RightLeg: rotation(-rightKnee),
      LeftFoot: rotation(leftKnee * 0.18, 0, -2),
      RightFoot: rotation(rightKnee * 0.18, 0, 2),
      LeftShoulder: rotation(1, -3, -3),
      RightShoulder: rotation(-2, 4, 5),
      LeftArm: rotation(-20, -7, -38 + extension * 20),
      RightArm: rotation(5 + extension * 25, 7, 25 - extension * 17),
      LeftForeArm: rotation(0, -8, -76 - extension * 16),
      RightForeArm: rotation(0, 10, 78 - extension * 42),
      LeftHand: rotation(2, 4, -3),
      RightHand: rotation(-5, -7, 5),
    },
    positions: { Hips: [side * 0.015, -depth, -0.025] },
  };
}

const frames: readonly PoseFrame[] = [
  spinFrame(0, 0, -5, 9, 0.075, [32, 40], 0.15, 8, -1),
  // Compress first. The blade stays close while the hips load against the chest.
  spinFrame(0.065, 0, -24, 33, 0.17, [74, 80], 0, 17, -1),
  spinFrame(WHIRLWIND_TIMING.windupEnd, 0, -27, 36, 0.175, [77, 82], 0, 18, -1),
  // Uneven angular spacing concentrates speed through the cutting arc.
  spinFrame(0.15, 24, 16, -20, 0.155, [71, 76], 0.55, 13, 1),
  spinFrame(0.22, 100, 12, -17, 0.15, [75, 69], 1, 12, -0.5),
  spinFrame(0.30, 195, -7, 9, 0.15, [69, 75], 1, 12, 0.5),
  spinFrame(0.38, 290, 7, -9, 0.15, [75, 69], 1, 12, -0.5),
  spinFrame(0.46, 346, 13, -18, 0.16, [76, 72], 0.85, 14, -1),
  spinFrame(WHIRLWIND_TIMING.spinEnd, 360, 10, -15, 0.18, [80, 76], 0.65, 17, -1),
  // A brief planted beat makes the stop readable before the torso recovers.
  spinFrame(WHIRLWIND_TIMING.settleStart, 360, 7, -10, 0.17, [76, 71], 0.4, 14, -1),
  {
    time: WHIRLWIND_DURATION,
    rotations: {
      Root: rotation(0, 360, 0),
      Hips: rotation(0, -5, -2.4),
      Spine: rotation(2.5, 2, 1.2),
      Spine1: rotation(4, 4, -1.4),
      Spine2: rotation(-1, 5, 0.7),
      Head: rotation(0),
      LeftUpLeg: rotation(12, -3, 3),
      RightUpLeg: rotation(18, 4, -3),
      LeftLeg: rotation(-24),
      RightLeg: rotation(-36),
      LeftFoot: rotation(5),
      RightFoot: rotation(7),
      LeftShoulder: rotation(0, -2, -2.5),
      RightShoulder: rotation(0, 2, 2.5),
      LeftArm: rotation(-22, -7, 17),
      RightArm: rotation(-18, 9, -22),
      LeftForeArm: rotation(0, -8, -58),
      RightForeArm: rotation(0, 8, 64),
      LeftHand: rotation(3, 4, -2),
      RightHand: rotation(-2, -5, 2),
    },
    positions: { Hips: [-0.025, -0.065, -0.028] },
  },
];

export const WHIRLWIND_RECIPE: ClipRecipe = {
  id: 'whirlwind',
  basePose: 'combat',
  sampleRate: 120,
  frames,
};
