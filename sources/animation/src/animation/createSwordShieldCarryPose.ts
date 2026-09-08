import * as THREE from 'three';
import type { TrainingSword } from '../character/createTrainingSword';
import { createTwoHandedGripConstraint } from './createTwoHandedGripConstraint';
import { setBladeCutOrientation } from './setBladeCutOrientation';

/** Keeps equipment close while the imported clip supplies the legs and torso. */
export function createSwordShieldCarryPose(
  sword: TrainingSword,
  hips: THREE.Object3D,
  leftArm: THREE.Object3D,
  leftForearm: THREE.Object3D,
  leftHand: THREE.Object3D,
  leftContact: THREE.Object3D,
) {
  const hipPosition = new THREE.Vector3();
  const targetPosition = new THREE.Vector3();
  const startPosition = new THREE.Vector3();
  const startQuaternion = new THREE.Quaternion();
  const targetQuaternion = new THREE.Quaternion();
  const bladeDirection = new THREE.Vector3();
  // Roll the one-hand blade inward around its trailing axis. This keeps the
  // imported walk and sprint wrist below anatomical extension limits.
  const faceNormal = new THREE.Vector3(-.422618, -.906308, 0);
  const shieldTarget = new THREE.Object3D();
  const shieldHandPosition = new THREE.Vector3();
  const solveShield = createTwoHandedGripConstraint(leftArm, leftForearm, leftHand, leftContact, shieldTarget);
  let elapsed = 0;
  let active = false;

  return {
    reset() { active = false; solveShield.update(false); },
    update(phase: number, running: boolean, moving: boolean, delta?: number) {
      const parent = sword.root.parent;
      if (!parent) return;
      parent.updateWorldMatrix(true, true);
      hips.getWorldPosition(hipPosition);
      parent.worldToLocal(hipPosition);
      if (!active) {
        startPosition.copy(sword.root.position);
        startQuaternion.copy(sword.root.quaternion);
        elapsed = 0;
        active = true;
      }
      elapsed = delta === undefined ? .18 : Math.min(.18, elapsed + Math.max(0, delta));
      const blend = THREE.MathUtils.smoothstep(elapsed, 0, .18);
      const stride = moving ? Math.sin(phase * Math.PI * 2) : 0;
      targetPosition.set(hipPosition.x - .34, hipPosition.y + .015 + stride * .014,
        hipPosition.z - .10 + stride * (running ? .035 : .02));
      bladeDirection.set(-.10, .25 + stride * .025, -.86).normalize();
      setBladeCutOrientation(bladeDirection, faceNormal, targetQuaternion);
      sword.root.position.lerpVectors(startPosition, targetPosition, blend);
      sword.root.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, blend);
      sword.root.updateWorldMatrix(true, true);

      // Hold the shield ahead of the left ribs with a small stride response.
      // Its existing forearm attachment remains the equipment interface.
      leftContact.getWorldPosition(shieldHandPosition);
      targetPosition.set(hipPosition.x + .10, hipPosition.y + .18 + stride * .012,
        hipPosition.z + .42 - stride * .018).applyMatrix4(parent.matrixWorld);
      shieldTarget.position.lerpVectors(shieldHandPosition, targetPosition, blend);
      shieldTarget.updateWorldMatrix(true, false);
      solveShield.update(true, 0);
    },
  };
}
