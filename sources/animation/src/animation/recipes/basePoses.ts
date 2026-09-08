import type { BasePoseId, Vec3 } from './types';
import { rotation } from './types';

export interface BasePose {
  readonly rotations: Readonly<Record<string, Vec3>>;
  readonly positions: Readonly<Record<string, Vec3>>;
}

const relaxed: BasePose = {
  rotations: {
    Hips: rotation(0, 1.5, -1.1),
    Spine: rotation(-1.2, -0.8, 0.55),
    Spine1: rotation(1.7, 0.55, -0.75),
    Spine2: rotation(-0.4, -1.25, 0.4),
    Neck: rotation(0.25, 0.55, -0.15),
    Head: rotation(-0.2, 1.15, -0.2),
    LeftShoulder: rotation(0.4, 0, -1.6),
    RightShoulder: rotation(0.2, 0, 1.35),
    LeftArm: rotation(-23.5, -2, 6.8),
    RightArm: rotation(-24.5, 3, -7.8),
    LeftForeArm: rotation(0, -4, -6),
    RightForeArm: rotation(0, 4, 7),
    LeftHand: rotation(0, 1.5, -1),
    RightHand: rotation(0, -1.2, 1.4),
    LeftUpLeg: rotation(3, -0.5, 1.2),
    RightUpLeg: rotation(4.4, 0.6, -1.1),
    LeftLeg: rotation(-6.5),
    RightLeg: rotation(-9),
    LeftFoot: rotation(2),
    RightFoot: rotation(2.8),
  },
  positions: { Hips: [-0.012, -0.018, 0] },
};

const combat: BasePose = {
  rotations: {
    Hips: rotation(0, -5, -2.4),
    Spine: rotation(2.5, 2, 1.2),
    Spine1: rotation(4, 4, -1.4),
    Spine2: rotation(-1, 5, 0.7),
    Neck: rotation(-1, -2, 0),
    Head: rotation(-1, -4, 0.4),
    LeftShoulder: rotation(0, -2, -2.5),
    RightShoulder: rotation(0, 2, 2.5),
    LeftArm: rotation(-22, -7, 17),
    RightArm: rotation(-18, 9, -22),
    LeftForeArm: rotation(0, -8, -58),
    RightForeArm: rotation(0, 8, 64),
    LeftHand: rotation(3, 4, -2),
    RightHand: rotation(-2, -5, 2),
    LeftUpLeg: rotation(12, -3, 3),
    RightUpLeg: rotation(18, 4, -3),
    LeftLeg: rotation(-24),
    RightLeg: rotation(-36),
    LeftFoot: rotation(5),
    RightFoot: rotation(7),
  },
  positions: { Hips: [-0.025, -0.065, -0.028] },
};

const airborne: BasePose = {
  rotations: {
    ...relaxed.rotations,
    Hips: rotation(-2, 1, -0.8),
    Spine: rotation(1, -0.5, 0.4),
    Spine1: rotation(2.5, 0.4, -0.5),
    LeftUpLeg: rotation(22, -1, 2),
    RightUpLeg: rotation(29, 2, -2),
    LeftLeg: rotation(-43),
    RightLeg: rotation(-54),
    LeftFoot: rotation(-3),
    RightFoot: rotation(2),
    LeftArm: rotation(-10, 0, 12),
    RightArm: rotation(-14, 0, -10),
    LeftForeArm: rotation(0, -6, -24),
    RightForeArm: rotation(0, 6, 29),
  },
  positions: { Hips: [0, 0.32, 0.012] },
};

export const BASE_POSES: Readonly<Record<BasePoseId, BasePose>> = { relaxed, combat, airborne };
