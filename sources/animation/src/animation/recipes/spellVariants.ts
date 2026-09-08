import { SPELL_MOTIONS } from '../spellMotion';
import type { ClipRecipe, PoseFrame } from './types';
import { rotation } from './types';

interface CastingShape {
  readonly crouch: number;
  readonly hipShift?: number;
  readonly hipBack?: number;
  readonly hipYaw?: number;
  readonly torsoLean?: number;
  readonly torsoYaw?: number;
  readonly leftKnee?: number;
  readonly rightKnee?: number;
  readonly leftArm: number;
  readonly rightArm: number;
  readonly leftElbow: number;
  readonly rightElbow: number;
  readonly armSpread?: number;
}

/** A grounded casting pose. Arm elevation uses the rig's mirrored local Z axes. */
function castingFrame(time: number, shape: CastingShape): PoseFrame {
  const lean = shape.torsoLean ?? 3;
  const yaw = shape.torsoYaw ?? 0;
  const leftKnee = shape.leftKnee ?? 32;
  const rightKnee = shape.rightKnee ?? 38;
  const spread = shape.armSpread ?? 0;
  return {
    time,
    rotations: {
      Hips: rotation(2, shape.hipYaw ?? 0, -1.5),
      Spine: rotation(lean * 0.3, yaw * 0.25, 0.6),
      Spine1: rotation(lean * 0.45, yaw * 0.4, -0.8),
      Spine2: rotation(lean * 0.25, yaw * 0.35, 0.3),
      Neck: rotation(-lean * 0.42, -yaw * 0.18, 0),
      Head: rotation(-lean * 0.22, -yaw * 0.2, 0),
      LeftUpLeg: rotation(leftKnee * 0.48, -3, 3),
      RightUpLeg: rotation(rightKnee * 0.48, 4, -3),
      LeftLeg: rotation(-leftKnee),
      RightLeg: rotation(-rightKnee),
      LeftFoot: rotation(leftKnee * 0.16, 0, -2),
      RightFoot: rotation(rightKnee * 0.16, 0, 2),
      LeftShoulder: rotation(0, -2, -2),
      RightShoulder: rotation(0, 2, 2),
      LeftArm: rotation(-22, -5 - spread, -shape.leftArm),
      RightArm: rotation(-22, 5 + spread, shape.rightArm),
      LeftForeArm: rotation(0, -7, -shape.leftElbow),
      RightForeArm: rotation(0, 7, shape.rightElbow),
      LeftHand: rotation(1, 4, -3),
      RightHand: rotation(-1, -4, 3),
    },
    positions: {
      Hips: [shape.hipShift ?? 0, -shape.crouch, shape.hipBack ?? -0.02],
    },
  };
}

const fireball: ClipRecipe = {
  id: 'fireball',
  basePose: 'combat',
  frames: [
    { time: 0 },
    castingFrame(0.12, { crouch: 0.085, hipShift: 0.025, hipBack: -0.05, hipYaw: -8,
      torsoLean: 5, torsoYaw: 5, leftKnee: 39, rightKnee: 52,
      leftArm: 18, rightArm: 18, leftElbow: 72, rightElbow: 72 }),
    castingFrame(SPELL_MOTIONS.fireball.gather, { crouch: 0.105, hipShift: 0.035, hipBack: -0.065, hipYaw: -11,
      torsoLean: 7, torsoYaw: 7, leftKnee: 44, rightKnee: 61,
      leftArm: 25, rightArm: 25, leftElbow: 78, rightElbow: 78 }),
    castingFrame(0.5, { crouch: 0.1, hipShift: 0.025, hipBack: -0.055, hipYaw: -5,
      torsoLean: 6, torsoYaw: 3, leftKnee: 42, rightKnee: 57,
      leftArm: 43, rightArm: 43, leftElbow: 68, rightElbow: 68 }),
    castingFrame(SPELL_MOTIONS.fireball.release[0]!, { crouch: 0.075, hipShift: -0.005, hipBack: 0.025, hipYaw: 8,
      torsoLean: 11, torsoYaw: -5, leftKnee: 35, rightKnee: 45,
      leftArm: 52, rightArm: 52, leftElbow: 23, rightElbow: 23 }),
    castingFrame(0.9, { crouch: 0.07, hipShift: -0.01, hipBack: 0.035, hipYaw: 7,
      torsoLean: 9, torsoYaw: -4, leftKnee: 33, rightKnee: 43,
      leftArm: 48, rightArm: 48, leftElbow: 18, rightElbow: 18 }),
    castingFrame(SPELL_MOTIONS.fireball.recover, { crouch: 0.08, hipShift: 0.01, hipBack: -0.015,
      torsoLean: 5, leftKnee: 34, rightKnee: 45,
      leftArm: 25, rightArm: 25, leftElbow: 58, rightElbow: 58 }),
    { time: SPELL_MOTIONS.fireball.duration },
  ],
};

const lightning: ClipRecipe = {
  id: 'lightning',
  basePose: 'combat',
  frames: [
    { time: 0 },
    castingFrame(SPELL_MOTIONS.lightning.gather, { crouch: 0.09, hipBack: -0.035,
      torsoLean: 2, leftKnee: 43, rightKnee: 49,
      leftArm: 58, rightArm: 58, leftElbow: 56, rightElbow: 56, armSpread: 4 }),
    castingFrame(0.48, { crouch: 0.1, hipBack: -0.04,
      torsoLean: -3, leftKnee: 46, rightKnee: 52,
      leftArm: 132, rightArm: 132, leftElbow: 26, rightElbow: 26, armSpread: 2 }),
    castingFrame(0.62, { crouch: 0.09, hipBack: -0.025,
      torsoLean: -1, leftKnee: 42, rightKnee: 48,
      leftArm: 142, rightArm: 142, leftElbow: 20, rightElbow: 20 }),
    castingFrame(SPELL_MOTIONS.lightning.release[0]!, { crouch: 0.11, hipBack: 0.025,
      torsoLean: 12, leftKnee: 51, rightKnee: 58,
      leftArm: 44, rightArm: 44, leftElbow: 24, rightElbow: 24 }),
    castingFrame(0.94, { crouch: 0.105, hipBack: 0.02,
      torsoLean: 10, leftKnee: 49, rightKnee: 56,
      leftArm: 39, rightArm: 39, leftElbow: 20, rightElbow: 20 }),
    castingFrame(SPELL_MOTIONS.lightning.recover, { crouch: 0.085, hipBack: -0.01,
      torsoLean: 5, leftKnee: 37, rightKnee: 45,
      leftArm: 29, rightArm: 29, leftElbow: 58, rightElbow: 58 }),
    { time: SPELL_MOTIONS.lightning.duration },
  ],
};

const missiles: ClipRecipe = {
  id: 'energy-missiles',
  basePose: 'combat',
  sampleRate: 120,
  frames: [
    { time: 0 },
    castingFrame(SPELL_MOTIONS['energy-missiles'].gather, { crouch: 0.09, hipBack: -0.035,
      torsoLean: 7, leftKnee: 43, rightKnee: 51,
      leftArm: 31, rightArm: 31, leftElbow: 82, rightElbow: 82 }),
    castingFrame(SPELL_MOTIONS['energy-missiles'].release[0]!, { crouch: 0.085, hipShift: -0.018, hipBack: 0.01,
      hipYaw: 10, torsoLean: 9, torsoYaw: 12, leftKnee: 39, rightKnee: 47,
      leftArm: 28, rightArm: 50, leftElbow: 76, rightElbow: 18 }),
    castingFrame(0.51, { crouch: 0.09, hipBack: -0.025,
      torsoLean: 7, leftKnee: 44, rightKnee: 49,
      leftArm: 31, rightArm: 29, leftElbow: 80, rightElbow: 72 }),
    castingFrame(SPELL_MOTIONS['energy-missiles'].release[1]!, { crouch: 0.085, hipShift: 0.018, hipBack: 0.01,
      hipYaw: -10, torsoLean: 9, torsoYaw: -12, leftKnee: 40, rightKnee: 46,
      leftArm: 50, rightArm: 28, leftElbow: 18, rightElbow: 76 }),
    castingFrame(0.68, { crouch: 0.09, hipBack: -0.025,
      torsoLean: 7, leftKnee: 42, rightKnee: 51,
      leftArm: 29, rightArm: 31, leftElbow: 72, rightElbow: 80 }),
    castingFrame(SPELL_MOTIONS['energy-missiles'].release[2]!, { crouch: 0.075, hipShift: -0.02, hipBack: 0.02,
      hipYaw: 12, torsoLean: 11, torsoYaw: 14, leftKnee: 38, rightKnee: 45,
      leftArm: 27, rightArm: 54, leftElbow: 78, rightElbow: 14 }),
    castingFrame(SPELL_MOTIONS['energy-missiles'].recover, { crouch: 0.085, hipBack: -0.01,
      torsoLean: 5, leftKnee: 38, rightKnee: 46,
      leftArm: 26, rightArm: 27, leftElbow: 61, rightElbow: 63 }),
    { time: SPELL_MOTIONS['energy-missiles'].duration },
  ],
};

const healing: ClipRecipe = {
  id: 'healing',
  basePose: 'combat',
  frames: [
    { time: 0 },
    castingFrame(SPELL_MOTIONS.healing.gather, { crouch: 0.075, hipBack: -0.02,
      torsoLean: 1, leftKnee: 34, rightKnee: 42,
      leftArm: 76, rightArm: 76, leftElbow: 45, rightElbow: 45, armSpread: 12 }),
    castingFrame(0.58, { crouch: 0.065, hipBack: -0.015,
      torsoLean: -2, leftKnee: 31, rightKnee: 39,
      leftArm: 116, rightArm: 116, leftElbow: 34, rightElbow: 34, armSpread: 10 }),
    castingFrame(0.82, { crouch: 0.085, hipBack: -0.02,
      torsoLean: 3, leftKnee: 37, rightKnee: 44,
      leftArm: 42, rightArm: 42, leftElbow: 98, rightElbow: 98 }),
    castingFrame(SPELL_MOTIONS.healing.release[0]!, { crouch: 0.07, hipBack: 0.005,
      torsoLean: 4, leftKnee: 34, rightKnee: 41,
      leftArm: 52, rightArm: 52, leftElbow: 34, rightElbow: 34, armSpread: 16 }),
    castingFrame(1.25, { crouch: 0.07, hipBack: 0.005,
      torsoLean: 3, leftKnee: 34, rightKnee: 41,
      leftArm: 48, rightArm: 48, leftElbow: 38, rightElbow: 38, armSpread: 18 }),
    castingFrame(SPELL_MOTIONS.healing.recover, { crouch: 0.075, hipBack: -0.01,
      torsoLean: 2, leftKnee: 35, rightKnee: 42,
      leftArm: 31, rightArm: 31, leftElbow: 61, rightElbow: 61, armSpread: 6 }),
    { time: SPELL_MOTIONS.healing.duration },
  ],
};

export const ELEMENTAL_SPELL_RECIPES: readonly ClipRecipe[] = [fireball, lightning, missiles, healing];
