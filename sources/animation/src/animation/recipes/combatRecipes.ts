import type { ClipRecipe } from './types';
import { rotation } from './types';
import { SPELLCASTING_RECIPE } from './spellcastingRecipe';
import { WHIRLWIND_RECIPE } from './whirlwindRecipe';

export const COMBAT_RECIPES: readonly ClipRecipe[] = [
  {
    id: 'light-attack',
    basePose: 'combat',
    frames: [
      { time: 0 },
      {
        time: 0.1,
        rotations: {
          Hips: rotation(1, -14, -3), Spine: rotation(3, -7, 1), Spine1: rotation(5, -10, -2),
          Spine2: rotation(0, -13, -1), Head: rotation(-2, 6, 0),
          LeftShoulder: rotation(-2, -4, -4), LeftArm: rotation(-29, -11, 30),
          LeftForeArm: rotation(0, -10, -78), LeftHand: rotation(5, 7, -4),
          RightShoulder: rotation(-2, 4, 4), RightArm: rotation(-31, 8, -38),
          RightForeArm: rotation(0, 12, 88), RightHand: rotation(-8, -12, 7),
          LeftUpLeg: rotation(18, -3, 3), RightUpLeg: rotation(30, 5, -4),
          LeftLeg: rotation(-34), RightLeg: rotation(-56), LeftFoot: rotation(6), RightFoot: rotation(10),
        },
        positions: { Hips: [-0.04, -0.11, -0.045] },
      },
      {
        time: 0.22,
        rotations: {
          Hips: rotation(2, -23, -4), Spine: rotation(5, -13, 2), Spine1: rotation(7, -18, -3),
          Spine2: rotation(1, -22, -2), Head: rotation(-3, 9, 0),
          LeftShoulder: rotation(-3, -5, -4), LeftArm: rotation(-30, -12, 31),
          LeftForeArm: rotation(0, -11, -80), LeftHand: rotation(5, 8, -4),
          RightShoulder: rotation(-3, 5, 4), RightArm: rotation(-43, 8, -47),
          RightForeArm: rotation(0, 14, 101), RightHand: rotation(-11, -15, 9),
          LeftUpLeg: rotation(19, -3, 3), RightUpLeg: rotation(34, 6, -4),
          LeftLeg: rotation(-37), RightLeg: rotation(-64), LeftFoot: rotation(7), RightFoot: rotation(11),
        },
        positions: { Hips: [-0.052, -0.128, -0.055] },
      },
      {
        time: 0.3,
        rotations: {
          Hips: rotation(1, -2, -1), Spine: rotation(4, -12, 1), Spine1: rotation(5, -15, -2),
          Spine2: rotation(0, -16, -1), Head: rotation(-2, 7, 0),
          LeftArm: rotation(-29, -11, 30), LeftForeArm: rotation(0, -11, -79),
          RightArm: rotation(-30, 6, -34), RightForeArm: rotation(0, 12, 86),
          RightHand: rotation(-7, -10, 6), LeftUpLeg: rotation(21), RightUpLeg: rotation(29),
          LeftLeg: rotation(-40), RightLeg: rotation(-55), LeftFoot: rotation(7), RightFoot: rotation(9),
        },
        positions: { Hips: [-0.024, -0.104, -0.025] },
      },
      {
        time: 0.4,
        rotations: {
          Hips: rotation(0, 25, 2), Spine: rotation(-1, 10, -1), Spine1: rotation(-2, 15, 1),
          Spine2: rotation(-2, 20, 0), Head: rotation(-1, -7, 0),
          LeftArm: rotation(-27, -10, 29), LeftForeArm: rotation(0, -10, -76),
          RightArm: rotation(7, 0, 30), RightForeArm: rotation(0, 8, 42), RightHand: rotation(1, 0, 0),
          LeftUpLeg: rotation(27), RightUpLeg: rotation(17), LeftLeg: rotation(-50), RightLeg: rotation(-34),
        },
        positions: { Hips: [0.016, -0.068, 0.04] },
      },
      {
        time: 0.45,
        rotations: {
          Hips: rotation(-1, 36, 3), Spine: rotation(-3, 22, -2), Spine1: rotation(-4, 29, 2),
          Spine2: rotation(-3, 35, 1), Head: rotation(0, -12, 0),
          LeftArm: rotation(-25, -9, 28), LeftForeArm: rotation(0, -10, -74),
          RightArm: rotation(22, -3, 58), RightForeArm: rotation(0, 4, 12), RightHand: rotation(6, 6, -4),
          LeftUpLeg: rotation(31), RightUpLeg: rotation(12), LeftLeg: rotation(-57), RightLeg: rotation(-25),
          LeftFoot: rotation(10), RightFoot: rotation(3),
        },
        positions: { Hips: [0.042, -0.052, 0.07] },
      },
      {
        time: 0.57,
        rotations: {
          Hips: rotation(-1, 25, 2), Spine: rotation(-2, 18, -1), Spine1: rotation(-3, 24, 1),
          Spine2: rotation(-2, 29, 1), Head: rotation(0, -9, 0),
          LeftArm: rotation(-26, -10, 29), LeftForeArm: rotation(0, -10, -76),
          RightArm: rotation(15, -1, 47), RightForeArm: rotation(0, 5, 20), RightHand: rotation(4, 3, -2),
          LeftUpLeg: rotation(27), RightUpLeg: rotation(15), LeftLeg: rotation(-50), RightLeg: rotation(-30),
        },
        positions: { Hips: [0.025, -0.065, 0.045] },
      },
      { time: 0.72 },
    ],
  },
  {
    id: 'heavy-attack',
    basePose: 'combat',
    frames: [
      { time: 0 },
      {
        time: 0.16,
        rotations: {
          Hips: rotation(2, -13, -3), Spine: rotation(4, -7, 1), Spine1: rotation(7, -11, -2),
          Spine2: rotation(2, -15, -1), LeftUpLeg: rotation(22), RightUpLeg: rotation(34),
          LeftLeg: rotation(-43), RightLeg: rotation(-61), LeftFoot: rotation(7), RightFoot: rotation(10),
          RightShoulder: rotation(-3, 4, 5), RightArm: rotation(-38, 8, -34),
          RightForeArm: rotation(0, 12, 83), RightHand: rotation(-11, -12, 8),
          LeftArm: rotation(-30, -12, 31), LeftForeArm: rotation(0, -11, -80), Head: rotation(-2, 7, 0),
        },
        positions: { Hips: [0.048, -0.125, -0.05] },
      },
      {
        time: 0.36,
        rotations: {
          Hips: rotation(4, -29, -4), Spine: rotation(7, -17, 2), Spine1: rotation(10, -25, -3),
          Spine2: rotation(4, -32, -2), LeftUpLeg: rotation(25), RightUpLeg: rotation(41),
          LeftLeg: rotation(-48), RightLeg: rotation(-72), LeftFoot: rotation(8), RightFoot: rotation(12),
          RightArm: rotation(-54, 9, -47), RightForeArm: rotation(0, 14, 101), RightHand: rotation(-14, -16, 10),
          LeftArm: rotation(-32, -13, 32), LeftForeArm: rotation(0, -11, -82), Head: rotation(-4, 12, 0),
        },
        positions: { Hips: [0.062, -0.155, -0.065] },
      },
      {
        time: 0.52,
        rotations: {
          Hips: rotation(2, -8, -1), Spine: rotation(5, -16, 1), Spine1: rotation(7, -21, -2),
          Spine2: rotation(2, -25, -1), LeftUpLeg: rotation(25), RightUpLeg: rotation(36),
          LeftLeg: rotation(-42), RightLeg: rotation(-58), RightArm: rotation(-36, 5, -26),
          RightForeArm: rotation(0, 12, 82), LeftArm: rotation(-31, -12, 32),
          LeftForeArm: rotation(0, -11, -81), Head: rotation(-2, 10, 0),
        },
        positions: { Hips: [0.036, -0.105, -0.04] },
      },
      {
        time: 0.65,
        rotations: {
          Hips: rotation(0, 17, 1), Spine: rotation(1, -5, 0), Spine1: rotation(0, -3, 0),
          Spine2: rotation(-2, 0, 0), LeftUpLeg: rotation(31), RightUpLeg: rotation(22),
          LeftLeg: rotation(-58), RightLeg: rotation(-42), LeftFoot: rotation(10), RightFoot: rotation(7),
          RightArm: rotation(-12, 2, 5), RightForeArm: rotation(0, 10, 58), RightHand: rotation(0, -2, 1),
          LeftArm: rotation(-29, -11, 31), LeftForeArm: rotation(0, -11, -79), Head: rotation(-1, 1, 0),
        },
        positions: { Hips: [-0.005, -0.075, 0.025] },
      },
      {
        time: 0.78,
        rotations: {
          Hips: rotation(-2, 39, 3), Spine: rotation(-4, 20, -2), Spine1: rotation(-6, 27, 2),
          Spine2: rotation(-5, 34, 1), LeftUpLeg: rotation(34), RightUpLeg: rotation(12),
          LeftLeg: rotation(-61), RightLeg: rotation(-25), LeftFoot: rotation(11), RightFoot: rotation(3),
          RightArm: rotation(20, -3, 52), RightForeArm: rotation(0, 5, 15), RightHand: rotation(7, 6, -4),
          LeftArm: rotation(-26, -9, 29), LeftForeArm: rotation(0, -10, -75), Head: rotation(1, -11, 0),
        },
        positions: { Hips: [0.04, -0.055, 0.075] },
      },
      {
        time: 0.97,
        rotations: {
          Hips: rotation(-1, 28, 2), Spine: rotation(-3, 22, -1), Spine1: rotation(-4, 29, 1),
          Spine2: rotation(-3, 35, 1), LeftUpLeg: rotation(31), RightUpLeg: rotation(14),
          LeftLeg: rotation(-58), RightLeg: rotation(-29), RightArm: rotation(17, -2, 47),
          RightForeArm: rotation(0, 5, 20), LeftArm: rotation(-27, -10, 30),
          LeftForeArm: rotation(0, -10, -77), Head: rotation(1, -10, 0),
        },
        positions: { Hips: [0.025, -0.072, 0.05] },
      },
      {
        time: 1.17,
        rotations: {
          Hips: rotation(0, 7, -2), Spine: rotation(1, 5, 1), Spine1: rotation(3, 8, -1),
          LeftUpLeg: rotation(16), RightUpLeg: rotation(15), LeftLeg: rotation(-32), RightLeg: rotation(-31),
          RightArm: rotation(-9, 5, -25), RightForeArm: rotation(0, 10, 58),
          LeftArm: rotation(-28, -10, 29), LeftForeArm: rotation(0, -10, -77), Head: rotation(-1, -4, 0),
        },
        positions: { Hips: [-0.028, -0.075, -0.01] },
      },
      { time: 1.34 },
    ],
  },
  SPELLCASTING_RECIPE,
  WHIRLWIND_RECIPE,
  {
    id: 'hit',
    basePose: 'combat',
    frames: [
      { time: 0 },
      {
        time: 0.065,
        rotations: {
          Hips: rotation(8, -6, -5), Spine: rotation(13, 2, -8), Spine1: rotation(19, 5, -13),
          Spine2: rotation(15, 4, -10), Head: rotation(-14, -4, 7), LeftUpLeg: rotation(8),
          RightUpLeg: rotation(23), LeftLeg: rotation(-19), RightLeg: rotation(-43),
          LeftArm: rotation(-6, -4, 19), RightArm: rotation(-2, 7, -27),
          LeftForeArm: rotation(0, -42, 5), RightForeArm: rotation(0, 46, -6),
        },
        positions: { Hips: [-0.035, -0.07, 0.06] },
      },
      {
        time: 0.18,
        rotations: {
          Hips: rotation(-3, 4, 2), Spine: rotation(-6, -2, 4), Spine1: rotation(-9, -3, 6),
          Spine2: rotation(-7, -2, 4), Head: rotation(6, 3, -3), LeftUpLeg: rotation(17),
          RightUpLeg: rotation(9), LeftLeg: rotation(-32), RightLeg: rotation(-20),
          LeftArm: rotation(-20, -6, 14), RightArm: rotation(-14, 8, -20),
        },
        positions: { Hips: [0.018, -0.052, -0.016] },
      },
      {
        time: 0.34,
        rotations: {
          Hips: rotation(1, -2, -2), Spine: rotation(2, 1, -1), Spine1: rotation(4, 1, -3),
          Head: rotation(-3, 0, 1), LeftUpLeg: rotation(11), RightUpLeg: rotation(14),
          LeftLeg: rotation(-23), RightLeg: rotation(-29),
        },
        positions: { Hips: [-0.01, -0.06, 0.012] },
      },
      { time: 0.5 },
    ],
  },
];
