import * as THREE from 'three';
import { createMotionCurve } from './sampleMotionCurve';
import { setBladeCutOrientation } from './setBladeCutOrientation';

interface SwordDirectionKey {
  readonly time: number;
  readonly elevation: number;
  readonly lateral: number;
}

export interface OneHandedSwordPose {
  update(move: 'light-attack' | 'heavy-attack', normalizedTime: number): void;
}

const DIRECTION_KEYS: Readonly<Record<'light-attack' | 'heavy-attack', readonly SwordDirectionKey[]>> = {
  'light-attack': [
    { time: 0, elevation: 48, lateral: 18 },
    { time: 0.14, elevation: 92, lateral: -22 },
    { time: 0.31, elevation: 126, lateral: -32 },
    { time: 0.42, elevation: 98, lateral: -12 },
    { time: 0.56, elevation: 28, lateral: 22 },
    { time: 0.625, elevation: -15, lateral: 35 },
    { time: 0.79, elevation: -34, lateral: 43 },
    { time: 1, elevation: 48, lateral: 18 },
  ],
  'heavy-attack': [
    { time: 0, elevation: 48, lateral: 18 },
    { time: 0.12, elevation: 96, lateral: -24 },
    { time: 0.27, elevation: 136, lateral: -36 },
    { time: 0.39, elevation: 124, lateral: -30 },
    { time: 0.49, elevation: 78, lateral: -8 },
    { time: 0.582, elevation: -22, lateral: 38 },
    { time: 0.72, elevation: -43, lateral: 46 },
    { time: 0.87, elevation: 5, lateral: 28 },
    { time: 1, elevation: 48, lateral: 18 },
  ],
};

const curves = Object.fromEntries(Object.entries(DIRECTION_KEYS).map(([move, keys]) => [move, {
  elevation: createMotionCurve(keys.map((key) => key.time), keys.map((key) => key.elevation)),
  lateral: createMotionCurve(keys.map((key) => key.time), keys.map((key) => key.lateral)),
}])) as Record<'light-attack' | 'heavy-attack', {
  elevation: (time: number) => number;
  lateral: (time: number) => number;
}>;

export function createOneHandedSwordPose(root: THREE.Object3D, palmContact: THREE.Object3D): OneHandedSwordPose {
  const palmWorldPosition = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const bladeAxis = new THREE.Vector3(0, 0, 1);
  // The heavy cut crosses toward the authored forward-left target lane.
  const heavyCutNormal = new THREE.Vector3(1, 0, -0.8).normalize();
  const cutQuaternion = new THREE.Quaternion();

  return {
    update(move, normalizedTime) {
      const parent = root.parent;
      if (!parent) return;
      parent.updateWorldMatrix(true, false);
      palmContact.updateWorldMatrix(true, false);
      palmContact.getWorldPosition(palmWorldPosition);
      parent.worldToLocal(palmWorldPosition);
      root.position.copy(palmWorldPosition);

      const time = THREE.MathUtils.clamp(normalizedTime, 0, 1);
      const elevation = THREE.MathUtils.degToRad(curves[move].elevation(time));
      const lateral = THREE.MathUtils.degToRad(curves[move].lateral(time));
      direction.set(
        Math.sin(lateral),
        Math.sin(elevation) * Math.cos(lateral),
        Math.cos(elevation) * Math.cos(lateral),
      ).normalize();
      root.quaternion.setFromUnitVectors(bladeAxis, direction);
      if (move === 'heavy-attack') {
        setBladeCutOrientation(direction, heavyCutNormal, cutQuaternion);
        const turnIntoCut = THREE.MathUtils.smoothstep(time, 0, 0.12)
          * (1 - THREE.MathUtils.smoothstep(time, 0.87, 1));
        root.quaternion.slerp(cutQuaternion, turnIntoCut);
      }
      root.scale.set(1, 1, 1);
      root.updateWorldMatrix(true, true);
    },
  };
}
