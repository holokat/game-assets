import * as THREE from 'three';
import type { TrainingSword } from '../character/createTrainingSword';
import { setBladeCutOrientation } from './setBladeCutOrientation';

const CARRY_BLEND_SECONDS = 0.24;

/** A low right-hand carry, with the long blade trailing just above the floor. */
export function createGreatswordCarryPose(sword: TrainingSword, hips: THREE.Object3D) {
  const hipsPosition = new THREE.Vector3();
  const desiredPosition = new THREE.Vector3();
  const desiredQuaternion = new THREE.Quaternion();
  const startPosition = new THREE.Vector3();
  const startQuaternion = new THREE.Quaternion();
  const bladeDirection = new THREE.Vector3();
  // A slight inward face roll lets the authored walk and sprint keep a neutral
  // wrist while preserving the same trailing blade line.
  const bladeFaceNormal = new THREE.Vector3(0.866025, -0.5, 0);
  const bladeTip = sword.root.getObjectByName('BladeTip');
  if (!bladeTip) throw new Error('Greatsword carry requires the blade tip.');
  const bladeLength = bladeTip.position.z;
  let active = false;
  let elapsed = 0;

  return {
    reset() {
      active = false;
    },
    update(deltaSeconds?: number) {
      const parent = sword.root.parent;
      if (!parent) return;
      parent.updateWorldMatrix(true, false);
      hips.getWorldPosition(hipsPosition);
      parent.worldToLocal(hipsPosition);
      if (!active) {
        startPosition.copy(sword.root.position);
        startQuaternion.copy(sword.root.quaternion);
        elapsed = 0;
        active = true;
      }
      elapsed = deltaSeconds === undefined
        ? CARRY_BLEND_SECONDS
        : Math.min(CARRY_BLEND_SECONDS, elapsed + Math.max(0, deltaSeconds));
      const progress = elapsed / CARRY_BLEND_SECONDS;
      const blend = progress * progress * (3 - 2 * progress);
      desiredPosition.set(hipsPosition.x - 0.37, hipsPosition.y - 0.005, hipsPosition.z - 0.1);
      // Actor +Z is forward and -X is right. Keep the point close to the
      // ground while the planted gait supplies the small handle movement.
      const down = THREE.MathUtils.clamp((0.075 - desiredPosition.y) / bladeLength, -0.8, -0.05);
      bladeDirection.set(-0.11, down, -Math.sqrt(1 - down * down - 0.11 * 0.11));
      setBladeCutOrientation(bladeDirection, bladeFaceNormal, desiredQuaternion);
      sword.root.position.lerpVectors(startPosition, desiredPosition, blend);
      sword.root.quaternion.slerpQuaternions(startQuaternion, desiredQuaternion, blend);
      sword.root.updateWorldMatrix(true, true);
    },
  };
}
