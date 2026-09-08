import * as THREE from 'three';

const longitudinal = new THREE.Vector3();
const faceNormal = new THREE.Vector3();
const cuttingEdge = new THREE.Vector3();
const basis = new THREE.Matrix4();

/** Sword geometry uses +Z along the blade, X across its edges, and Y normal
 * to its broad face. Specify the cut plane as well as the blade direction.
 */
export function setBladeCutOrientation(
  direction: THREE.Vector3,
  cutPlaneNormal: THREE.Vector3,
  target: THREE.Quaternion,
): THREE.Quaternion {
  longitudinal.copy(direction).normalize();
  faceNormal.copy(cutPlaneNormal).addScaledVector(longitudinal, -cutPlaneNormal.dot(longitudinal));
  if (faceNormal.lengthSq() < 0.000001) {
    faceNormal.set(0, Math.abs(longitudinal.y) < 0.9 ? 1 : 0, Math.abs(longitudinal.y) < 0.9 ? 0 : 1);
    faceNormal.addScaledVector(longitudinal, -faceNormal.dot(longitudinal));
  }
  faceNormal.normalize();
  cuttingEdge.crossVectors(faceNormal, longitudinal).normalize();
  return target.setFromRotationMatrix(basis.makeBasis(cuttingEdge, faceNormal, longitudinal));
}
