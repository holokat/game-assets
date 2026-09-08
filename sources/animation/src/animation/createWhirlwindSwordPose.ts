import * as THREE from 'three';

export interface WhirlwindSwordPose {
  update(): void;
}

/**
 * Keeps the actor-parented sword on the animated palm while the character Root
 * bone turns independently. The blade points radially from the spin center,
 * its broad-face normal stays upright, and its local X cutting axis is tangent
 * to the circular sweep.
 */
export function createWhirlwindSwordPose(
  swordRoot: THREE.Object3D,
  palmContact: THREE.Object3D,
  characterRoot: THREE.Object3D,
): WhirlwindSwordPose {
  const palmWorldPosition = new THREE.Vector3();
  const rootWorldPosition = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const upright = new THREE.Vector3(0, 1, 0);
  const fallbackRadial = new THREE.Vector3(0, 0, 1);
  const characterWorldQuaternion = new THREE.Quaternion();
  const parentWorldQuaternion = new THREE.Quaternion();
  const worldOrientation = new THREE.Quaternion();
  const basis = new THREE.Matrix4();

  return {
    update() {
      const parent = swordRoot.parent;
      if (!parent) return;

      parent.updateWorldMatrix(true, false);
      characterRoot.updateWorldMatrix(true, true);
      palmContact.updateWorldMatrix(true, false);
      palmContact.getWorldPosition(palmWorldPosition);
      characterRoot.getWorldPosition(rootWorldPosition);

      radial.copy(palmWorldPosition).sub(rootWorldPosition);
      radial.y = 0;
      if (radial.lengthSq() < 0.000001) {
        characterRoot.getWorldQuaternion(characterWorldQuaternion);
        radial.copy(fallbackRadial).applyQuaternion(characterWorldQuaternion);
        radial.y = 0;
      }
      radial.normalize();
      tangent.crossVectors(upright, radial).normalize();
      worldOrientation.setFromRotationMatrix(basis.makeBasis(tangent, upright, radial));

      swordRoot.position.copy(palmWorldPosition);
      parent.worldToLocal(swordRoot.position);
      parent.getWorldQuaternion(parentWorldQuaternion);
      swordRoot.quaternion.copy(parentWorldQuaternion.invert()).multiply(worldOrientation).normalize();
      swordRoot.scale.set(1, 1, 1);
      swordRoot.updateWorldMatrix(true, true);
    },
  };
}
