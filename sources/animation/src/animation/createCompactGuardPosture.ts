import * as THREE from 'three';

interface CompactGuardPosture {
  update(active: boolean): void;
}

interface ArmState {
  readonly base: THREE.Quaternion;
  readonly output: THREE.Quaternion;
  hasOutput: boolean;
}

const jointWorld = new THREE.Vector3();
const elbowWorld = new THREE.Vector3();
const targetWorld = new THREE.Vector3();
const currentDirection = new THREE.Vector3();
const targetDirection = new THREE.Vector3();
const rootWorldQuaternion = new THREE.Quaternion();
const parentWorldQuaternion = new THREE.Quaternion();
const armWorldQuaternion = new THREE.Quaternion();
const correction = new THREE.Quaternion();

function restoreOrCapture(arm: THREE.Object3D, state: ArmState): void {
  if (state.hasOutput && arm.quaternion.angleTo(state.output) < 1e-6) arm.quaternion.copy(state.base);
  else state.base.copy(arm.quaternion);
}

/** Pulls an authored shield guard slightly forward and toward the torso. */
export function createCompactGuardPosture(
  root: THREE.Object3D,
  leftArm: THREE.Object3D,
  leftForearm: THREE.Object3D,
  rightArm: THREE.Object3D,
  rightForearm: THREE.Object3D,
): CompactGuardPosture {
  const leftState: ArmState = { base: new THREE.Quaternion(), output: new THREE.Quaternion(), hasOutput: false };
  const rightState: ArmState = { base: new THREE.Quaternion(), output: new THREE.Quaternion(), hasOutput: false };

  function solve(
    arm: THREE.Object3D,
    forearm: THREE.Object3D,
    state: ArmState,
    inward: number,
    forward: number,
  ): void {
    restoreOrCapture(arm, state);
    arm.updateWorldMatrix(true, true);
    arm.getWorldPosition(jointWorld);
    forearm.getWorldPosition(elbowWorld);
    currentDirection.copy(elbowWorld).sub(jointWorld).normalize();

    root.getWorldQuaternion(rootWorldQuaternion);
    targetWorld.set(inward, 0, forward).applyQuaternion(rootWorldQuaternion).add(elbowWorld);
    targetDirection.copy(targetWorld).sub(jointWorld).normalize();
    correction.setFromUnitVectors(currentDirection, targetDirection);
    arm.getWorldQuaternion(armWorldQuaternion);
    armWorldQuaternion.premultiply(correction);
    arm.parent?.getWorldQuaternion(parentWorldQuaternion);
    arm.quaternion.copy(parentWorldQuaternion.invert()).multiply(armWorldQuaternion).normalize();
    state.output.copy(arm.quaternion);
    state.hasOutput = true;
    arm.updateWorldMatrix(false, true);
  }

  return {
    update(active) {
      restoreOrCapture(leftArm, leftState);
      restoreOrCapture(rightArm, rightState);
      if (!active) {
        leftState.hasOutput = false;
        rightState.hasOutput = false;
        return;
      }
      // +X is character-left, so the two elbows move toward one another.
      solve(leftArm, leftForearm, leftState, -0.045, 0.16);
      solve(rightArm, rightForearm, rightState, 0.045, 0.1);
    },
  };
}
