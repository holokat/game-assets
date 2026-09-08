import * as THREE from 'three';

const direction = new THREE.Vector3();
const side = new THREE.Vector3();
const depth = new THREE.Vector3();
const reference = new THREE.Vector3();

function signedNoise(seed: number, index: number, channel: number): number {
  const value = Math.sin(seed * 127.1 + index * 311.7 + channel * 74.7) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

/**
 * Writes an endpoint-anchored, midpoint-displaced bolt. The point count must be
 * one more than a power of two so each pass adds a smaller scale of detail.
 */
export function writeHierarchicalBolt(
  points: readonly THREE.Vector3[],
  start: THREE.Vector3,
  end: THREE.Vector3,
  seed: number,
  amplitude: number,
  roughness = .5,
): void {
  const last = points.length - 1;
  if (last < 2 || (last & (last - 1)) !== 0) {
    throw new Error('A hierarchical bolt needs 2^n + 1 points.');
  }

  points[0]!.copy(start);
  points[last]!.copy(end);
  direction.copy(end).sub(start);
  if (direction.lengthSq() < 1e-10) direction.set(0, -1, 0);
  direction.normalize();
  reference.set(0, 1, 0);
  if (Math.abs(direction.y) > .82) reference.set(1, 0, 0);
  side.crossVectors(direction, reference).normalize();
  depth.crossVectors(direction, side).normalize();

  const boundedRoughness = THREE.MathUtils.clamp(roughness, .25, .82);
  let stride = last >> 1;
  let displacement = Math.max(0, amplitude);
  let level = 0;
  while (stride >= 1) {
    const span = stride << 1;
    for (let index = stride; index < last; index += span) {
      const envelope = Math.sin(index / last * Math.PI);
      points[index]!
        .copy(points[index - stride]!)
        .add(points[index + stride]!)
        .multiplyScalar(.5)
        .addScaledVector(side, signedNoise(seed, index, level) * displacement * envelope)
        .addScaledVector(depth, signedNoise(seed + 19, index, level + 7) * displacement * .72 * envelope);
    }
    stride >>= 1;
    displacement *= boundedRoughness;
    level += 1;
  }
}
