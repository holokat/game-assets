import * as THREE from 'three';

export interface TwoHandedGripConstraint {
  update(enabled: boolean, orientationWeight?: number, repositionForContact?: boolean): void;
}

const MAX_FOREARM_CORRECTION = THREE.MathUtils.degToRad(32);
const MAX_UPPER_ARM_CORRECTION = THREE.MathUtils.degToRad(22);
const MINIMUM_ELBOW_ANGLE = THREE.MathUtils.degToRad(34);
const POSITION_TOLERANCE_SQUARED = 0.0015 ** 2;

export function createTwoHandedGripConstraint(
  upperArm: THREE.Object3D,
  forearm: THREE.Object3D,
  hand: THREE.Object3D,
  contact: THREE.Object3D,
  target: THREE.Object3D,
): TwoHandedGripConstraint {
  const jointPosition = new THREE.Vector3();
  const handPosition = new THREE.Vector3();
  const targetPosition = new THREE.Vector3();
  const targetFramePosition = new THREE.Vector3();
  const contactOffset = new THREE.Vector3();
  const jointWorldQuaternion = new THREE.Quaternion();
  const inverseJointQuaternion = new THREE.Quaternion();
  const targetWorldQuaternion = new THREE.Quaternion();
  const fullGripWorldQuaternion = new THREE.Quaternion();
  const desiredHandWorldQuaternion = new THREE.Quaternion();
  const currentHandWorldQuaternion = new THREE.Quaternion();
  const inverseContactQuaternion = contact.quaternion.clone().invert();
  const correction = new THREE.Quaternion();
  const handDirection = new THREE.Vector3();
  const targetDirection = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const shoulderPosition = new THREE.Vector3();
  const elbowPosition = new THREE.Vector3();
  const wristPosition = new THREE.Vector3();
  const toShoulder = new THREE.Vector3();
  const toWrist = new THREE.Vector3();
  const bendAxis = new THREE.Vector3();
  const forearmWorldQuaternion = new THREE.Quaternion();
  const parentWorldQuaternion = new THREE.Quaternion();
  const limitedForearmWorldQuaternion = new THREE.Quaternion();
  const parentWorldPosition = new THREE.Vector3();
  const armParentWorldQuaternion = new THREE.Quaternion();
  const lastTargetWorldPosition = new THREE.Vector3();
  const lastTargetWorldQuaternion = new THREE.Quaternion();
  const lastParentWorldPosition = new THREE.Vector3();
  const lastParentWorldQuaternion = new THREE.Quaternion();
  const lastUpperArmQuaternion = new THREE.Quaternion();
  const lastForearmQuaternion = new THREE.Quaternion();
  const lastHandQuaternion = new THREE.Quaternion();
  let hasLastOutput = false;

  const sameQuaternion = (left: THREE.Quaternion, right: THREE.Quaternion) =>
    Math.abs(left.dot(right)) > 1 - 1e-7;

  function recordOutput(): void {
    lastTargetWorldPosition.copy(targetFramePosition);
    lastTargetWorldQuaternion.copy(targetWorldQuaternion);
    lastParentWorldPosition.copy(parentWorldPosition);
    lastParentWorldQuaternion.copy(armParentWorldQuaternion);
    lastUpperArmQuaternion.copy(upperArm.quaternion);
    lastForearmQuaternion.copy(forearm.quaternion);
    lastHandQuaternion.copy(hand.quaternion);
    hasLastOutput = true;
  }

  function rotateJointTowardTarget(
    joint: THREE.Object3D,
    endEffector: THREE.Object3D,
    maximumCorrection: number,
  ): void {
    joint.getWorldPosition(jointPosition);
    endEffector.getWorldPosition(handPosition);
    joint.getWorldQuaternion(jointWorldQuaternion);
    inverseJointQuaternion.copy(jointWorldQuaternion).invert();
    handDirection.copy(handPosition).sub(jointPosition).applyQuaternion(inverseJointQuaternion).normalize();
    targetDirection.copy(targetPosition).sub(jointPosition).applyQuaternion(inverseJointQuaternion).normalize();
    const angle = Math.min(maximumCorrection,
      Math.acos(THREE.MathUtils.clamp(handDirection.dot(targetDirection), -1, 1)) * 0.82);
    if (angle < 0.0001) return;
    axis.crossVectors(handDirection, targetDirection);
    if (axis.lengthSq() < 0.000001) return;
    axis.normalize();
    correction.setFromAxisAngle(axis, angle);
    joint.quaternion.multiply(correction).normalize();
    joint.updateWorldMatrix(true, true);
  }

  function enforceElbowLimit(): void {
    upperArm.getWorldPosition(shoulderPosition);
    forearm.getWorldPosition(elbowPosition);
    hand.getWorldPosition(wristPosition);
    toShoulder.copy(shoulderPosition).sub(elbowPosition).normalize();
    toWrist.copy(wristPosition).sub(elbowPosition).normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(toShoulder.dot(toWrist), -1, 1));
    if (angle >= MINIMUM_ELBOW_ANGLE) return;
    bendAxis.crossVectors(toShoulder, toWrist);
    if (bendAxis.lengthSq() < 0.000001) return;
    bendAxis.normalize();
    correction.setFromAxisAngle(bendAxis, MINIMUM_ELBOW_ANGLE - angle);
    forearm.getWorldQuaternion(forearmWorldQuaternion);
    limitedForearmWorldQuaternion.copy(correction).multiply(forearmWorldQuaternion).normalize();
    const parent = forearm.parent;
    if (!parent) return;
    parent.getWorldQuaternion(parentWorldQuaternion);
    forearm.quaternion.copy(parentWorldQuaternion.invert()).multiply(limitedForearmWorldQuaternion).normalize();
    forearm.updateWorldMatrix(true, true);
  }

  function orientHand(worldQuaternion: THREE.Quaternion): void {
    forearm.getWorldQuaternion(jointWorldQuaternion);
    hand.quaternion.copy(jointWorldQuaternion.invert()).multiply(worldQuaternion).normalize();
    hand.updateWorldMatrix(true, true);
  }

  return {
    update(enabled, orientationWeight = 0.725, repositionForContact = true) {
      if (!enabled) {
        hasLastOutput = false;
        return;
      }
      target.updateWorldMatrix(true, false);
      target.getWorldPosition(targetFramePosition);
      target.getWorldQuaternion(targetWorldQuaternion);
      const armParent = upperArm.parent;
      if (!armParent) throw new Error('A grip constraint requires a parented upper arm.');
      armParent.getWorldPosition(parentWorldPosition);
      armParent.getWorldQuaternion(armParentWorldQuaternion);
      if (hasLastOutput
        && targetFramePosition.distanceToSquared(lastTargetWorldPosition) < 1e-10
        && parentWorldPosition.distanceToSquared(lastParentWorldPosition) < 1e-10
        && sameQuaternion(targetWorldQuaternion, lastTargetWorldQuaternion)
        && sameQuaternion(armParentWorldQuaternion, lastParentWorldQuaternion)
        && sameQuaternion(upperArm.quaternion, lastUpperArmQuaternion)
        && sameQuaternion(forearm.quaternion, lastForearmQuaternion)
        && sameQuaternion(hand.quaternion, lastHandQuaternion)) return;
      targetPosition.copy(targetFramePosition);
      fullGripWorldQuaternion.copy(targetWorldQuaternion).multiply(inverseContactQuaternion).normalize();
      for (let iteration = 0; iteration < 16; iteration += 1) {
        contact.getWorldPosition(handPosition);
        if (handPosition.distanceToSquared(targetPosition) <= POSITION_TOLERANCE_SQUARED) break;
        rotateJointTowardTarget(forearm, contact, MAX_FOREARM_CORRECTION);
        rotateJointTowardTarget(upperArm, contact, MAX_UPPER_ARM_CORRECTION);
      }
      if (orientationWeight <= 0) {
        recordOutput();
        return;
      }
      hand.getWorldQuaternion(currentHandWorldQuaternion);
      desiredHandWorldQuaternion.copy(currentHandWorldQuaternion)
        .slerp(fullGripWorldQuaternion, THREE.MathUtils.clamp(orientationWeight, 0, 1)).normalize();
      if (!repositionForContact) {
        orientHand(desiredHandWorldQuaternion);
        enforceElbowLimit();
        orientHand(desiredHandWorldQuaternion);
        recordOutput();
        return;
      }
      targetPosition.copy(targetFramePosition);
      contactOffset.copy(contact.position).applyQuaternion(desiredHandWorldQuaternion);
      targetPosition.sub(contactOffset);
      for (let iteration = 0; iteration < 16; iteration += 1) {
        hand.getWorldPosition(handPosition);
        if (handPosition.distanceToSquared(targetPosition) <= POSITION_TOLERANCE_SQUARED) break;
        rotateJointTowardTarget(forearm, hand, MAX_FOREARM_CORRECTION);
        rotateJointTowardTarget(upperArm, hand, MAX_UPPER_ARM_CORRECTION);
      }
      orientHand(desiredHandWorldQuaternion);
      // CCD can satisfy a close target by folding the forearm back across the
      // upper arm. Preserve its current bend plane while keeping enough elbow
      // angle for a stable anatomical silhouette, then restore the palm frame.
      enforceElbowLimit();
      orientHand(desiredHandWorldQuaternion);
      recordOutput();
    },
  };
}
