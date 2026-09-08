import type { ClipRecipe, PoseFrame } from './types';
import { rotation } from './types';

const SURFACE_SWIM_FRAMES: readonly PoseFrame[] = [
  {
    time: 0,
    rotations: {
      Hips: rotation(88, -5, 0), Spine: rotation(-4, 1, 0), Spine1: rotation(5, 2, 0), Spine2: rotation(-2, 2, 0),
      Neck: rotation(-5, 1, 0), Head: rotation(7, 0, 0),
      LeftShoulder: rotation(0, -2, -2), RightShoulder: rotation(0, 2, 2),
      LeftArm: rotation(-24, -2, 7), LeftForeArm: rotation(0, -4, -12), LeftHand: rotation(3, 0, -2),
      RightArm: rotation(150, 0, -2), RightForeArm: rotation(0, 4, 10), RightHand: rotation(-3, 0, 1),
      LeftUpLeg: rotation(-5, 0, 1), RightUpLeg: rotation(5, 0, -1),
      LeftLeg: rotation(-11), RightLeg: rotation(-22), LeftFoot: rotation(-10), RightFoot: rotation(-14),
      LeftToeBase: rotation(-3), RightToeBase: rotation(-4),
    },
    positions: { Hips: [0, 0.012, 0] },
  },
  {
    time: 0.2,
    rotations: {
      Hips: rotation(88, 8, -1), Spine: rotation(-3, -3, 1), Spine1: rotation(5, -5, 2), Spine2: rotation(-2, -7, 2),
      Neck: rotation(-4, 10, 1), Head: rotation(6, 22, 3),
      LeftShoulder: rotation(4, -5, -9), RightShoulder: rotation(-1, 2, 3),
      LeftArm: rotation(52, -10, 18), LeftForeArm: rotation(0, -14, -92), LeftHand: rotation(4, 4, -8),
      RightArm: rotation(146, 0, -3), RightForeArm: rotation(0, 4, 10), RightHand: rotation(-4, 0, 1),
      LeftUpLeg: rotation(6, 0, 1), RightUpLeg: rotation(-6, 0, -1),
      LeftLeg: rotation(-23), RightLeg: rotation(-10), LeftFoot: rotation(-15), RightFoot: rotation(-9),
      LeftToeBase: rotation(-4), RightToeBase: rotation(-3),
    },
    positions: { Hips: [0.008, 0.026, 0] },
  },
  {
    time: 0.4,
    rotations: {
      Hips: rotation(88, 6, -1), Spine: rotation(-4, -3, 1), Spine1: rotation(5, -4, 1), Spine2: rotation(-2, -4, 1),
      Neck: rotation(-5, 5, 0), Head: rotation(7, 10, 1),
      LeftShoulder: rotation(2, -4, -7), RightShoulder: rotation(-1, 3, 3),
      LeftArm: rotation(108, -7, 12), LeftForeArm: rotation(0, -10, -68), LeftHand: rotation(2, 2, -4),
      RightArm: rotation(112, 3, -9), RightForeArm: rotation(0, 9, 52), RightHand: rotation(-2, -2, 4),
      LeftUpLeg: rotation(-4, 0, 1), RightUpLeg: rotation(5, 0, -1),
      LeftLeg: rotation(-11), RightLeg: rotation(-21), LeftFoot: rotation(-9), RightFoot: rotation(-15),
      LeftToeBase: rotation(-3), RightToeBase: rotation(-4),
    },
    positions: { Hips: [0.006, 0.008, 0] },
  },
  {
    time: 0.6,
    rotations: {
      Hips: rotation(88, 2, 0), Spine: rotation(-4, -1, 0), Spine1: rotation(5, -2, 0), Spine2: rotation(-2, -2, 0),
      Neck: rotation(-5, 1, 0), Head: rotation(7, 2, 0),
      LeftShoulder: rotation(0, -2, -3), RightShoulder: rotation(-2, 4, 5),
      LeftArm: rotation(150, 0, 2), LeftForeArm: rotation(0, -4, -12), LeftHand: rotation(2, 0, -2),
      RightArm: rotation(68, 5, -14), RightForeArm: rotation(0, 12, 72), RightHand: rotation(-3, -3, 5),
      LeftUpLeg: rotation(5, 0, 1), RightUpLeg: rotation(-5, 0, -1),
      LeftLeg: rotation(-22), RightLeg: rotation(-10), LeftFoot: rotation(-15), RightFoot: rotation(-9),
      LeftToeBase: rotation(-4), RightToeBase: rotation(-3),
    },
    positions: { Hips: [0.002, -0.006, 0] },
  },
  {
    time: 0.8,
    rotations: {
      Hips: rotation(88, -4, 1), Spine: rotation(-3, 2, -1), Spine1: rotation(5, 4, -1), Spine2: rotation(-2, 5, -1),
      Neck: rotation(-5, 0, 0), Head: rotation(7, 0, 0),
      LeftShoulder: rotation(-1, -1, 2), RightShoulder: rotation(-3, 5, 8),
      LeftArm: rotation(141, -3, 5), LeftForeArm: rotation(0, -8, -36), LeftHand: rotation(3, 1, -4),
      RightArm: rotation(22, 5, -11), RightForeArm: rotation(0, 14, 88), RightHand: rotation(-4, -2, 5),
      LeftUpLeg: rotation(-5, 0, 1), RightUpLeg: rotation(5, 0, -1),
      LeftLeg: rotation(-10), RightLeg: rotation(-22), LeftFoot: rotation(-9), RightFoot: rotation(-15),
      LeftToeBase: rotation(-3), RightToeBase: rotation(-4),
    },
    positions: { Hips: [-0.004, 0.005, 0] },
  },
  {
    time: 1,
    rotations: {
      Hips: rotation(88, -8, 1), Spine: rotation(-3, 3, -1), Spine1: rotation(5, 5, -2), Spine2: rotation(-2, 7, -2),
      Neck: rotation(-4, -1, 0), Head: rotation(6, -1, 0),
      LeftShoulder: rotation(-2, 2, 5), RightShoulder: rotation(-1, 4, 6),
      LeftArm: rotation(112, -4, 10), LeftForeArm: rotation(0, -12, -78), LeftHand: rotation(3, 2, -5),
      RightArm: rotation(-24, 2, -7), RightForeArm: rotation(0, 4, 14), RightHand: rotation(-3, 0, 2),
      LeftUpLeg: rotation(6, 0, 1), RightUpLeg: rotation(-6, 0, -1),
      LeftLeg: rotation(-23), RightLeg: rotation(-10), LeftFoot: rotation(-15), RightFoot: rotation(-9),
      LeftToeBase: rotation(-4), RightToeBase: rotation(-3),
    },
    positions: { Hips: [-0.008, 0.025, 0] },
  },
  {
    time: 1.2,
    rotations: {
      Hips: rotation(88, -8, 1), Spine: rotation(-3, 3, -1), Spine1: rotation(5, 5, -2), Spine2: rotation(-2, 7, -2),
      Neck: rotation(-4, -2, 0), Head: rotation(6, -3, -1),
      LeftShoulder: rotation(-2, 3, 5),
      LeftArm: rotation(140, 0, 3), LeftForeArm: rotation(0, -8, -42), LeftHand: rotation(4, 0, -1),
      RightShoulder: rotation(-4, 5, 9), RightArm: rotation(52, 10, -18), RightForeArm: rotation(0, 14, 92), RightHand: rotation(-4, -4, 8),
      LeftUpLeg: rotation(-4, 0, 1), RightUpLeg: rotation(5, 0, -1),
      LeftLeg: rotation(-11), RightLeg: rotation(-21), LeftFoot: rotation(-9), RightFoot: rotation(-15),
      LeftToeBase: rotation(-3), RightToeBase: rotation(-4),
    },
    positions: { Hips: [-0.008, 0.024, 0] },
  },
  {
    time: 1.4,
    rotations: {
      Hips: rotation(88, -6, 1), Spine: rotation(-4, 3, -1), Spine1: rotation(5, 4, -1), Spine2: rotation(-2, 4, -1),
      Neck: rotation(-5, -1, 0), Head: rotation(7, -1, 0),
      LeftShoulder: rotation(-1, 3, 4), RightShoulder: rotation(2, 4, 7),
      LeftArm: rotation(108, -3, 10), LeftForeArm: rotation(0, -12, -78), LeftHand: rotation(2, 2, -4),
      RightArm: rotation(108, 7, -12), RightForeArm: rotation(0, 10, 68), RightHand: rotation(-2, -2, 4),
      LeftUpLeg: rotation(5, 0, 1), RightUpLeg: rotation(-5, 0, -1),
      LeftLeg: rotation(-22), RightLeg: rotation(-10), LeftFoot: rotation(-15), RightFoot: rotation(-9),
      LeftToeBase: rotation(-4), RightToeBase: rotation(-3),
    },
    positions: { Hips: [-0.006, 0.008, 0] },
  },
];

const surfaceSwimFrames: readonly PoseFrame[] = [
  ...SURFACE_SWIM_FRAMES,
  {
    time: 1.52,
    rotations: {
      Hips: rotation(88, -5, 0), Spine: rotation(-4, 1, 0), Spine1: rotation(5, 2, 0), Spine2: rotation(-2, 2, 0),
      Neck: rotation(-5, 0, 0), Head: rotation(7, 0, 0),
      LeftShoulder: rotation(0, -1, 1), RightShoulder: rotation(0, 3, 4),
      LeftArm: rotation(35, -1, 8), LeftForeArm: rotation(0, -8, -40), LeftHand: rotation(3, 1, -3),
      RightArm: rotation(139, 3, -6), RightForeArm: rotation(0, 7, 28), RightHand: rotation(-3, -1, 3),
      LeftUpLeg: rotation(-1, 0, 1), RightUpLeg: rotation(1, 0, -1),
      LeftLeg: rotation(-15), RightLeg: rotation(-16), LeftFoot: rotation(-12), RightFoot: rotation(-12),
      LeftToeBase: rotation(-3), RightToeBase: rotation(-3),
    },
    positions: { Hips: [-0.002, 0.01, 0] },
  },
  { ...SURFACE_SWIM_FRAMES[0]!, time: 1.6 },
];

const treadWaterFrames: readonly PoseFrame[] = [
  {
    time: 0,
    rotations: {
      Hips: rotation(1, -3, -2), Spine: rotation(3, 1, 1), Spine1: rotation(5, 2, -1),
      LeftArm: rotation(-18, -8, 26), RightArm: rotation(-18, 8, -26),
      LeftForeArm: rotation(0, -9, -66), RightForeArm: rotation(0, 9, 66),
      LeftUpLeg: rotation(34, -4, 6), RightUpLeg: rotation(12, 4, -5),
      LeftLeg: rotation(-72), RightLeg: rotation(-42), LeftFoot: rotation(-8), RightFoot: rotation(-15),
    },
    positions: { Hips: [-0.012, 0, 0] },
  },
  {
    time: 0.6,
    rotations: {
      Hips: rotation(-1, 2, 2), Spine: rotation(2, -1, -1), Spine1: rotation(4, -2, 1),
      LeftArm: rotation(-21, -5, 18), RightArm: rotation(-15, 7, -31),
      LeftForeArm: rotation(0, -8, -54), RightForeArm: rotation(0, 10, 74),
      LeftUpLeg: rotation(12, -3, 5), RightUpLeg: rotation(36, 3, -6),
      LeftLeg: rotation(-42), RightLeg: rotation(-74), LeftFoot: rotation(-16), RightFoot: rotation(-8),
    },
    positions: { Hips: [0.012, 0.018, 0.006] },
  },
  {
    time: 1.2,
    rotations: {
      Hips: rotation(1, 3, -2), Spine: rotation(3, -1, 1), Spine1: rotation(5, -2, -1),
      LeftArm: rotation(-15, -7, 31), RightArm: rotation(-21, 5, -18),
      LeftForeArm: rotation(0, -10, -74), RightForeArm: rotation(0, 8, 54),
      LeftUpLeg: rotation(36, -3, 6), RightUpLeg: rotation(12, 3, -5),
      LeftLeg: rotation(-74), RightLeg: rotation(-42), LeftFoot: rotation(-8), RightFoot: rotation(-16),
    },
    positions: { Hips: [0.012, -0.008, -0.004] },
  },
  {
    time: 1.8,
    rotations: {
      Hips: rotation(-1, -2, 2), Spine: rotation(2, 1, -1), Spine1: rotation(4, 2, 1),
      LeftArm: rotation(-18, -7, 25), RightArm: rotation(-18, 8, -25),
      LeftForeArm: rotation(0, -9, -64), RightForeArm: rotation(0, 9, 64),
      LeftUpLeg: rotation(12, -4, 5), RightUpLeg: rotation(34, 4, -6),
      LeftLeg: rotation(-42), RightLeg: rotation(-72), LeftFoot: rotation(-15), RightFoot: rotation(-8),
    },
    positions: { Hips: [-0.012, 0.014, 0.004] },
  },
];

export const SWIMMING_RECIPES: readonly ClipRecipe[] = [
  { id: 'surface-swim', basePose: 'relaxed', frames: surfaceSwimFrames },
  { id: 'tread-water', basePose: 'relaxed', frames: [...treadWaterFrames, { ...treadWaterFrames[0]!, time: 2.4 }] },
];
