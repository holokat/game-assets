import * as THREE from 'three';

export interface HandGripPose {
  update(strength: number): void;
}

interface FingerJoint {
  readonly object: THREE.Object3D;
  readonly open: THREE.Quaternion;
  readonly closed: THREE.Quaternion;
}

// These flexion angles reproduce the rig's authored validation curl. The two
// phalanges need different amounts: a large distal curl folds the fingertips
// back above the palm and produces the visible claw deformation.
const FINGER_CURL_DEGREES: Readonly<Record<string, number>> = {
  HandIndex1: -67,
  HandIndex2: -39,
  HandMiddle1: -67,
  HandMiddle2: -39,
  HandRing1: -67,
  HandRing2: -39,
  HandPinky1: -70,
  HandPinky2: -39,
};

// The thumb bones have a different roll from the fingers. These local deltas
// come from the known-good rig validation pose and include opposition across
// the palm. Applying the finger's X-only curl to the thumb points its distal
// segment away from the grip and twists its weighted vertices underneath it.
function thumbCurl(suffix: 'HandThumb1' | 'HandThumb2', sideSign: number): THREE.Quaternion {
  return suffix === 'HandThumb1'
    ? new THREE.Quaternion(-0.068786, 0, -0.445267 * sideSign, 0.892752).normalize()
    : new THREE.Quaternion(0.027173, 0, 0.408819 * sideSign, 0.912211).normalize();
}

export function createHandGripPose(hand: THREE.Object3D): HandGripPose {
  const side = hand.name.startsWith('Left') ? 'Left' : 'Right';
  const sideSign = side === 'Left' ? 1 : -1;
  const rotations: readonly [string, THREE.Quaternion][] = [
    ...Object.entries(FINGER_CURL_DEGREES).map(([suffix, degrees]) => [
      suffix,
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        THREE.MathUtils.degToRad(degrees),
      ),
    ] as [string, THREE.Quaternion]),
    ['HandThumb1', thumbCurl('HandThumb1', sideSign)],
    ['HandThumb2', thumbCurl('HandThumb2', sideSign)],
  ];
  const joints: FingerJoint[] = rotations.map(([suffix, curl]) => {
    const object = hand.getObjectByName(`${side}${suffix}`);
    if (!object) throw new Error(`The ${side.toLowerCase()} grip is missing ${suffix}.`);
    const open = object.quaternion.clone();
    return { object, open, closed: open.clone().multiply(curl).normalize() };
  });

  return {
    update(strength) {
      const weight = THREE.MathUtils.clamp(strength, 0, 1);
      for (const joint of joints) joint.object.quaternion.slerpQuaternions(joint.open, joint.closed, weight);
    },
  };
}
