import * as THREE from 'three';
import { createTwoHandedGripConstraint } from './createTwoHandedGripConstraint';
import { createMotionCurve } from './sampleMotionCurve';
import { isElementalSpell, SPELL_MOTIONS, type ElementalSpellId } from './spellMotion';
import type { MoveId } from './types';

type Point = readonly [number, number, number];

interface HandKey {
  readonly time: number;
  readonly left: Point;
  readonly right: Point;
}

interface HandPath {
  readonly times: readonly number[];
  readonly left: readonly ((time: number) => number)[];
  readonly right: readonly ((time: number) => number)[];
}

export interface ElementalSpellPoseOptions {
  readonly root: THREE.Object3D;
  readonly leftArm: THREE.Object3D;
  readonly leftForearm: THREE.Object3D;
  readonly leftHand: THREE.Object3D;
  readonly rightArm: THREE.Object3D;
  readonly rightForearm: THREE.Object3D;
  readonly rightHand: THREE.Object3D;
}

export interface ElementalSpellPose {
  update(move: MoveId, normalizedTime: number): void;
}

const HAND_KEYS: Readonly<Record<ElementalSpellId, readonly HandKey[]>> = {
  fireball: [
    { time: 0, left: [0.22, 1.12, 0.31], right: [-0.22, 1.12, 0.31] },
    { time: 0.24, left: [0.25, 1.08, 0.34], right: [-0.25, 1.08, 0.34] },
    { time: 0.5, left: [0.1, 1.22, 0.48], right: [-0.1, 1.22, 0.48] },
    { time: 0.78, left: [0.075, 1.25, 0.82], right: [-0.075, 1.25, 0.82] },
    { time: 0.9, left: [0.09, 1.23, 0.98], right: [-0.09, 1.23, 0.98] },
    { time: 1.04, left: [0.17, 1.16, 0.43], right: [-0.17, 1.16, 0.43] },
    { time: 1.35, left: [0.22, 1.12, 0.31], right: [-0.22, 1.12, 0.31] },
  ],
  lightning: [
    { time: 0, left: [0.22, 1.13, 0.31], right: [-0.22, 1.13, 0.31] },
    { time: 0.22, left: [0.28, 1.46, 0.35], right: [-0.28, 1.46, 0.35] },
    { time: 0.48, left: [0.19, 1.72, 0.3], right: [-0.19, 1.72, 0.3] },
    { time: 0.62, left: [0.14, 1.78, 0.27], right: [-0.14, 1.78, 0.27] },
    { time: 0.74, left: [0.13, 1.32, 0.76], right: [-0.13, 1.32, 0.76] },
    { time: 0.94, left: [0.14, 1.25, 0.86], right: [-0.14, 1.25, 0.86] },
    { time: 1.18, left: [0.19, 1.16, 0.42], right: [-0.19, 1.16, 0.42] },
    { time: 1.65, left: [0.22, 1.13, 0.31], right: [-0.22, 1.13, 0.31] },
  ],
  'energy-missiles': [
    { time: 0, left: [0.21, 1.14, 0.32], right: [-0.21, 1.14, 0.32] },
    { time: 0.18, left: [0.18, 1.25, 0.39], right: [-0.18, 1.25, 0.39] },
    { time: 0.43, left: [0.18, 1.22, 0.37], right: [-0.12, 1.27, 0.92] },
    { time: 0.51, left: [0.17, 1.24, 0.4], right: [-0.16, 1.23, 0.43] },
    { time: 0.6, left: [0.12, 1.27, 0.92], right: [-0.18, 1.22, 0.37] },
    { time: 0.68, left: [0.16, 1.23, 0.43], right: [-0.17, 1.24, 0.4] },
    { time: 0.77, left: [0.18, 1.21, 0.36], right: [-0.1, 1.28, 1] },
    { time: 0.9, left: [0.19, 1.17, 0.39], right: [-0.18, 1.17, 0.43] },
    { time: 1.1, left: [0.21, 1.14, 0.32], right: [-0.21, 1.14, 0.32] },
  ],
  healing: [
    { time: 0, left: [0.22, 1.13, 0.3], right: [-0.22, 1.13, 0.3] },
    { time: 0.28, left: [0.35, 1.4, 0.34], right: [-0.35, 1.4, 0.34] },
    { time: 0.58, left: [0.24, 1.66, 0.31], right: [-0.24, 1.66, 0.31] },
    { time: 0.82, left: [0.075, 1.3, 0.43], right: [-0.075, 1.3, 0.43] },
    { time: 1.08, left: [0.3, 1.36, 0.7], right: [-0.3, 1.36, 0.7] },
    { time: 1.25, left: [0.36, 1.34, 0.72], right: [-0.36, 1.34, 0.72] },
    { time: 1.42, left: [0.23, 1.19, 0.4], right: [-0.23, 1.19, 0.4] },
    { time: 1.8, left: [0.22, 1.13, 0.3], right: [-0.22, 1.13, 0.3] },
  ],
};

function curves(keys: readonly HandKey[], side: 'left' | 'right'): readonly ((time: number) => number)[] {
  const times = keys.map((key) => key.time);
  return [0, 1, 2].map((axis) => createMotionCurve(times, keys.map((key) => key[side][axis]!)));
}

const HAND_PATHS: Readonly<Record<ElementalSpellId, HandPath>> = Object.fromEntries(
  Object.entries(HAND_KEYS).map(([id, keys]) => [id, {
    times: keys.map((key) => key.time),
    left: curves(keys, 'left'),
    right: curves(keys, 'right'),
  }]),
) as unknown as Readonly<Record<ElementalSpellId, HandPath>>;

function sample(curvesForSide: readonly ((time: number) => number)[], time: number, target: THREE.Vector3): void {
  target.set(curvesForSide[0]!(time), curvesForSide[1]!(time), curvesForSide[2]!(time));
}

export function createElementalSpellPose(options: ElementalSpellPoseOptions): ElementalSpellPose {
  const leftContact = options.leftHand.getObjectByName('Socket_HandVFX_Left') ?? options.leftHand;
  const rightContact = options.rightHand.getObjectByName('Socket_HandVFX_Right') ?? options.rightHand;
  const leftTargetObject = new THREE.Object3D();
  const rightTargetObject = new THREE.Object3D();
  const solveLeft = createTwoHandedGripConstraint(
    options.leftArm, options.leftForearm, options.leftHand, leftContact, leftTargetObject,
  );
  const solveRight = createTwoHandedGripConstraint(
    options.rightArm, options.rightForearm, options.rightHand, rightContact, rightTargetObject,
  );
  const controlledBones = [options.leftArm, options.leftForearm, options.rightArm, options.rightForearm];
  const authoredQuaternions = controlledBones.map(() => new THREE.Quaternion());
  const leftTarget = new THREE.Vector3();
  const rightTarget = new THREE.Vector3();
  const currentTarget = new THREE.Vector3();
  let previousMove: ElementalSpellId | null = null;
  let previousTime = -1;

  function prepareTarget(
    contact: THREE.Object3D,
    desired: THREE.Vector3,
    targetObject: THREE.Object3D,
    influence: number,
  ): void {
    contact.getWorldPosition(currentTarget);
    options.root.worldToLocal(currentTarget);
    desired.lerpVectors(currentTarget, desired, influence).applyMatrix4(options.root.matrixWorld);
    targetObject.position.copy(desired);
    targetObject.updateWorldMatrix(true, true);
  }

  return {
    update(move, normalizedTime) {
      if (!isElementalSpell(move)) {
        previousMove = null;
        previousTime = -1;
        solveLeft.update(false);
        solveRight.update(false);
        return;
      }
      const motion = SPELL_MOTIONS[move];
      const time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * motion.duration;
      if (move === previousMove && Math.abs(time - previousTime) < 0.0000001) {
        controlledBones.forEach((bone, index) => bone.quaternion.copy(authoredQuaternions[index]!));
        options.root.updateWorldMatrix(true, true);
      } else {
        controlledBones.forEach((bone, index) => authoredQuaternions[index]!.copy(bone.quaternion));
        previousMove = move;
        previousTime = time;
      }

      const path = HAND_PATHS[move];
      sample(path.left, time, leftTarget);
      sample(path.right, time, rightTarget);
      const enter = THREE.MathUtils.smoothstep(time, 0.035, Math.min(0.13, motion.gather * 0.6));
      const exit = 1 - THREE.MathUtils.smoothstep(time, motion.recover, motion.duration - 0.02);
      const influence = enter * exit;
      options.root.updateWorldMatrix(true, true);
      prepareTarget(leftContact, leftTarget, leftTargetObject, influence);
      prepareTarget(rightContact, rightTarget, rightTargetObject, influence);
      solveLeft.update(true, 0);
      solveRight.update(true, 0);
    },
  };
}
