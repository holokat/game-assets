import * as THREE from 'three';

export type SampleSwordSegment = (base: THREE.Vector3, tip: THREE.Vector3) => boolean;

/** A bounded ribbon of recent blade positions, sampled after the current pose. */
export function createSwordSweepTrail(scene: THREE.Scene, sample: SampleSwordSegment) {
  const capacity = 16;
  const lifetime = 0.1;
  const positions = new Float32Array(capacity * 6);
  const colors = new Float32Array(capacity * 6);
  const ages = new Float32Array(capacity);
  const indices: number[] = [];
  for (let i = 0; i < capacity - 1; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colorAttribute = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(indices);
  geometry.setDrawRange(0, 0);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.48, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const ribbon = new THREE.Mesh(geometry, material);
  ribbon.name = 'WhirlwindBladeTrail';
  ribbon.frustumCulled = false;
  ribbon.visible = false;
  scene.add(ribbon);
  const base = new THREE.Vector3();
  const tip = new THREE.Vector3();
  const color = new THREE.Color('#a0ffcf');
  let count = 0;
  let remaining = 0;

  return {
    begin(duration: number): void {
      count = 0;
      remaining = duration;
      ribbon.visible = false;
      geometry.setDrawRange(0, 0);
    },
    update(delta: number): void {
      if (delta <= 0) return;
      for (let i = 0; i < count; i += 1) ages[i] = ages[i]! + delta;
      if (remaining > 0 && sample(base, tip)) {
        if (count === capacity) {
          positions.copyWithin(0, 6);
          ages.copyWithin(0, 1);
          count -= 1;
        }
        // Restrict the ribbon to the blade, keeping the hand silhouette clear.
        base.lerp(tip, 0.3);
        base.toArray(positions, count * 6);
        tip.toArray(positions, count * 6 + 3);
        ages[count] = 0;
        count += 1;
      }
      remaining = Math.max(0, remaining - delta);
      let first = 0;
      while (first < count && ages[first]! >= lifetime) first += 1;
      for (let i = first; i < count; i += 1) {
        const strength = (1 - ages[i]! / lifetime) ** 2;
        for (let side = 0; side < 2; side += 1) {
          const offset = i * 6 + side * 3;
          colors[offset] = color.r * strength;
          colors[offset + 1] = color.g * strength;
          colors[offset + 2] = color.b * strength;
        }
      }
      ribbon.visible = count - first >= 2;
      geometry.setDrawRange(first * 6, Math.max(0, count - first - 1) * 6);
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
    },
    dispose(): void {
      scene.remove(ribbon);
      geometry.dispose();
      material.dispose();
    },
  };
}
