import * as THREE from 'three';
import type { MoveId } from '../types';

export type Vec3 = readonly [number, number, number];
export type BasePoseId = 'relaxed' | 'combat' | 'airborne';

export interface PoseFrame {
  readonly time: number;
  readonly rotations?: Readonly<Record<string, Vec3>>;
  readonly positions?: Readonly<Record<string, Vec3>>;
}

export interface ClipRecipe {
  readonly id: MoveId;
  readonly basePose?: BasePoseId;
  /** Dense baking preserves the acceleration of fast turns during slow playback. */
  readonly sampleRate?: number;
  readonly frames: readonly PoseFrame[];
}

export const degrees = (value: number): number => THREE.MathUtils.degToRad(value);

export function rotation(x = 0, y = 0, z = 0): Vec3 {
  return [degrees(x), degrees(y), degrees(z)];
}
