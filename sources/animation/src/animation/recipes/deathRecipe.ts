import type { ClipRecipe } from './types';
import { rotation } from './types';

/**
 * One blow, then the floor. The chest is thrown back first, the knees give
 * under the weight, the pelvis rides down and back until the seat lands, the
 * spine unrolls onto the ground, and the head is the last thing to arrive.
 *
 * Axis notes measured on this rig, not assumed: the character faces +Z, Hips
 * local rotation X is a forward pitch so a backward fall is negative, and Hips
 * local position maps one to one onto world XYZ with the pelvis resting at
 * y = 0.88. The final frame repeats the one before it so the clip clamps on a
 * settled pose instead of easing on after the body has stopped.
 */
export const DEATH_RECIPE: ClipRecipe = {
  id: 'die',
  basePose: 'relaxed',
  frames: [
    { time: 0 },
    {
      // The hit lands. Everything above the belt is thrown backward at once.
      time: 0.07,
      rotations: {
        Hips: rotation(-8, 1, 2), Spine: rotation(-6, 1, -1), Spine1: rotation(-7, 1, 1.5),
        Spine2: rotation(-4, 1, 0.5), Neck: rotation(-9, -1, 0), Head: rotation(-13, -2, 0),
        LeftShoulder: rotation(1, 0, -3), RightShoulder: rotation(1, 0, 2.5),
        LeftArm: rotation(-19, -3, -21), RightArm: rotation(-20, 4, 23),
        LeftForeArm: rotation(0, -5, -26), RightForeArm: rotation(0, 5, 29),
        LeftUpLeg: rotation(-4, -1, 2), RightUpLeg: rotation(-3, 1, -2),
        LeftLeg: rotation(-5), RightLeg: rotation(-7), LeftFoot: rotation(6), RightFoot: rotation(7),
      },
      positions: { Hips: [0.004, -0.008, -0.05] },
    },
    {
      // Weight rolls onto the heels and the recoil reaches its limit.
      time: 0.17,
      rotations: {
        Hips: rotation(-12, 2, 3.5), Spine: rotation(-8, 2, -1.6), Spine1: rotation(-10, 2, 2.4),
        Spine2: rotation(-6, 1, 0.8), Neck: rotation(-4, -2, 0.5), Head: rotation(-6, -3, 0.5),
        LeftArm: rotation(-17, -3, -33), RightArm: rotation(-18, 4, 35),
        LeftForeArm: rotation(0, -6, -41), RightForeArm: rotation(0, 6, 45),
        LeftUpLeg: rotation(-7, -1, 3), RightUpLeg: rotation(-6, 1, -3),
        LeftLeg: rotation(-7), RightLeg: rotation(-9), LeftFoot: rotation(9), RightFoot: rotation(10),
      },
      positions: { Hips: [0.008, -0.02, -0.096] },
    },
    {
      // The knees give. The pelvis folds forward while it drops.
      time: 0.32,
      rotations: {
        Hips: rotation(4, 3, 4), Spine: rotation(3, 2, -2), Spine1: rotation(6, 2, 3),
        Spine2: rotation(4, 1, 1), Neck: rotation(6, -2, 0.5), Head: rotation(9, -3, 0.5),
        LeftArm: rotation(-14, -3, -38), RightArm: rotation(-15, 4, 40),
        LeftForeArm: rotation(0, -7, -52), RightForeArm: rotation(0, 7, 56),
        LeftUpLeg: rotation(46.1, -2, 5), RightUpLeg: rotation(47.1, 2, -4),
        LeftLeg: rotation(-74.1), RightLeg: rotation(-77.6), LeftFoot: rotation(24.2), RightFoot: rotation(27.5),
      },
      positions: { Hips: [0.012, -0.17, -0.145] },
    },
    {
      // Nothing is holding the body up any more.
      time: 0.47,
      rotations: {
        Hips: rotation(-7, 3, 4), Spine: rotation(6, 2, -2), Spine1: rotation(9, 2, 3),
        Spine2: rotation(6, 1, 1), Neck: rotation(11, -2, 0.5), Head: rotation(15, -3, 0.5),
        LeftArm: rotation(-8, -3, -24), RightArm: rotation(-9, 4, 26),
        LeftForeArm: rotation(0, -8, -46), RightForeArm: rotation(0, 8, 50),
        LeftUpLeg: rotation(75.9, -3, 7), RightUpLeg: rotation(76.3, 3, -6),
        LeftLeg: rotation(-117.6), RightLeg: rotation(-119.6), LeftFoot: rotation(27.4), RightFoot: rotation(29.6),
      },
      positions: { Hips: [0.016, -0.4, -0.206] },
    },
    {
      // The seat reaches the ground and the legs give up their fold.
      time: 0.63,
      rotations: {
        Hips: rotation(-33, 3, 3.5), Spine: rotation(9, 2, -1.8), Spine1: rotation(12, 2, 2.6),
        Spine2: rotation(8, 1, 0.9), Neck: rotation(14, -2, 0.5), Head: rotation(19, -3, 0.5),
        LeftArm: rotation(-4, -3, -10), RightArm: rotation(-5, 4, 12),
        LeftForeArm: rotation(0, -8, -38), RightForeArm: rotation(0, 8, 41),
        LeftUpLeg: rotation(99.4, -4, 9), RightUpLeg: rotation(100, 4, -8),
        LeftLeg: rotation(-127.7), RightLeg: rotation(-129.3), LeftFoot: rotation(12), RightFoot: rotation(11),
      },
      positions: { Hips: [0.02, -0.62, -0.262] },
    },
    {
      // The back unrolls onto the floor, one vertebra at a time.
      time: 0.81,
      rotations: {
        Hips: rotation(-62, 2, 2.5), Spine: rotation(8, 1, -1.2), Spine1: rotation(10, 1, 1.8),
        Spine2: rotation(6, 1, 0.6), Neck: rotation(17, -2, 0.5), Head: rotation(22, -2, 0.5),
        LeftArm: rotation(2, -3, -2), RightArm: rotation(1, 4, 4),
        LeftForeArm: rotation(0, -8, -29), RightForeArm: rotation(0, 8, 32),
        LeftUpLeg: rotation(56.3, -5, 11), RightUpLeg: rotation(52.5, 5, -10),
        LeftLeg: rotation(-64.1), RightLeg: rotation(-57.5), LeftFoot: rotation(0), RightFoot: rotation(-2),
      },
      positions: { Hips: [0.022, -0.712, -0.298] },
    },
    {
      // The shoulders land. The head is still held off the ground.
      time: 0.99,
      rotations: {
        Hips: rotation(-84, 1, 1.5), Spine: rotation(4, 1, -0.7), Spine1: rotation(5, 1, 1),
        Spine2: rotation(3, 0, 0.3), Neck: rotation(18, -1, 0.5), Head: rotation(23, -2, 0.5),
        LeftArm: rotation(6, -3, 3), RightArm: rotation(5, 4, -2),
        LeftForeArm: rotation(0, -7, -20), RightForeArm: rotation(0, 7, 22),
        LeftUpLeg: rotation(29.2, -6, 12), RightUpLeg: rotation(29.5, 6, -11),
        LeftLeg: rotation(-49.5), RightLeg: rotation(-51.1), LeftFoot: rotation(-12), RightFoot: rotation(-14),
      },
      positions: { Hips: [0.022, -0.737, -0.311] },
    },
    {
      // The head is the last thing to arrive, and it arrives hard.
      time: 1.15,
      rotations: {
        Hips: rotation(-89, 0.5, 0.8), Spine: rotation(1.5, 0.5, -0.3), Spine1: rotation(2, 0.5, 0.4),
        Spine2: rotation(1, 0, 0.1), Neck: rotation(-4, -1, 0.5), Head: rotation(-7, -2, 0.5),
        LeftArm: rotation(8, -3, 6), RightArm: rotation(7, 4, -5),
        LeftForeArm: rotation(0, -6, -15), RightForeArm: rotation(0, 6, 17),
        LeftUpLeg: rotation(14.7, -7, 13), RightUpLeg: rotation(14.2, 7, -12),
        LeftLeg: rotation(-30.4), RightLeg: rotation(-30.4), LeftFoot: rotation(-22), RightFoot: rotation(-24),
      },
      positions: { Hips: [0.021, -0.743, -0.314] },
    },
    {
      // The last of the motion runs out through the hands and the ankles.
      time: 1.3,
      rotations: {
        Hips: rotation(-90, 0.3, 0.5), Spine: rotation(0.6, 0.3, -0.1), Spine1: rotation(0.8, 0.3, 0.2),
        Spine2: rotation(0.4, 0, 0), Neck: rotation(-2, -1, 0.5), Head: rotation(-3, -2, 0.5),
        LeftArm: rotation(10, -3, 7), RightArm: rotation(9, 4, -6),
        LeftForeArm: rotation(0, -5, -12), RightForeArm: rotation(0, 5, 14),
        LeftHand: rotation(0, 2, -6), RightHand: rotation(0, -2, 7),
        LeftUpLeg: rotation(11.3, -8, 14), RightUpLeg: rotation(10.6, 8, -13),
        LeftLeg: rotation(-25.5), RightLeg: rotation(-24.8), LeftFoot: rotation(-27), RightFoot: rotation(-29),
      },
      positions: { Hips: [0.021, -0.744, -0.315] },
    },
    {
      // Still. The clip clamps here.
      time: 1.4,
      rotations: {
        Hips: rotation(-90, 0.3, 0.5), Spine: rotation(0.6, 0.3, -0.1), Spine1: rotation(0.8, 0.3, 0.2),
        Spine2: rotation(0.4, 0, 0), Neck: rotation(-2, -1, 0.5), Head: rotation(-3, -2, 0.5),
        LeftArm: rotation(10, -3, 7), RightArm: rotation(9, 4, -6),
        LeftForeArm: rotation(0, -5, -12), RightForeArm: rotation(0, 5, 14),
        LeftHand: rotation(0, 2, -6), RightHand: rotation(0, -2, 7),
        LeftUpLeg: rotation(11.3, -8, 14), RightUpLeg: rotation(10.6, 8, -13),
        LeftLeg: rotation(-25.5), RightLeg: rotation(-24.8), LeftFoot: rotation(-27), RightFoot: rotation(-29),
      },
      positions: { Hips: [0.021, -0.744, -0.315] },
    },
  ],
};
