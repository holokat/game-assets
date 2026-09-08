import type { ClipRecipe, PoseFrame } from './types';
import { rotation } from './types';
import { compactRunArms, relaxedWalkArms } from './gaitMechanics';

const WALK_FRAMES: readonly PoseFrame[] = [
  {
    time: 0,
    rotations: {
      Hips: rotation(0, -4, -1.2), Spine: rotation(-1, 2.2, 0.7), Spine1: rotation(2, 1.8, -0.9),
      Spine2: rotation(-0.5, 2.4, 0.4), LeftUpLeg: rotation(22), RightUpLeg: rotation(-15),
      LeftLeg: rotation(-8), RightLeg: rotation(-32), LeftFoot: rotation(-5), RightFoot: rotation(10),
      LeftToeBase: rotation(0), RightToeBase: rotation(-7), ...relaxedWalkArms(14, 18, 0.5),
    },
    positions: { Hips: [0.012, -0.014, 0] },
  },
  {
    time: 0.13,
    rotations: {
      Hips: rotation(1.5, -2.5, -1.8), Spine: rotation(-0.5, 1.5, 1), Spine1: rotation(2.3, 1, -1.1),
      LeftUpLeg: rotation(23), RightUpLeg: rotation(-13), LeftLeg: rotation(-28), RightLeg: rotation(-38),
      LeftFoot: rotation(3), RightFoot: rotation(14), RightToeBase: rotation(-10),
      ...relaxedWalkArms(10, 20, 0.2),
    },
    positions: { Hips: [0.02, -0.022, 0.008] },
  },
  {
    time: 0.26,
    rotations: {
      Hips: rotation(0, 0, -1.1), Spine: rotation(-1.2, 0, 0.65), Spine1: rotation(1.8, 0, -0.7),
      LeftUpLeg: rotation(4), RightUpLeg: rotation(-7), LeftLeg: rotation(-17), RightLeg: rotation(-47),
      LeftFoot: rotation(-1), RightFoot: rotation(18), RightToeBase: rotation(-14),
      ...relaxedWalkArms(4, 23, -0.1),
    },
    positions: { Hips: [0.022, 0, 0.004] },
  },
  {
    time: 0.39,
    rotations: {
      Hips: rotation(-1, 2.6, -0.2), Spine: rotation(-0.7, -1.4, 0), Spine1: rotation(1.7, -1, -0.1),
      LeftUpLeg: rotation(-13), RightUpLeg: rotation(10), LeftLeg: rotation(-4), RightLeg: rotation(-56),
      LeftFoot: rotation(-8), RightFoot: rotation(-8), LeftToeBase: rotation(8), RightToeBase: rotation(3),
      ...relaxedWalkArms(-8, 21, 0.3),
    },
    positions: { Hips: [0.004, 0.01, -0.003] },
  },
  {
    time: 0.52,
    rotations: {
      Hips: rotation(0, 4, 1.2), Spine: rotation(-1, -2.2, -0.7), Spine1: rotation(2, -1.8, 0.9),
      Spine2: rotation(-0.5, -2.4, -0.4), LeftUpLeg: rotation(-15), RightUpLeg: rotation(22),
      LeftLeg: rotation(-32), RightLeg: rotation(-8), LeftFoot: rotation(10), RightFoot: rotation(-5),
      LeftToeBase: rotation(-7), RightToeBase: rotation(0), ...relaxedWalkArms(-14, 18, 0.5),
    },
    positions: { Hips: [-0.012, -0.014, 0] },
  },
  {
    time: 0.65,
    rotations: {
      Hips: rotation(1.5, 2.5, 1.8), Spine: rotation(-0.5, -1.5, -1), Spine1: rotation(2.3, -1, 1.1),
      LeftUpLeg: rotation(-13), RightUpLeg: rotation(23), LeftLeg: rotation(-38), RightLeg: rotation(-28),
      LeftFoot: rotation(14), RightFoot: rotation(3), LeftToeBase: rotation(-10),
      ...relaxedWalkArms(-10, 20, 0.2),
    },
    positions: { Hips: [-0.02, -0.022, 0.008] },
  },
  {
    time: 0.78,
    rotations: {
      Hips: rotation(0, 0, 1.1), Spine: rotation(-1.2, 0, -0.65), Spine1: rotation(1.8, 0, 0.7),
      LeftUpLeg: rotation(-7), RightUpLeg: rotation(4), LeftLeg: rotation(-47), RightLeg: rotation(-17),
      LeftFoot: rotation(18), RightFoot: rotation(-1), LeftToeBase: rotation(-14),
      ...relaxedWalkArms(-4, 23, -0.1),
    },
    positions: { Hips: [-0.022, 0, 0.004] },
  },
  {
    time: 0.91,
    rotations: {
      Hips: rotation(-1, -2.6, 0.2), Spine: rotation(-0.7, 1.4, 0), Spine1: rotation(1.7, 1, 0.1),
      LeftUpLeg: rotation(10), RightUpLeg: rotation(-13), LeftLeg: rotation(-56), RightLeg: rotation(-4),
      LeftFoot: rotation(-8), RightFoot: rotation(-8), LeftToeBase: rotation(3), RightToeBase: rotation(8),
      ...relaxedWalkArms(8, 21, 0.3),
    },
    positions: { Hips: [-0.004, 0.01, -0.003] },
  },
];

// Keep loop seams exact without repeating the long contact pose by hand.
const forwardWalkFrames: readonly PoseFrame[] = [...WALK_FRAMES, { ...WALK_FRAMES[0]!, time: 1.04 }];

function createStrafeRecipe(id: 'strafe-left' | 'strafe-right', side: 1 | -1): ClipRecipe {
  const leading = side === 1 ? 'Left' : 'Right';
  const trailing = side === 1 ? 'Right' : 'Left';
  const lateral = 0.026 * side;
  const lean = 3.2 * side;
  const frames: PoseFrame[] = [
    {
      time: 0,
      rotations: {
        Hips: rotation(0, -2 * side, -lean), Spine: rotation(1, 2 * side, lean * 0.55),
        [`${leading}UpLeg`]: rotation(14, -4 * side, 5 * side), [`${trailing}UpLeg`]: rotation(8, 3 * side, -3 * side),
        [`${leading}Leg`]: rotation(-26), [`${trailing}Leg`]: rotation(-17),
        [`${leading}Foot`]: rotation(3, 0, -4 * side), [`${trailing}Foot`]: rotation(5, 0, 2 * side),
      },
      positions: { Hips: [lateral, -0.05, 0] },
    },
    {
      time: 0.18,
      rotations: {
        Hips: rotation(0, 0, -4.5 * side), Spine1: rotation(4, 0, 2.4 * side),
        [`${leading}UpLeg`]: rotation(20, -7 * side, 9 * side), [`${trailing}UpLeg`]: rotation(15, 4 * side, -5 * side),
        [`${leading}Leg`]: rotation(-39), [`${trailing}Leg`]: rotation(-31),
        [`${leading}Foot`]: rotation(8, 0, -7 * side),
      },
      positions: { Hips: [0.041 * side, -0.072, -0.006] },
    },
    {
      time: 0.36,
      rotations: {
        Hips: rotation(0, 3 * side, -1.2 * side), Spine: rotation(0, -2 * side, 0.8 * side),
        [`${leading}UpLeg`]: rotation(5, -2 * side, 2 * side), [`${trailing}UpLeg`]: rotation(22, 6 * side, -8 * side),
        [`${leading}Leg`]: rotation(-14), [`${trailing}Leg`]: rotation(-42),
        [`${leading}Foot`]: rotation(-2, 0, -2 * side), [`${trailing}Foot`]: rotation(11, 0, 5 * side),
      },
      positions: { Hips: [0.018 * side, -0.035, 0.004] },
    },
    {
      time: 0.54,
      rotations: {
        Hips: rotation(0, 2 * side, 2.8 * side), Spine: rotation(1, -2 * side, -1.5 * side),
        [`${leading}UpLeg`]: rotation(7, 3 * side, -4 * side), [`${trailing}UpLeg`]: rotation(14, -4 * side, 5 * side),
        [`${leading}Leg`]: rotation(-17), [`${trailing}Leg`]: rotation(-27),
      },
      positions: { Hips: [-0.018 * side, -0.048, 0] },
    },
    {
      time: 0.72,
      rotations: {
        Hips: rotation(0, 0, 4.5 * side), Spine1: rotation(4, 0, -2.4 * side),
        [`${leading}UpLeg`]: rotation(15, -4 * side, 5 * side), [`${trailing}UpLeg`]: rotation(20, 7 * side, -9 * side),
        [`${leading}Leg`]: rotation(-31), [`${trailing}Leg`]: rotation(-39),
        [`${trailing}Foot`]: rotation(8, 0, 7 * side),
      },
      positions: { Hips: [-0.041 * side, -0.072, -0.006] },
    },
    {
      time: 0.9,
      rotations: {
        Hips: rotation(0, -3 * side, 1.2 * side), Spine: rotation(0, 2 * side, -0.8 * side),
        [`${leading}UpLeg`]: rotation(22, -6 * side, 8 * side), [`${trailing}UpLeg`]: rotation(5, 2 * side, -2 * side),
        [`${leading}Leg`]: rotation(-42), [`${trailing}Leg`]: rotation(-14),
        [`${leading}Foot`]: rotation(11, 0, -5 * side), [`${trailing}Foot`]: rotation(-2, 0, 2 * side),
      },
      positions: { Hips: [-0.018 * side, -0.035, 0.004] },
    },
  ];
  frames.push({ ...frames[0]!, time: 1.08 });
  return { id, basePose: 'combat', frames };
}

function createTurnRecipe(id: 'turn-left' | 'turn-right', side: 1 | -1): ClipRecipe {
  return {
    id,
    basePose: 'combat',
    frames: [
      { time: 0 },
      {
        time: 0.13,
        rotations: {
          Hips: rotation(0, -9 * side, -2 * side), Spine: rotation(2, 5 * side, 1.2 * side),
          Spine1: rotation(4, 9 * side, -1.5 * side), Head: rotation(-1, 12 * side, 0),
          LeftUpLeg: rotation(18), RightUpLeg: rotation(18), LeftLeg: rotation(-34), RightLeg: rotation(-34),
        },
        positions: { Hips: [-0.018 * side, -0.082, -0.018] },
      },
      {
        time: 0.32,
        rotations: {
          Hips: rotation(0, 18 * side, 2 * side),
          Spine: rotation(1, -8 * side, -1 * side), Spine1: rotation(3, -12 * side, 1.5 * side),
          Head: rotation(-1, 9 * side, 0), LeftUpLeg: rotation(12, -5 * side, 3 * side),
          RightUpLeg: rotation(21, 6 * side, -3 * side), LeftLeg: rotation(-23), RightLeg: rotation(-41),
        },
        positions: { Hips: [0.016 * side, -0.057, 0.006] },
      },
      {
        time: 0.5,
        rotations: {
          Hips: rotation(0, 8 * side, 0.8 * side),
          Spine: rotation(2, -3 * side, -0.5 * side), Spine1: rotation(4, -5 * side, 0.8 * side),
          Head: rotation(-1, 2 * side, 0), LeftUpLeg: rotation(13), RightUpLeg: rotation(18),
          LeftLeg: rotation(-26), RightLeg: rotation(-36),
        },
        positions: { Hips: [0.008 * side, -0.064, 0] },
      },
      { time: 0.68 },
    ],
  };
}

export const LOCOMOTION_RECIPES: readonly ClipRecipe[] = [
  {
    id: 'walk-start',
    basePose: 'relaxed',
    frames: [
      { time: 0 },
      {
        time: 0.12,
        rotations: {
          Hips: rotation(5, 1, -1.5), Spine: rotation(-2, 0, 0.8), Spine1: rotation(3, 0, -0.9),
          LeftUpLeg: rotation(8), RightUpLeg: rotation(10), LeftLeg: rotation(-13), RightLeg: rotation(-19),
          LeftArm: rotation(-2, 0, 6), RightArm: rotation(3, 0, -7),
        },
        positions: { Hips: [-0.014, -0.035, -0.015] },
      },
      {
        time: 0.28,
        rotations: {
          Hips: rotation(2, -3, -1.8), Spine: rotation(-1, 2, 1), LeftUpLeg: rotation(24),
          RightUpLeg: rotation(-10), LeftLeg: rotation(-20), RightLeg: rotation(-29),
          LeftFoot: rotation(-4), RightFoot: rotation(11), LeftArm: rotation(10, 0, 5), RightArm: rotation(-12, 0, -6),
        },
        positions: { Hips: [0.012, -0.026, 0.002] },
      },
      { ...forwardWalkFrames[1]!, time: 0.52 },
    ],
  },
  { id: 'walk', basePose: 'relaxed', frames: forwardWalkFrames },
  {
    id: 'walk-stop',
    basePose: 'relaxed',
    frames: [
      { ...forwardWalkFrames[4]!, time: 0 },
      {
        time: 0.14,
        rotations: {
          Hips: rotation(2, 2, 1.7), Spine: rotation(-3, -1, -0.8), Spine1: rotation(4, -1, 1),
          LeftUpLeg: rotation(-8), RightUpLeg: rotation(18), LeftLeg: rotation(-29), RightLeg: rotation(-24),
          LeftFoot: rotation(12), RightFoot: rotation(2), LeftArm: rotation(-8, 0, 6), RightArm: rotation(7, 0, -7),
        },
        positions: { Hips: [-0.016, -0.042, 0.012] },
      },
      {
        time: 0.3,
        rotations: {
          Hips: rotation(-1, 1, 0.7), Spine: rotation(1, -0.5, -0.3), Spine1: rotation(0.5, 0, 0.3),
          LeftUpLeg: rotation(6), RightUpLeg: rotation(9), LeftLeg: rotation(-14), RightLeg: rotation(-18),
          LeftFoot: rotation(3), RightFoot: rotation(4),
        },
        positions: { Hips: [-0.006, -0.026, 0.004] },
      },
      { time: 0.48 },
    ],
  },
  {
    id: 'walk-backward',
    basePose: 'combat',
    frames: [
      {
        time: 0,
        rotations: {
          Hips: rotation(1, 3, -2), Spine: rotation(-2, -2, 1), LeftUpLeg: rotation(-15), RightUpLeg: rotation(20),
          LeftLeg: rotation(-31), RightLeg: rotation(-17), LeftFoot: rotation(12), RightFoot: rotation(-5),
          LeftArm: rotation(-16, -5, 16), RightArm: rotation(-21, 8, -22),
        },
        positions: { Hips: [-0.014, -0.06, 0.015] },
      },
      { time: 0.295, rotations: { Hips: rotation(0, 0, -1), LeftUpLeg: rotation(8), RightUpLeg: rotation(4), LeftLeg: rotation(-34), RightLeg: rotation(-18), LeftFoot: rotation(-2), RightFoot: rotation(6) }, positions: { Hips: [-0.008, -0.045, -0.006] } },
      { time: 0.59, rotations: { Hips: rotation(1, -3, 2), Spine: rotation(-2, 2, -1), LeftUpLeg: rotation(20), RightUpLeg: rotation(-15), LeftLeg: rotation(-17), RightLeg: rotation(-31), LeftFoot: rotation(-5), RightFoot: rotation(12) }, positions: { Hips: [0.014, -0.06, 0.015] } },
      { time: 0.885, rotations: { Hips: rotation(0, 0, 1), LeftUpLeg: rotation(4), RightUpLeg: rotation(8), LeftLeg: rotation(-18), RightLeg: rotation(-34), LeftFoot: rotation(6), RightFoot: rotation(-2) }, positions: { Hips: [0.008, -0.045, -0.006] } },
      {
        time: 1.18,
        rotations: {
          Hips: rotation(1, 3, -2), Spine: rotation(-2, -2, 1), LeftUpLeg: rotation(-15), RightUpLeg: rotation(20),
          LeftLeg: rotation(-31), RightLeg: rotation(-17), LeftFoot: rotation(12), RightFoot: rotation(-5),
          LeftArm: rotation(-16, -5, 16), RightArm: rotation(-21, 8, -22),
        },
        positions: { Hips: [-0.014, -0.06, 0.015] },
      },
    ],
  },
  createStrafeRecipe('strafe-left', 1),
  createStrafeRecipe('strafe-right', -1),
  {
    id: 'run-start',
    basePose: 'relaxed',
    frames: [
      { time: 0 },
      { time: 0.1, rotations: { Hips: rotation(9, 0, -1), Spine: rotation(-4, 0, 0.5), Spine1: rotation(8, 0, -0.6), LeftUpLeg: rotation(18), RightUpLeg: rotation(22), LeftLeg: rotation(-34), RightLeg: rotation(-42), ...compactRunArms(3, 48) }, positions: { Hips: [-0.01, -0.1, -0.045] } },
      { time: 0.25, rotations: { Hips: rotation(6, -5, -2), Spine: rotation(-3, 2, 0.7), Spine1: rotation(11, 3, -1), Spine2: rotation(-1, 2, 0.4), LeftUpLeg: rotation(42), RightUpLeg: rotation(-20), LeftLeg: rotation(-22), RightLeg: rotation(-56), ...compactRunArms(24) }, positions: { Hips: [0.012, -0.038, -0.032] } },
      { time: 0.46, rotations: { Hips: rotation(5, -3, -1), Spine: rotation(-3, 2, 0.7), Spine1: rotation(10, 2, -1), Spine2: rotation(-1, 2, 0.4), Head: rotation(-2, 1, 0), LeftUpLeg: rotation(32), RightUpLeg: rotation(-26), LeftLeg: rotation(-16), RightLeg: rotation(-51), ...compactRunArms(26) }, positions: { Hips: [0.006, 0.002, -0.028] } },
    ],
  },
  {
    id: 'run',
    basePose: 'relaxed',
    frames: [
      { time: 0, rotations: { Hips: rotation(6, -4, -1.5), Spine: rotation(-3, 2, 0.7), Spine1: rotation(10, 3, -1), Spine2: rotation(-1, 2, 0.4), Head: rotation(-2, 1, 0), LeftUpLeg: rotation(38), RightUpLeg: rotation(-31), LeftLeg: rotation(-18), RightLeg: rotation(-70), LeftFoot: rotation(-8), RightFoot: rotation(15), ...compactRunArms(26, 58, 0.6) }, positions: { Hips: [0.008, 0.004, -0.025] } },
      { time: 0.11, rotations: { Hips: rotation(9, -1, -1), Spine: rotation(-3, 1, 0.4), Spine1: rotation(11, 1, -0.5), Spine2: rotation(-1, 1, 0.2), Head: rotation(-2), LeftUpLeg: rotation(28), RightUpLeg: rotation(-15), LeftLeg: rotation(-34), RightLeg: rotation(-48), LeftFoot: rotation(0), RightFoot: rotation(8), ...compactRunArms(17, 62, 0.2) }, positions: { Hips: [0.004, -0.026, -0.032] } },
      { time: 0.145, rotations: { Hips: rotation(8, 0, -0.5), Spine: rotation(-3, 0, 0.2), Spine1: rotation(11, 0, -0.2), Spine2: rotation(-1), Head: rotation(-2), LeftUpLeg: rotation(15), RightUpLeg: rotation(-10), LeftLeg: rotation(-18), RightLeg: rotation(-42), LeftFoot: rotation(-7), RightFoot: rotation(4), LeftToeBase: rotation(12), ...compactRunArms(9, 64, -0.2) }, positions: { Hips: [0.002, -0.006, -0.034] } },
      { time: 0.18, rotations: { Hips: rotation(7, 0, 0), Spine: rotation(-3), Spine1: rotation(10), Spine2: rotation(-1), Head: rotation(-2), LeftUpLeg: rotation(6), RightUpLeg: rotation(-5), LeftLeg: rotation(-28), RightLeg: rotation(-30), LeftFoot: rotation(8), RightFoot: rotation(-2), LeftToeBase: rotation(7), ...compactRunArms(1, 61, -0.4) }, positions: { Hips: [0, 0.031, -0.03] } },
      { time: 0.23, rotations: { Hips: rotation(7, 1, 0.5), Spine: rotation(-3, -1, -0.3), Spine1: rotation(10, -1.5, 0.4), Spine2: rotation(-1, -1, -0.2), Head: rotation(-2, -0.5, 0), LeftUpLeg: rotation(-6), RightUpLeg: rotation(8), LeftLeg: rotation(-43), RightLeg: rotation(-23), LeftFoot: rotation(12), RightFoot: rotation(-5), ...compactRunArms(-8, 59, -0.1) }, positions: { Hips: [-0.003, 0.026, -0.029] } },
      { time: 0.28, rotations: { Hips: rotation(7, 3, 1), Spine: rotation(-3, -2, -0.7), Spine1: rotation(10, -3, 1), Spine2: rotation(-1, -2, -0.4), Head: rotation(-2, -1, 0), LeftUpLeg: rotation(-18), RightUpLeg: rotation(21), LeftLeg: rotation(-56), RightLeg: rotation(-16), LeftFoot: rotation(14), RightFoot: rotation(-8), ...compactRunArms(-18, 58, 0.1) }, positions: { Hips: [-0.006, 0.016, -0.028] } },
      { time: 0.36, rotations: { Hips: rotation(6, 4, 1.5), Spine: rotation(-3, -2, -0.7), Spine1: rotation(10, -3, 1), Spine2: rotation(-1, -2, -0.4), Head: rotation(-2, -1, 0), LeftUpLeg: rotation(-31), RightUpLeg: rotation(38), LeftLeg: rotation(-70), RightLeg: rotation(-18), LeftFoot: rotation(15), RightFoot: rotation(-8), ...compactRunArms(-26, 58, 0.6) }, positions: { Hips: [-0.008, 0.004, -0.025] } },
      { time: 0.47, rotations: { Hips: rotation(9, 1, 1), Spine: rotation(-3, -1, -0.4), Spine1: rotation(11, -1, 0.5), Spine2: rotation(-1, -1, -0.2), Head: rotation(-2), LeftUpLeg: rotation(-15), RightUpLeg: rotation(28), LeftLeg: rotation(-48), RightLeg: rotation(-34), LeftFoot: rotation(8), RightFoot: rotation(0), ...compactRunArms(-17, 62, 0.2) }, positions: { Hips: [-0.004, -0.026, -0.032] } },
      { time: 0.505, rotations: { Hips: rotation(8, 0, 0.5), Spine: rotation(-3, 0, -0.2), Spine1: rotation(11, 0, 0.2), Spine2: rotation(-1), Head: rotation(-2), LeftUpLeg: rotation(-10), RightUpLeg: rotation(15), LeftLeg: rotation(-42), RightLeg: rotation(-18), LeftFoot: rotation(4), RightFoot: rotation(-7), RightToeBase: rotation(12), ...compactRunArms(-9, 64, -0.2) }, positions: { Hips: [-0.002, -0.006, -0.034] } },
      { time: 0.54, rotations: { Hips: rotation(7, 0, 0), Spine: rotation(-3), Spine1: rotation(10), Spine2: rotation(-1), Head: rotation(-2), LeftUpLeg: rotation(-5), RightUpLeg: rotation(6), LeftLeg: rotation(-30), RightLeg: rotation(-28), LeftFoot: rotation(-2), RightFoot: rotation(8), RightToeBase: rotation(7), ...compactRunArms(-1, 61, -0.4) }, positions: { Hips: [0, 0.031, -0.03] } },
      { time: 0.59, rotations: { Hips: rotation(7, -1, -0.5), Spine: rotation(-3, 1, 0.3), Spine1: rotation(10, 1.5, -0.4), Spine2: rotation(-1, 1, 0.2), Head: rotation(-2, 0.5, 0), LeftUpLeg: rotation(8), RightUpLeg: rotation(-6), LeftLeg: rotation(-23), RightLeg: rotation(-43), LeftFoot: rotation(-5), RightFoot: rotation(12), ...compactRunArms(8, 59, -0.1) }, positions: { Hips: [0.003, 0.026, -0.029] } },
      { time: 0.64, rotations: { Hips: rotation(7, -3, -1), Spine: rotation(-3, 2, 0.7), Spine1: rotation(10, 3, -1), Spine2: rotation(-1, 2, 0.4), Head: rotation(-2, 1, 0), LeftUpLeg: rotation(21), RightUpLeg: rotation(-18), LeftLeg: rotation(-16), RightLeg: rotation(-56), LeftFoot: rotation(-8), RightFoot: rotation(14), ...compactRunArms(18, 58, 0.1) }, positions: { Hips: [0.006, 0.016, -0.028] } },
      { time: 0.72, rotations: { Hips: rotation(6, -4, -1.5), Spine: rotation(-3, 2, 0.7), Spine1: rotation(10, 3, -1), Spine2: rotation(-1, 2, 0.4), Head: rotation(-2, 1, 0), LeftUpLeg: rotation(38), RightUpLeg: rotation(-31), LeftLeg: rotation(-18), RightLeg: rotation(-70), LeftFoot: rotation(-8), RightFoot: rotation(15), ...compactRunArms(26, 58, 0.6) }, positions: { Hips: [0.008, 0.004, -0.025] } },
    ],
  },
  {
    id: 'run-stop',
    basePose: 'relaxed',
    frames: [
      { time: 0, rotations: { Hips: rotation(6, -4, -1), Spine: rotation(-3, 2, 0.7), Spine1: rotation(10, 3, -1), Spine2: rotation(-1, 2, 0.4), LeftUpLeg: rotation(35), RightUpLeg: rotation(-27), LeftLeg: rotation(-16), RightLeg: rotation(-53), ...compactRunArms(24) }, positions: { Hips: [0.008, 0, -0.03] } },
      { time: 0.16, rotations: { Hips: rotation(-4, 2, 2), Spine: rotation(7, -1, -1), Spine1: rotation(13, -2, 1.5), LeftUpLeg: rotation(12), RightUpLeg: rotation(35), LeftLeg: rotation(-42), RightLeg: rotation(-58), LeftFoot: rotation(14), RightFoot: rotation(5), ...compactRunArms(-14, 62) }, positions: { Hips: [-0.018, -0.105, 0.035] } },
      { time: 0.34, rotations: { Hips: rotation(-2, -1, -1), Spine: rotation(4, 0, 0.5), Spine1: rotation(7, 0, -0.6), LeftUpLeg: rotation(20), RightUpLeg: rotation(15), LeftLeg: rotation(-38), RightLeg: rotation(-31), ...compactRunArms(-5, 38) }, positions: { Hips: [-0.006, -0.07, 0.018] } },
      { time: 0.5, rotations: { Hips: rotation(1, 1, -1.5), Spine1: rotation(3, 0, -0.8), LeftUpLeg: rotation(7), RightUpLeg: rotation(11), LeftLeg: rotation(-15), RightLeg: rotation(-23), ...compactRunArms(0, 18) }, positions: { Hips: [-0.01, -0.033, 0.004] } },
      { time: 0.64 },
    ],
  },
  createTurnRecipe('turn-left', 1),
  createTurnRecipe('turn-right', -1),
];
