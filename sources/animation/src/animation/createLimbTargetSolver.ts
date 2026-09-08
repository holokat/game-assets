import * as T from 'three';

/** Analytic two-bone IK with an explicit bend plane, preserving bone lengths. */
export function createLimbTargetSolver(upper: T.Object3D, lower: T.Object3D, end: T.Object3D) {
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const axis = new T.Vector3(), bend = new T.Vector3(), joint = new T.Vector3();
  const from = new T.Vector3(), to = new T.Vector3();
  const q = new T.Quaternion(), world = new T.Quaternion(), parent = new T.Quaternion();
  function aim(bone: T.Object3D, child: T.Object3D, goal: T.Vector3) {
    bone.getWorldPosition(a); child.getWorldPosition(b);
    from.subVectors(b, a).normalize(); to.subVectors(goal, a).normalize();
    q.setFromUnitVectors(from, to); bone.getWorldQuaternion(world);
    bone.parent!.getWorldQuaternion(parent).invert();
    bone.quaternion.copy(parent).multiply(q).multiply(world).normalize();
    bone.updateWorldMatrix(true, true);
  }
  return {
    solve(target: T.Vector3, pole: T.Vector3) {
      upper.getWorldPosition(a); lower.getWorldPosition(b); end.getWorldPosition(c);
      const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
      axis.subVectors(target, a); const distance = T.MathUtils.clamp(axis.length(), Math.abs(l1 - l2) + .001, l1 + l2 - .001);
      axis.normalize(); bend.subVectors(pole, a).addScaledVector(axis, -bend.dot(axis));
      if (bend.lengthSq() < 1e-8) bend.set(0, 0, 1).addScaledVector(axis, -axis.z);
      bend.normalize();
      const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
      joint.copy(a).addScaledVector(axis, along).addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
      aim(upper, lower, joint); aim(lower, end, target);
    },
  };
}
