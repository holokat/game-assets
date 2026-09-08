import type { ClipRecipe } from './types';
import { rotation } from './types';
import { compactRunArms } from './gaitMechanics';
import { STANDING_JUMP_RECIPES } from './standingJumpRecipes';

export const AIRBORNE_RECIPES: readonly ClipRecipe[] = [
  ...STANDING_JUMP_RECIPES,
  {
    id: 'running-leap',
    basePose: 'relaxed',
    frames: [
      {
        time: 0,
        rotations: {
          Hips: rotation(5, -4, -1.5), Spine: rotation(-3, 2, 0.7), Spine1: rotation(10, 3, -1),
          Spine2: rotation(-1, 2, 0.4), Head: rotation(-2, 1, 0),
          LeftUpLeg: rotation(38), RightUpLeg: rotation(-31), LeftLeg: rotation(-15), RightLeg: rotation(-55),
          LeftFoot: rotation(-8), RightFoot: rotation(15), ...compactRunArms(26),
        },
        positions: { Hips: [0.008, 0.004, -0.025] },
      },
      {
        time: 0.16,
        rotations: {
          Hips: rotation(9, 2, 1.2), Spine: rotation(-2, -1, -0.4), Spine1: rotation(13, -2, 0.8),
          Spine2: rotation(-1, -2, -0.2), Head: rotation(-3, 0, 0),
          LeftUpLeg: rotation(-24), RightUpLeg: rotation(34), LeftLeg: rotation(-52), RightLeg: rotation(-18),
          LeftFoot: rotation(14), RightFoot: rotation(-9), ...compactRunArms(-30, 58),
        },
        positions: { Hips: [-0.006, -0.035, -0.045] },
      },
      {
        time: 0.235,
        rotations: {
          Hips: rotation(11, 0, 0), Spine: rotation(-4, 0, 0), Spine1: rotation(14, 0, 0),
          Spine2: rotation(-1.5, 0, 0), Head: rotation(-3.5),
          LeftUpLeg: rotation(15), RightUpLeg: rotation(23), LeftLeg: rotation(-66), RightLeg: rotation(-12),
          LeftFoot: rotation(12), RightFoot: rotation(-14), RightToeBase: rotation(6), ...compactRunArms(4, 52),
        },
        positions: { Hips: [0, 0, -0.05] },
      },
      {
        time: 0.31,
        rotations: {
          Hips: rotation(12, -2, -1.1), Spine: rotation(-5, 1, 0.5), Spine1: rotation(15, 2, -0.8),
          Spine2: rotation(-2, 1, 0.4), Head: rotation(-4, 1, 0),
          LeftUpLeg: rotation(54), RightUpLeg: rotation(12.5), LeftLeg: rotation(-72), RightLeg: rotation(-8),
          LeftFoot: rotation(10), RightFoot: rotation(-18), RightToeBase: rotation(10), ...compactRunArms(42, 42),
        },
        positions: { Hips: [0.006, 0.015, -0.05] },
      },
      {
        time: 0.43,
        rotations: {
          Hips: rotation(8, -1, -0.7), Spine: rotation(-7, 1, 0.4), Spine1: rotation(12, 2, -0.6),
          Spine2: rotation(-3, 1, 0.3), Head: rotation(-4, 1, 0),
          LeftUpLeg: rotation(68), RightUpLeg: rotation(-27), LeftLeg: rotation(-86), RightLeg: rotation(-10),
          LeftFoot: rotation(5), RightFoot: rotation(-20), RightToeBase: rotation(14), ...compactRunArms(52, 34),
        },
        positions: { Hips: [0.006, 0.12, -0.035] },
      },
      {
        time: 0.61,
        rotations: {
          Hips: rotation(5, -1, -0.5), Spine: rotation(-6, 1, 0.3), Spine1: rotation(10, 1, -0.4),
          Spine2: rotation(-3, 1, 0.2), Head: rotation(-3, 1, 0),
          LeftUpLeg: rotation(68), RightUpLeg: rotation(-34), LeftLeg: rotation(-70), RightLeg: rotation(-15),
          LeftFoot: rotation(1), RightFoot: rotation(-16), ...compactRunArms(58, 28),
        },
        positions: { Hips: [0.004, 0.29, -0.015] },
      },
      {
        time: 0.78,
        rotations: {
          Hips: rotation(3, 0, -0.2), Spine: rotation(-4, 0, 0.2), Spine1: rotation(8, 0, -0.3),
          Spine2: rotation(-2, 0, 0.1), Head: rotation(-2, 0, 0),
          LeftUpLeg: rotation(48), RightUpLeg: rotation(-44), LeftLeg: rotation(-14), RightLeg: rotation(-12),
          LeftFoot: rotation(-8), RightFoot: rotation(-12), ...compactRunArms(60, 24),
        },
        positions: { Hips: [0, 0.36, 0.005] },
      },
      {
        time: 0.95,
        rotations: {
          Hips: rotation(6, 0, 0.1), Spine: rotation(-2, 0, 0.1), Spine1: rotation(10, 0, -0.2),
          Spine2: rotation(-1, 0, 0.1), Head: rotation(-1, 0, 0),
          LeftUpLeg: rotation(35), RightUpLeg: rotation(-28), LeftLeg: rotation(-8), RightLeg: rotation(-26),
          LeftFoot: rotation(-12), RightFoot: rotation(-4), ...compactRunArms(52, 30),
        },
        positions: { Hips: [-0.004, 0.25, 0.018] },
      },
      {
        time: 1.09,
        rotations: {
          Hips: rotation(11, 1, 0.7), Spine: rotation(2, -1, -0.3), Spine1: rotation(14, -1, 0.5),
          Spine2: rotation(2, -1, -0.2), Head: rotation(-4, 0, 0),
          LeftUpLeg: rotation(24), RightUpLeg: rotation(-15), LeftLeg: rotation(-16), RightLeg: rotation(-40),
          LeftFoot: rotation(8), RightFoot: rotation(8), ...compactRunArms(38, 42),
        },
        positions: { Hips: [-0.006, 0.07, 0.025] },
      },
      {
        time: 1.21,
        rotations: {
          Hips: rotation(18, 1, 0.8), Spine: rotation(8, -1, -0.4), Spine1: rotation(19, -1, 0.6),
          Spine2: rotation(6, -1, -0.3), Head: rotation(-7, 0, 0),
          LeftUpLeg: rotation(48), RightUpLeg: rotation(12), LeftLeg: rotation(-78), RightLeg: rotation(-52),
          LeftFoot: rotation(15), RightFoot: rotation(12), ...compactRunArms(7, 62),
        },
        positions: { Hips: [-0.008, -0.12, -0.02] },
      },
      {
        time: 1.3,
        rotations: {
          Hips: rotation(12, 2.3, 1.1), Spine: rotation(3.3, -1.4, -0.5), Spine1: rotation(15, -1.9, 0.8),
          Spine2: rotation(3, -1.4, 0), Head: rotation(-5, -0.4, 0),
          LeftUpLeg: rotation(14), RightUpLeg: rotation(23), LeftLeg: rotation(-68), RightLeg: rotation(-36),
          LeftFoot: rotation(15), RightFoot: rotation(3), RightToeBase: rotation(8), ...compactRunArms(-7, 59),
        },
        positions: { Hips: [-0.008, -0.03, -0.022] },
      },
      {
        time: 1.42,
        rotations: {
          Hips: rotation(4, 4, 1.5), Spine: rotation(-3, -2, -0.7), Spine1: rotation(10, -3, 1),
          Spine2: rotation(-1, -2, 0.4), Head: rotation(-2, -1, 0),
          LeftUpLeg: rotation(-31), RightUpLeg: rotation(38), LeftLeg: rotation(-55), RightLeg: rotation(-15),
          LeftFoot: rotation(15), RightFoot: rotation(-8), ...compactRunArms(-26),
        },
        positions: { Hips: [-0.008, 0.004, -0.025] },
      },
    ],
  },
  {
    id: 'airborne',
    basePose: 'airborne',
    frames: [
      { time: 0 },
      {
        time: 0.2,
        rotations: {
          Hips: rotation(-1, 0, -1.4), Spine1: rotation(1.5, 0.8, -0.8), Head: rotation(0, 2, -0.4),
          LeftUpLeg: rotation(27, -1, 2.5), RightUpLeg: rotation(24, 2, -1.8),
          LeftLeg: rotation(-51), RightLeg: rotation(-47), LeftFoot: rotation(-5), RightFoot: rotation(0),
          LeftArm: rotation(-12, 0, 13), RightArm: rotation(-11, 0, -9),
        },
        positions: { Hips: [-0.008, 0.345, 0.015] },
      },
      {
        time: 0.43,
        rotations: {
          Hips: rotation(0, -1, -0.6), Spine: rotation(0, 0, 0.2), Spine1: rotation(1, -0.5, -0.2),
          Head: rotation(2, -1, 0.2), LeftUpLeg: rotation(18, -1, 1), RightUpLeg: rotation(21, 1, -1),
          LeftLeg: rotation(-34), RightLeg: rotation(-40), LeftFoot: rotation(-1), RightFoot: rotation(1),
          LeftArm: rotation(-7, 0, 10), RightArm: rotation(-9, 0, -8),
        },
        positions: { Hips: [0.004, 0.36, 0.018] },
      },
      {
        time: 0.65,
        rotations: {
          Hips: rotation(1, 1, 0.8), Spine: rotation(2, -0.5, -0.4), Spine1: rotation(4, 0, 0.5),
          Head: rotation(-2, 0, 0), LeftUpLeg: rotation(12, -1, 1), RightUpLeg: rotation(15, 1, -1),
          LeftLeg: rotation(-24), RightLeg: rotation(-29), LeftFoot: rotation(5), RightFoot: rotation(6),
          LeftArm: rotation(2, 0, 12), RightArm: rotation(0, 0, -11),
        },
        positions: { Hips: [0, 0.32, 0.023] },
      },
      { time: 0.86 },
    ],
  },
  {
    id: 'land-hard',
    basePose: 'relaxed',
    frames: [
      {
        time: 0,
        rotations: {
          Hips: rotation(2, 0, 0), Spine: rotation(3, 0, 0), Spine1: rotation(5, 0, 0),
          LeftUpLeg: rotation(15), RightUpLeg: rotation(17), LeftLeg: rotation(-28), RightLeg: rotation(-33),
          LeftFoot: rotation(8), RightFoot: rotation(8), LeftArm: rotation(5, 0, 16), RightArm: rotation(2, 0, -14),
        },
        positions: { Hips: [0, 0.18, 0.03] },
      },
      {
        time: 0.09,
        rotations: {
          Hips: rotation(14, 0, -2), Spine: rotation(11, 0, 1.5), Spine1: rotation(18, 0, -2),
          Spine2: rotation(11, 0, -1), Head: rotation(-10), LeftUpLeg: rotation(44), RightUpLeg: rotation(47),
          LeftLeg: rotation(-89), RightLeg: rotation(-94), LeftFoot: rotation(13), RightFoot: rotation(13),
          LeftArm: rotation(27, 0, 23), RightArm: rotation(23, 0, -21),
        },
        positions: { Hips: [-0.012, -0.23, 0.06] },
      },
      {
        time: 0.24,
        rotations: {
          Hips: rotation(10, 0, -2.5), Spine: rotation(16, 0, 2), Spine1: rotation(21, 0, -2.5),
          Spine2: rotation(15, 0, -1), Head: rotation(-15), LeftUpLeg: rotation(38), RightUpLeg: rotation(41),
          LeftLeg: rotation(-78), RightLeg: rotation(-83), LeftArm: rotation(19, 0, 19), RightArm: rotation(17, 0, -18),
        },
        positions: { Hips: [-0.018, -0.19, 0.052] },
      },
      {
        time: 0.45,
        rotations: {
          Hips: rotation(5, 1, -1.8), Spine: rotation(8, 0, 1), Spine1: rotation(11, 0, -1.3),
          Head: rotation(-5), LeftUpLeg: rotation(25), RightUpLeg: rotation(29), LeftLeg: rotation(-52),
          RightLeg: rotation(-59), LeftArm: rotation(9, 0, 12), RightArm: rotation(7, 0, -13),
        },
        positions: { Hips: [-0.014, -0.11, 0.025] },
      },
      { time: 0.7, rotations: { Hips: rotation(1, 1, -1.3), Spine1: rotation(4, 0, -0.8), LeftUpLeg: rotation(11), RightUpLeg: rotation(15), LeftLeg: rotation(-22), RightLeg: rotation(-29) }, positions: { Hips: [-0.011, -0.042, 0.008] } },
      { time: 0.92 },
    ],
  },
  {
    id: 'dodge',
    basePose: 'combat',
    frames: [
      { time: 0 },
      {
        time: 0.09,
        rotations: {
          Hips: rotation(3, -5, 7), Spine: rotation(4, 3, -4), Spine1: rotation(9, 5, -8),
          LeftUpLeg: rotation(28, -3, 8), RightUpLeg: rotation(15, 4, -5),
          LeftLeg: rotation(-55), RightLeg: rotation(-31), LeftFoot: rotation(7, 0, -5),
          LeftArm: rotation(-13, -5, 20), RightArm: rotation(-22, 8, -18), Head: rotation(-2, -5, 4),
        },
        positions: { Hips: [0.05, -0.12, -0.035] },
      },
      {
        time: 0.19,
        rotations: {
          Hips: rotation(-2, 6, -10), Spine: rotation(-2, -4, 6), Spine1: rotation(3, -7, 10),
          LeftUpLeg: rotation(9, -5, -8), RightUpLeg: rotation(31, 6, 11),
          LeftLeg: rotation(-20), RightLeg: rotation(-61), LeftFoot: rotation(-5, 0, 7), RightFoot: rotation(10, 0, -8),
          LeftArm: rotation(-24, -5, 13), RightArm: rotation(-13, 8, -27), Head: rotation(-3, 8, -5),
        },
        positions: { Hips: [-0.085, -0.07, 0.006] },
      },
      {
        time: 0.34,
        rotations: {
          Hips: rotation(1, 3, -4), Spine: rotation(2, -2, 2), Spine1: rotation(6, -3, 4),
          LeftUpLeg: rotation(13, -3, -1), RightUpLeg: rotation(22, 4, 5),
          LeftLeg: rotation(-27), RightLeg: rotation(-45), LeftArm: rotation(-19, -6, 17),
          RightArm: rotation(-18, 8, -23), Head: rotation(-2, 3, -2),
        },
        positions: { Hips: [-0.044, -0.085, 0] },
      },
      { time: 0.5, rotations: { Hips: rotation(0, -2, -2), Spine1: rotation(4, 2, -2), LeftUpLeg: rotation(12), RightUpLeg: rotation(18), LeftLeg: rotation(-24), RightLeg: rotation(-37) }, positions: { Hips: [-0.028, -0.066, -0.02] } },
      { time: 0.62 },
    ],
  },
];
