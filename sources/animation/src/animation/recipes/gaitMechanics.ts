import type { Vec3 } from './types';
import { rotation } from './types';

type RotationSet = Readonly<Record<string, Vec3>>;

/**
 * The arm bones are mirrored in the source rig, so matching local Z deltas
 * produce reciprocal forward and backward motion in world space.
 */
export function relaxedWalkArms(
  swingDegrees: number,
  elbowFlexDegrees: number,
  shoulderLiftDegrees: number,
): RotationSet {
  return {
    LeftShoulder: rotation(0.4 + shoulderLiftDegrees, 0, -1.6),
    RightShoulder: rotation(0.2 + shoulderLiftDegrees, 0, 1.35),
    LeftArm: rotation(-23.5, -2, swingDegrees),
    RightArm: rotation(-24.5, 3, swingDegrees),
    LeftForeArm: rotation(0, -6, -elbowFlexDegrees),
    RightForeArm: rotation(0, 6, elbowFlexDegrees),
  };
}

export function compactRunArms(
  swingDegrees: number,
  elbowFlexDegrees = 56,
  shoulderLiftDegrees = 0,
): RotationSet {
  return {
    LeftShoulder: rotation(shoulderLiftDegrees, 0, -1.5),
    RightShoulder: rotation(shoulderLiftDegrees, 0, 1.5),
    LeftArm: rotation(-22, -2, swingDegrees),
    RightArm: rotation(-22, 3, swingDegrees),
    LeftForeArm: rotation(0, -8, -elbowFlexDegrees),
    RightForeArm: rotation(0, 9, elbowFlexDegrees),
  };
}
