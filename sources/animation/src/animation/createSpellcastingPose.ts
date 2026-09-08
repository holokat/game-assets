import * as THREE from 'three';
import { sampleSpellHandLocalPositions, spellHandInfluence } from './spellcastingMotion';
import type { MoveId } from './types';
import { createTwoHandedGripConstraint } from './createTwoHandedGripConstraint';

export interface SpellcastingPoseOptions {
  readonly actor: THREE.Object3D;
  readonly leftArm: THREE.Object3D;
  readonly leftForearm: THREE.Object3D;
  readonly leftHand: THREE.Object3D;
  readonly rightArm: THREE.Object3D;
  readonly rightForearm: THREE.Object3D;
  readonly rightHand: THREE.Object3D;
}

export interface SpellcastingPose {
  update(move: MoveId, normalizedTime: number): void;
}

export function createSpellcastingPose(options: SpellcastingPoseOptions): SpellcastingPose {
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
  let previousTime = -1;

  function prepareTarget(
    contact: THREE.Object3D,
    desired: THREE.Vector3,
    targetObject: THREE.Object3D,
    influence: number,
  ): void {
    contact.getWorldPosition(currentTarget);
    options.actor.worldToLocal(currentTarget);
    desired.lerpVectors(currentTarget, desired, influence).applyMatrix4(options.actor.matrixWorld);
    targetObject.position.copy(desired);
    targetObject.updateWorldMatrix(true, true);
  }

  return {
    update(move, normalizedTime) {
      if (move !== 'cast') {
        previousTime = -1;
        return;
      }
      const time = THREE.MathUtils.clamp(normalizedTime, 0, 1);
      if (Math.abs(time - previousTime) < 0.0000001) {
        controlledBones.forEach((bone, index) => bone.quaternion.copy(authoredQuaternions[index]!));
        options.actor.updateWorldMatrix(true, true);
      } else {
        controlledBones.forEach((bone, index) => authoredQuaternions[index]!.copy(bone.quaternion));
        previousTime = time;
      }

      options.actor.updateWorldMatrix(true, true);
      sampleSpellHandLocalPositions(time, leftTarget, rightTarget);
      const influence = spellHandInfluence(time);
      prepareTarget(leftContact, leftTarget, leftTargetObject, influence);
      prepareTarget(rightContact, rightTarget, rightTargetObject, influence);
      solveLeft.update(true, 0);
      solveRight.update(true, 0);
    },
  };
}
