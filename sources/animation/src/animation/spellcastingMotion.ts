import * as THREE from 'three';
import { createMotionCurve } from './sampleMotionCurve';

type Point = readonly [number, number, number];

const HAND_TIMES = [0, 0.12, 0.22, 0.34, 0.46, 0.58, 0.624, 0.74, 0.84, 1];
const LEFT_HAND_POINTS: readonly Point[] = [
  [0.2, 1.12, 0.34], [0.18, 1.16, 0.39], [0.17, 1.2, 0.43], [0.13, 1.34, 0.43],
  [0.16, 1.08, 0.43], [0.12, 1.19, 0.42], [0.11, 1.19, 0.46], [0.1, 1.19, 0.55],
  [0.12, 1.17, 0.58], [0.2, 1.12, 0.34],
];
const RIGHT_HAND_POINTS: readonly Point[] = [
  [-0.2, 1.12, 0.34], [-0.18, 1.16, 0.39], [-0.17, 1.2, 0.43], [-0.16, 1.08, 0.43],
  [-0.13, 1.34, 0.43], [-0.12, 1.19, 0.42], [-0.11, 1.19, 0.46], [-0.1, 1.19, 0.55],
  [-0.12, 1.17, 0.58], [-0.2, 1.12, 0.34],
];

function pointCurves(points: readonly Point[]): readonly ((time: number) => number)[] {
  return [0, 1, 2].map((axis) => createMotionCurve(HAND_TIMES, points.map((point) => point[axis]!)));
}

const leftHandCurves = pointCurves(LEFT_HAND_POINTS);
const rightHandCurves = pointCurves(RIGHT_HAND_POINTS);

function samplePoint(curves: readonly ((time: number) => number)[], time: number, target: THREE.Vector3): THREE.Vector3 {
  const t = THREE.MathUtils.clamp(time, 0, 1);
  return target.set(curves[0]!(t), curves[1]!(t), curves[2]!(t));
}

export function sampleSpellHandLocalPositions(
  normalizedTime: number,
  leftTarget: THREE.Vector3,
  rightTarget: THREE.Vector3,
): void {
  samplePoint(leftHandCurves, normalizedTime, leftTarget);
  samplePoint(rightHandCurves, normalizedTime, rightTarget);
}

export function spellHandInfluence(normalizedTime: number): number {
  const time = THREE.MathUtils.clamp(normalizedTime, 0, 1);
  const enter = THREE.MathUtils.smoothstep(time, 0.04, 0.18);
  const exit = 1 - THREE.MathUtils.smoothstep(time, 0.84, 0.98);
  return enter * exit;
}

export function sampleSpellOrbLocalPosition(normalizedTime: number, target: THREE.Vector3): THREE.Vector3 {
  const time = THREE.MathUtils.clamp(normalizedTime, 0, 1);
  const release = THREE.MathUtils.smootherstep(time, 0.624, 0.9);
  target.set(0, 1.2, THREE.MathUtils.lerp(0.46, 2.15, release));
  return target;
}

export function spellOrbOpacity(normalizedTime: number): number {
  const time = THREE.MathUtils.clamp(normalizedTime, 0, 1);
  const gather = THREE.MathUtils.smoothstep(time, 0.12, 0.22);
  const releaseFade = 1 - THREE.MathUtils.smoothstep(time, 0.82, 0.96);
  return gather * releaseFade;
}

export function spellOrbScale(normalizedTime: number): number {
  const time = THREE.MathUtils.clamp(normalizedTime, 0, 1);
  const gather = THREE.MathUtils.smoothstep(time, 0.12, 0.28);
  const pulse = Math.sin(time * Math.PI * 10) * 0.06 * (1 - THREE.MathUtils.smoothstep(time, 0.62, 0.82));
  const release = THREE.MathUtils.smoothstep(time, 0.62, 0.86);
  return 0.42 + gather * 0.58 + pulse + release * 0.32;
}
