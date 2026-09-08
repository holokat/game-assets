import * as THREE from 'three';
import { createSpellParticleLayer } from './createSpellParticleLayer';

const SHARDS_PER_IMPACT = 9;
const CYAN = new THREE.Color('#8ff7ff');
const VIOLET = new THREE.Color('#9d6cff');

export interface EnergyMissileImpactSample {
  readonly index: number;
  readonly active: boolean;
  readonly age: number;
  readonly pointWorld: THREE.Vector3;
  readonly sideWorld: THREE.Vector3;
  readonly upWorld: THREE.Vector3;
  readonly directionWorld: THREE.Vector3;
  readonly worldScale: number;
}

/** One pooled particle layer for all seven staggered missile shatters. */
export function createEnergyMissileShatter(parent: THREE.Group) {
  const particles = createSpellParticleLayer({
    capacity: 7 * SHARDS_PER_IMPACT,
    additive: true,
    hdr: 3.4,
  });
  particles.mesh.name = 'EnergyMissileShatter';
  parent.add(particles.mesh);
  const worldPosition = new THREE.Vector3();
  const localPosition = new THREE.Vector3();

  return {
    mesh: particles.mesh,
    update(samples: readonly EnergyMissileImpactSample[], worldToLocal: THREE.Matrix4) {
      let count = 0;
      for (const sample of samples) {
        if (!sample.active) continue;
        for (let shard = 0; shard < SHARDS_PER_IMPACT; shard += 1) {
          const lifetime = 0.32 + (shard % 4) * 0.055;
          if (sample.age >= lifetime) continue;
          const seed = sample.index * 11.7 + shard * 2.399963;
          const speed = 0.34 + (shard % 5) * 0.075;
          const radial = sample.age * speed * sample.worldScale;
          const lift = sample.age * (0.24 + (shard % 3) * 0.075)
            - sample.age * sample.age * 0.58;
          worldPosition.copy(sample.pointWorld)
            .addScaledVector(sample.sideWorld, Math.cos(seed) * radial)
            .addScaledVector(sample.upWorld, Math.sin(seed) * radial + lift * sample.worldScale)
            .addScaledVector(sample.directionWorld, (shard % 2 ? 1 : -1) * radial * 0.24);
          localPosition.copy(worldPosition).applyMatrix4(worldToLocal);
          const fade = Math.pow(1 - sample.age / lifetime, 1.25);
          particles.setParticle(
            count++,
            localPosition,
            0.005 + (shard % 3) * 0.00125,
            seed,
            (sample.index + shard) % 3 ? CYAN : VIOLET,
            fade * 0.78,
            0,
            4.2 + speed * 5.2,
          );
        }
      }
      particles.commit(count);
    },
    clear() {
      particles.commit(0);
    },
  };
}
