import type { ClipRecipe } from './types';
import { rotation } from './types';

export const SPELLCASTING_RECIPE: ClipRecipe = {
  id: 'cast',
  basePose: 'combat',
  frames: [
    { time: 0 },
    {
      time: 0.12,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(2, 2, 1), Spine1: rotation(3, 3, -1),
        Spine2: rotation(-1, 4, 1), Head: rotation(-1, -3, 0),
        LeftUpLeg: rotation(14, -3, 3), RightUpLeg: rotation(20, 4, -3),
        LeftLeg: rotation(-28), RightLeg: rotation(-40), LeftFoot: rotation(6), RightFoot: rotation(8),
        LeftArm: rotation(-20, -6, 20), RightArm: rotation(-20, 7, -21),
        LeftForeArm: rotation(0, -9, -68), RightForeArm: rotation(0, 9, 72),
      },
      positions: { Hips: [-0.025, -0.074, -0.028] },
    },
    {
      time: 0.24,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(3, 2, 1), Spine1: rotation(4, 3, -1),
        Spine2: rotation(-1, 4, 1), Head: rotation(-1, -3, 0),
        LeftUpLeg: rotation(16, -3, 3), RightUpLeg: rotation(22, 4, -3),
        LeftLeg: rotation(-31), RightLeg: rotation(-43), LeftFoot: rotation(7), RightFoot: rotation(9),
        LeftShoulder: rotation(0, -3, -3), RightShoulder: rotation(0, 3, 3),
        LeftArm: rotation(-18, -7, 24), RightArm: rotation(-18, 8, -25),
        LeftForeArm: rotation(0, -10, -78), RightForeArm: rotation(0, 10, 82),
        LeftHand: rotation(4, 8, -7), RightHand: rotation(-4, -8, 7),
      },
      positions: { Hips: [-0.025, -0.08, -0.028] },
    },
    {
      time: 0.42,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(3, 1, 1), Spine1: rotation(4, 2, -1),
        Spine2: rotation(-1, 3, 1), Head: rotation(-1, -2, 0),
        LeftUpLeg: rotation(16), RightUpLeg: rotation(22), LeftLeg: rotation(-31), RightLeg: rotation(-43),
        LeftArm: rotation(-12, -8, 22), RightArm: rotation(-24, 8, -24),
        LeftForeArm: rotation(0, -12, -60), RightForeArm: rotation(0, 12, 68),
        LeftHand: rotation(7, 12, -9), RightHand: rotation(-6, -10, 8),
      },
      positions: { Hips: [-0.025, -0.08, -0.028] },
    },
    {
      time: 0.58,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(3, 1, 1), Spine1: rotation(4, 2, -1),
        Spine2: rotation(-1, 3, 1), Head: rotation(-1, -2, 0),
        LeftUpLeg: rotation(16), RightUpLeg: rotation(22), LeftLeg: rotation(-31), RightLeg: rotation(-43),
        LeftArm: rotation(-24, -8, 22), RightArm: rotation(-12, 8, -24),
        LeftForeArm: rotation(0, -12, -68), RightForeArm: rotation(0, 12, 60),
        LeftHand: rotation(6, 10, -8), RightHand: rotation(-7, -12, 9),
      },
      positions: { Hips: [-0.025, -0.08, -0.028] },
    },
    {
      time: 0.72,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(2, 1, 1), Spine1: rotation(3, 2, -1),
        Spine2: rotation(-1, 2, 0), Head: rotation(-1, -1, 0),
        LeftUpLeg: rotation(15), RightUpLeg: rotation(21), LeftLeg: rotation(-29), RightLeg: rotation(-41),
        LeftArm: rotation(-16, -5, 18), RightArm: rotation(-16, 6, -19),
        LeftForeArm: rotation(0, -8, -58), RightForeArm: rotation(0, 8, 61),
      },
      positions: { Hips: [-0.025, -0.076, -0.028] },
    },
    {
      time: 0.78,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(1, 1, 0), Spine1: rotation(2, 1, 0),
        Spine2: rotation(-1, 2, 0), Head: rotation(0, -1, 0),
        LeftUpLeg: rotation(13), RightUpLeg: rotation(19), LeftLeg: rotation(-26), RightLeg: rotation(-38),
        LeftArm: rotation(0, -3, 12), RightArm: rotation(0, 3, -13),
        LeftForeArm: rotation(0, -5, -35), RightForeArm: rotation(0, 5, 38),
        LeftHand: rotation(2, 4, -3), RightHand: rotation(-2, -4, 3),
      },
      positions: { Hips: [-0.025, -0.07, -0.028] },
    },
    {
      time: 0.92,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(0, 1, 0), Spine1: rotation(1, 1, 0),
        Spine2: rotation(0, 1, 0), Head: rotation(0),
        LeftUpLeg: rotation(12), RightUpLeg: rotation(18), LeftLeg: rotation(-24), RightLeg: rotation(-36),
        LeftArm: rotation(12, -2, 8), RightArm: rotation(12, 2, -9),
        LeftForeArm: rotation(0, -3, -16), RightForeArm: rotation(0, 3, 18),
        LeftHand: rotation(-2, -2, 2), RightHand: rotation(2, 2, -2),
      },
      positions: { Hips: [-0.025, -0.065, -0.028] },
    },
    {
      time: 1.08,
      rotations: {
        Hips: rotation(0, -5, -2.4), Spine: rotation(2, 2, 1), Spine1: rotation(3, 3, -1),
        LeftUpLeg: rotation(13), RightUpLeg: rotation(19), LeftLeg: rotation(-26), RightLeg: rotation(-38),
        LeftArm: rotation(-13, -5, 15), RightArm: rotation(-13, 6, -16),
        LeftForeArm: rotation(0, -7, -48), RightForeArm: rotation(0, 7, 52),
      },
      positions: { Hips: [-0.025, -0.07, -0.028] },
    },
    { time: 1.25 },
  ],
};
