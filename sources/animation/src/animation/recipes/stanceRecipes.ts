import type { ClipRecipe } from './types';
import { rotation } from './types';

export const STANCE_RECIPES: readonly ClipRecipe[] = [
  {
    id: 'idle',
    basePose: 'relaxed',
    frames: [
      { time: 0 },
      {
        time: 0.7,
        rotations: {
          Spine1: rotation(2.15, 0.4, -0.9), Spine2: rotation(-0.25, -1, 0.45),
          LeftShoulder: rotation(0.1, 0, -1.35), RightShoulder: rotation(-0.1, 0, 0.65),
          Head: rotation(-0.1, 1.7, -0.2),
        },
        positions: { Hips: [-0.014, -0.013, -0.002] },
      },
      {
        time: 1.42,
        rotations: {
          Hips: rotation(0, 0.8, -1.8), Spine: rotation(-0.8, -0.3, 1),
          Spine1: rotation(1.55, 0.9, -1.2), Spine2: rotation(-0.1, -0.6, 0.7),
          LeftUpLeg: rotation(2, -0.5, 1.8), RightUpLeg: rotation(5.2, 0.7, -1.5),
          LeftLeg: rotation(-5.5), RightLeg: rotation(-10.5), Head: rotation(0.2, 2.4, -0.25),
        },
        positions: { Hips: [-0.022, -0.02, -0.004] },
      },
      {
        time: 2.1,
        rotations: {
          RightUpLeg: rotation(7, 0.8, -1.7), RightLeg: rotation(-13), RightFoot: rotation(4.8),
          RightArm: rotation(-23.5, 3, -7.2), RightForeArm: rotation(0, 4, 8),
          Head: rotation(-0.3, 0.4, 0.1),
        },
        positions: { Hips: [-0.024, -0.027, 0] },
      },
      {
        time: 2.72,
        rotations: {
          Hips: rotation(0, 1.4, -0.8), Spine: rotation(-1, -0.6, 0.4),
          Spine1: rotation(1.8, 0.5, -0.6), Head: rotation(-0.1, -1.1, 0.1),
        },
        positions: { Hips: [-0.008, -0.016, 0.002] },
      },
      {
        time: 3.42,
        rotations: {
          Hips: rotation(0, 2, 0.45), Spine: rotation(-1.4, -1, -0.25),
          Spine1: rotation(2.2, 0.2, 0.35), Spine2: rotation(-0.7, -1.5, -0.15),
          LeftUpLeg: rotation(5.1, -0.7, 0.6), RightUpLeg: rotation(3.4, 0.4, -0.4),
          LeftLeg: rotation(-9.5), RightLeg: rotation(-7.2), Head: rotation(0.25, -2.2, 0.2),
        },
        positions: { Hips: [0.008, -0.014, 0.004] },
      },
      {
        time: 4.1,
        rotations: {
          LeftUpLeg: rotation(7, -0.6, 0.4), LeftLeg: rotation(-13), LeftFoot: rotation(4.5),
          LeftArm: rotation(-22.5, -2, 6.1), LeftForeArm: rotation(0, -4, -7),
          Head: rotation(-0.15, -0.7, -0.1),
        },
        positions: { Hips: [0.015, -0.025, 0] },
      },
      {
        time: 4.82,
        rotations: {
          Hips: rotation(0, 1.4, -0.6), Spine1: rotation(2.3, 0.3, -0.55),
          Spine2: rotation(-0.65, -1, 0.25), Head: rotation(0, 0.5, -0.1),
        },
        positions: { Hips: [0, -0.012, -0.002] },
      },
      { time: 5.6 },
    ],
  },
  {
    id: 'combat-idle',
    basePose: 'combat',
    frames: [
      { time: 0 },
      {
        time: 0.48,
        rotations: {
          Hips: rotation(0, -4, -2.8), Spine1: rotation(4.8, 3.4, -1.7),
          Spine2: rotation(-0.6, 4.3, 0.9), LeftForeArm: rotation(0, -8, -61),
          RightForeArm: rotation(0, 8, 66), Head: rotation(-0.8, -3, 0.2),
        },
        positions: { Hips: [-0.03, -0.058, -0.025] },
      },
      {
        time: 1.06,
        rotations: {
          Hips: rotation(0, -7, -1.8), Spine: rotation(2, 3.2, 0.8),
          Spine1: rotation(3.6, 5, -1.1), LeftUpLeg: rotation(10, -3, 3.5),
          RightUpLeg: rotation(20, 4, -3.5), LeftLeg: rotation(-21), RightLeg: rotation(-40),
          LeftArm: rotation(-21, -7, 18), RightArm: rotation(-19, 9, -23), Head: rotation(-1.2, -5, 0.5),
        },
        positions: { Hips: [-0.034, -0.071, -0.031] },
      },
      {
        time: 1.72,
        rotations: {
          Hips: rotation(0, -3, -2), Spine: rotation(2.7, 1.1, 1),
          Spine1: rotation(4.5, 3, -1.4), Spine2: rotation(-1.2, 4, 0.6),
          LeftForeArm: rotation(0, -8, -56), RightForeArm: rotation(0, 8, 62),
          Head: rotation(-0.7, -2, 0.15),
        },
        positions: { Hips: [-0.019, -0.061, -0.024] },
      },
      {
        time: 2.28,
        rotations: {
          Hips: rotation(0, -6, -2.7), Spine1: rotation(4.1, 4.4, -1.8),
          Spine2: rotation(-0.8, 5.1, 0.9), LeftUpLeg: rotation(13, -3, 2.6),
          RightUpLeg: rotation(17, 4, -2.7), LeftLeg: rotation(-26), RightLeg: rotation(-34),
          Head: rotation(-1.2, -4.6, 0.45),
        },
        positions: { Hips: [-0.029, -0.068, -0.032] },
      },
      { time: 2.8 },
    ],
  },
  {
    id: 'idle-shift',
    basePose: 'relaxed',
    frames: [
      { time: 0 },
      {
        time: 0.38,
        rotations: {
          Hips: rotation(0, 0, -2.2), Spine: rotation(-0.6, 0, 1.2),
          Spine1: rotation(1.2, 0, -1.3), LeftUpLeg: rotation(2, 0, 2),
          RightUpLeg: rotation(8, 0, -2), LeftLeg: rotation(-5), RightLeg: rotation(-15),
        },
        positions: { Hips: [-0.035, -0.03, -0.005] },
      },
      {
        time: 0.82,
        rotations: {
          Hips: rotation(0, -1, -3.1), Spine: rotation(-0.4, 1, 1.8),
          Spine1: rotation(1, 1, -2), Spine2: rotation(-0.2, 0, 0.8),
          RightUpLeg: rotation(11, 0, -2.6), RightLeg: rotation(-20), RightFoot: rotation(6),
          Head: rotation(0, 2.5, -0.6),
        },
        positions: { Hips: [-0.052, -0.041, -0.008] },
      },
      {
        time: 1.28,
        rotations: {
          Hips: rotation(0, 1.2, 1), Spine: rotation(-1.4, -1, -0.7),
          Spine1: rotation(2.1, -0.5, 0.9), LeftUpLeg: rotation(7, 0, 0.5),
          RightUpLeg: rotation(4, 0, -0.6), LeftLeg: rotation(-12), RightLeg: rotation(-8),
          Head: rotation(-0.2, -1.4, 0.25),
        },
        positions: { Hips: [0.018, -0.019, 0.004] },
      },
      {
        time: 1.78,
        rotations: {
          Hips: rotation(0, 1.8, 0.2), Spine1: rotation(2, 0.2, 0),
          Spine2: rotation(-0.6, -1.4, 0.1), Head: rotation(0, 0.2, 0),
        },
        positions: { Hips: [0.004, -0.012, 0] },
      },
      { time: 2.4 },
    ],
  },
  {
    id: 'idle-scan',
    basePose: 'relaxed',
    frames: [
      { time: 0 },
      { time: 0.5, rotations: { Head: rotation(-0.5, 8, -0.8), Neck: rotation(0, 3, -0.2) } },
      {
        time: 0.92,
        rotations: {
          Head: rotation(-1, 14, -1.1), Neck: rotation(0.5, 6, -0.4),
          Spine2: rotation(-0.4, 1.5, 0.3), RightShoulder: rotation(-0.5, 0, 1.3),
          RightForeArm: rotation(0, 4, 16), RightHand: rotation(-2, -4, 3),
        },
        positions: { Hips: [-0.016, -0.019, -0.002] },
      },
      {
        time: 1.42,
        rotations: {
          Head: rotation(0.4, -9, 0.5), Neck: rotation(0, -4, 0.2),
          Spine2: rotation(-0.4, -2.4, 0.4), LeftShoulder: rotation(0, 0, -1.7),
          LeftForeArm: rotation(0, -4, -13), LeftHand: rotation(2, 4, -2),
        },
        positions: { Hips: [-0.008, -0.016, 0.002] },
      },
      { time: 2.1, rotations: { Head: rotation(-0.2, 1.5, -0.2), Neck: rotation(0.2, 0.8, -0.1) } },
      { time: 2.9 },
    ],
  },
];
