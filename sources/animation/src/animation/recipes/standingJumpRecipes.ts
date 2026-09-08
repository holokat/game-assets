import type { ClipRecipe } from './types';
import { rotation } from './types';

/** Both arms swing in the sagittal plane. Local Z is mirrored across this rig. */
function jumpArmSwing(elevation: number, elbowFlex: number) {
  return {
    LeftShoulder: rotation(0.4, 0, -1.6),
    RightShoulder: rotation(0.2, 0, 1.35),
    LeftArm: rotation(-23.5, -2, -elevation),
    RightArm: rotation(-24.5, 3, elevation),
    LeftForeArm: rotation(0, -6, -elbowFlex),
    RightForeArm: rotation(0, 6, elbowFlex),
    LeftHand: rotation(0, 1.5, -1),
    RightHand: rotation(0, -1.2, 1.4),
  };
}

export const STANDING_JUMP_RECIPES: readonly ClipRecipe[] = [
  {
    id: 'jump-launch',
    basePose: 'relaxed',
    frames: [
      { time: 0 },
      {
        time: 0.09,
        rotations: {
          ...jumpArmSwing(-18, 16),
          Hips: rotation(6, 0, -0.6), Spine: rotation(3, 0, 0.3), Spine1: rotation(7, 0, -0.4),
          LeftUpLeg: rotation(18), RightUpLeg: rotation(19), LeftLeg: rotation(-35), RightLeg: rotation(-38),
          LeftFoot: rotation(8), RightFoot: rotation(8),
        },
        positions: { Hips: [0, -0.034, -0.032] },
      },
      {
        time: 0.22,
        rotations: {
          ...jumpArmSwing(42, 28),
          Hips: rotation(15, 0, -0.4), Spine: rotation(8, 0, 0.4), Spine1: rotation(15, 0, -0.5),
          Spine2: rotation(8, 0, 0.2), Head: rotation(-7), LeftUpLeg: rotation(55), RightUpLeg: rotation(57),
          LeftLeg: rotation(-88), RightLeg: rotation(-92), LeftFoot: rotation(14), RightFoot: rotation(14),
        },
        positions: { Hips: [0, -0.18, -0.07] },
      },
      {
        time: 0.28,
        rotations: {
          ...jumpArmSwing(104, 32),
          Hips: rotation(10, 0, -0.3), Spine: rotation(5, 0, 0.2), Spine1: rotation(10, 0, -0.3),
          Spine2: rotation(5, 0, 0.1), Head: rotation(-5), LeftUpLeg: rotation(34), RightUpLeg: rotation(36),
          LeftLeg: rotation(-54), RightLeg: rotation(-58), LeftFoot: rotation(6), RightFoot: rotation(6),
        },
        positions: { Hips: [0, -0.049, -0.05] },
      },
      {
        time: 0.34,
        rotations: {
          ...jumpArmSwing(137, 22),
          Hips: rotation(3, 0, -0.2), Spine: rotation(1, 0, 0.1), Spine1: rotation(3, 0, -0.2),
          LeftUpLeg: rotation(8), RightUpLeg: rotation(10), LeftLeg: rotation(-12), RightLeg: rotation(-15),
          LeftFoot: rotation(-5), RightFoot: rotation(-5), LeftToeBase: rotation(10), RightToeBase: rotation(10), Head: rotation(-3),
        },
        positions: { Hips: [0, 0.014, -0.018] },
      },
      {
        time: 0.46,
        rotations: {
          ...jumpArmSwing(150, 18),
          Hips: rotation(-2, 0, 0), Spine: rotation(-2, 0, 0), Spine1: rotation(-3, 0, 0),
          LeftUpLeg: rotation(5), RightUpLeg: rotation(7), LeftLeg: rotation(-9), RightLeg: rotation(-12),
          LeftFoot: rotation(-10), RightFoot: rotation(-10), LeftToeBase: rotation(6), RightToeBase: rotation(6), Head: rotation(-2),
        },
        positions: { Hips: [0, 0.2, 0] },
      },
    ],
  },
  {
    id: 'jump-air',
    basePose: 'relaxed',
    frames: [
      {
        time: 0,
        rotations: {
          ...jumpArmSwing(150, 18),
          Hips: rotation(-2, 0, 0), Spine: rotation(-2, 0, 0), Spine1: rotation(-3, 0, 0),
          LeftUpLeg: rotation(5), RightUpLeg: rotation(7), LeftLeg: rotation(-9), RightLeg: rotation(-12),
          LeftFoot: rotation(-10), RightFoot: rotation(-10), LeftToeBase: rotation(6), RightToeBase: rotation(6), Head: rotation(-2),
        },
        positions: { Hips: [0, 0.2, 0] },
      },
      {
        time: 0.16,
        rotations: {
          ...jumpArmSwing(153, 22),
          Hips: rotation(-1, 0, 0), Spine: rotation(-1, 0, 0), Spine1: rotation(-2, 0, 0),
          LeftUpLeg: rotation(3), RightUpLeg: rotation(5), LeftLeg: rotation(-6), RightLeg: rotation(-8),
          LeftFoot: rotation(-7), RightFoot: rotation(-7), Head: rotation(-1),
        },
        positions: { Hips: [0, 0.36, 0.004] },
      },
      {
        time: 0.32,
        rotations: {
          ...jumpArmSwing(148, 28),
          Hips: rotation(0, 0, 0), Spine: rotation(0, 0, 0), Spine1: rotation(-1, 0, 0),
          LeftUpLeg: rotation(4), RightUpLeg: rotation(5), LeftLeg: rotation(-7), RightLeg: rotation(-9),
          LeftFoot: rotation(-4), RightFoot: rotation(-4), Head: rotation(0),
        },
        positions: { Hips: [0, 0.4, 0.006] },
      },
      {
        time: 0.46,
        rotations: {
          ...jumpArmSwing(122, 32),
          Hips: rotation(1, 0, 0), Spine: rotation(1, 0, 0), Spine1: rotation(1, 0, 0),
          LeftUpLeg: rotation(7), RightUpLeg: rotation(9), LeftLeg: rotation(-12), RightLeg: rotation(-15),
          LeftFoot: rotation(0), RightFoot: rotation(0), Head: rotation(1),
        },
        positions: { Hips: [0, 0.37, 0.008] },
      },
      {
        time: 0.56,
        rotations: {
          ...jumpArmSwing(90, 35),
          Hips: rotation(1.5, 0, 0), Spine: rotation(1.5, 0, 0), Spine1: rotation(2, 0, 0),
          LeftUpLeg: rotation(10), RightUpLeg: rotation(12), LeftLeg: rotation(-18), RightLeg: rotation(-21),
          LeftFoot: rotation(4), RightFoot: rotation(4), Head: rotation(1),
        },
        positions: { Hips: [0, 0.29, 0.01] },
      },
      {
        time: 0.66,
        rotations: {
          ...jumpArmSwing(62, 36),
          Hips: rotation(2, 0, 0), Spine: rotation(2, 0, 0), Spine1: rotation(3, 0, 0),
          LeftUpLeg: rotation(14), RightUpLeg: rotation(16), LeftLeg: rotation(-25), RightLeg: rotation(-29),
          LeftFoot: rotation(8), RightFoot: rotation(8), Head: rotation(1),
        },
        positions: { Hips: [0, 0.18, 0.012] },
      },
    ],
  },
  {
    id: 'land-soft',
    basePose: 'relaxed',
    frames: [
      {
        time: 0,
        rotations: {
          ...jumpArmSwing(62, 36),
          Hips: rotation(2, 0, 0), Spine: rotation(2, 0, 0), Spine1: rotation(3, 0, 0),
          LeftUpLeg: rotation(14), RightUpLeg: rotation(16), LeftLeg: rotation(-25), RightLeg: rotation(-29),
          LeftFoot: rotation(8), RightFoot: rotation(8),
        },
        positions: { Hips: [0, 0.04, 0.02] },
      },
      {
        time: 0.1,
        rotations: {
          ...jumpArmSwing(74, 38),
          Hips: rotation(8, 0, -0.3), Spine: rotation(5, 0, 0.2), Spine1: rotation(9, 0, -0.3),
          LeftUpLeg: rotation(31), RightUpLeg: rotation(33), LeftLeg: rotation(-61), RightLeg: rotation(-65),
          LeftFoot: rotation(11), RightFoot: rotation(11),
        },
        positions: { Hips: [0, -0.09, -0.02] },
      },
      {
        time: 0.18,
        rotations: {
          ...jumpArmSwing(88, 42),
          Hips: rotation(15, 0, -0.4), Spine: rotation(9, 0, 0.3), Spine1: rotation(15, 0, -0.4),
          Spine2: rotation(7, 0, 0.2), Head: rotation(-7), LeftUpLeg: rotation(52), RightUpLeg: rotation(54),
          LeftLeg: rotation(-92), RightLeg: rotation(-96), LeftFoot: rotation(14), RightFoot: rotation(14),
        },
        positions: { Hips: [0, -0.17, -0.065] },
      },
      {
        time: 0.34,
        rotations: {
          ...jumpArmSwing(66, 34),
          Hips: rotation(10, 0, -0.5), Spine: rotation(6, 0, 0.3), Spine1: rotation(10, 0, -0.4),
          LeftUpLeg: rotation(39), RightUpLeg: rotation(42), LeftLeg: rotation(-77), RightLeg: rotation(-83),
          LeftFoot: rotation(10), RightFoot: rotation(10),
        },
        positions: { Hips: [0, -0.12, -0.045] },
      },
      {
        time: 0.54,
        rotations: {
          ...jumpArmSwing(32, 22),
          Hips: rotation(4, 0, -0.7), Spine: rotation(2, 0, 0.2), Spine1: rotation(4, 0, -0.4),
          LeftUpLeg: rotation(18), RightUpLeg: rotation(21), LeftLeg: rotation(-35), RightLeg: rotation(-42),
          LeftFoot: rotation(5), RightFoot: rotation(5),
        },
        positions: { Hips: [0, -0.029, -0.012] },
      },
      { time: 0.72 },
    ],
  },
];
