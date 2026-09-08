import * as THREE from 'three';
import type { MoveEventType } from '../animation/types';
import type { WarriorSocketName } from '../character/loadWarrior';
import { WHIRLWIND_TIMING } from '../animation/whirlwindMotion';
import { createSwordSweepTrail, type SampleSwordSegment } from './createSwordSweepTrail';

interface Effect {
  age: number;
  readonly duration: number;
  update(progress: number, delta: number): void;
  dispose(): void;
}

export interface CombatVfx {
  trigger(type: MoveEventType): void;
  update(delta: number): void;
  dispose(): void;
}

const jade = new THREE.Color('#36ff93');
const mint = new THREE.Color('#b6ffdc');

export function createCombatVfx(
  scene: THREE.Scene,
  characterRoot: THREE.Object3D,
  sockets: ReadonlyMap<WarriorSocketName, THREE.Object3D>,
  getWeaponImpactPosition?: () => THREE.Vector3 | null,
  sampleSwordSegment?: SampleSwordSegment,
): CombatVfx {
  const effects = new Set<Effect>();
  const worldPosition = new THREE.Vector3();
  const swordTrail = sampleSwordSegment ? createSwordSweepTrail(scene, sampleSwordSegment) : undefined;

  const getSocketPosition = (name: WarriorSocketName): THREE.Vector3 => {
    const socket = sockets.get(name);
    if (!socket) return characterRoot.getWorldPosition(new THREE.Vector3());
    return socket.getWorldPosition(new THREE.Vector3());
  };

  function addRing(position: THREE.Vector3, options: { radius?: number; duration?: number; flat?: boolean } = {}): void {
    const radius = options.radius ?? 0.55;
    const material = new THREE.MeshBasicMaterial({
      color: jade,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.013, 8, 64), material);
    ring.position.copy(position);
    if (options.flat ?? true) ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(0.2);
    scene.add(ring);

    effects.add({
      age: 0,
      duration: options.duration ?? 0.58,
      update(progress) {
        const eased = 1 - (1 - progress) ** 3;
        ring.scale.setScalar(0.2 + eased * 1.45);
        material.opacity = (1 - progress) ** 1.7 * 0.88;
      },
      dispose() {
        scene.remove(ring);
        ring.geometry.dispose();
        material.dispose();
      },
    });
  }

  function addBurst(position: THREE.Vector3, count = 26, scale = 1, duration = 0.68): void {
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + (index % 3) * 0.19;
      const lift = 0.12 + ((index * 7) % 11) / 30;
      velocities.push(new THREE.Vector3(Math.cos(angle) * (0.32 + (index % 5) * 0.07), lift, Math.sin(angle) * (0.32 + (index % 4) * 0.08)).multiplyScalar(scale));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: mint,
      size: 0.035 * scale,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    scene.add(points);

    effects.add({
      age: 0,
      duration,
      update(progress) {
        const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let index = 0; index < velocities.length; index += 1) {
          const velocity = velocities[index];
          if (!velocity) continue;
          const elapsed = progress * duration;
          attribute.setXYZ(index, velocity.x * elapsed, velocity.y * elapsed - 1.7 * elapsed * elapsed, velocity.z * elapsed);
        }
        attribute.needsUpdate = true;
        material.opacity = (1 - progress) ** 1.4;
      },
      dispose() {
        scene.remove(points);
        geometry.dispose();
        material.dispose();
      },
    });
  }

  function trigger(type: MoveEventType): void {
    characterRoot.updateWorldMatrix(true, true);
    characterRoot.getWorldPosition(worldPosition);
    switch (type) {
      case 'jump-launch':
        addRing(worldPosition.clone().setY(0.025), { radius: 0.38, duration: 0.42 });
        break;
      case 'jump-land':
        addRing(worldPosition.clone().setY(0.025), { radius: 0.72, duration: 0.74 });
        addBurst(worldPosition.clone().setY(0.08), 18, 0.75);
        break;
      case 'dodge-start':
        addRing(worldPosition.clone().setY(0.03), { radius: 0.45, duration: 0.38 });
        break;
      case 'swing-trail':
        swordTrail?.begin(.16);
        break;
      case 'swing-impact':
        addBurst(getWeaponImpactPosition?.() ?? getSocketPosition('Socket_Weapon_Right'), 22, 0.85);
        break;
      // Casting is a single phase-driven orb, including paused pose review.
      case 'whirlwind-start':
        swordTrail?.begin(WHIRLWIND_TIMING.spinEnd - WHIRLWIND_TIMING.windupEnd);
        addRing(worldPosition.clone().setY(0.04), { radius: 0.72, duration: 0.22 });
        break;
      case 'whirlwind-pulse':
        addRing(worldPosition.clone().setY(0.05), { radius: 1.05, duration: 0.26 });
        addBurst(getWeaponImpactPosition?.() ?? getSocketPosition('Socket_Weapon_Right'), 18, 1.25, 0.22);
        break;
      case 'hit-react':
        addBurst(worldPosition.clone().add(new THREE.Vector3(0, 1.2, 0)), 16, 0.65);
        break;
    }
  }

  function update(delta: number): void {
    swordTrail?.update(delta);
    for (const effect of effects) {
      effect.age += delta;
      const progress = THREE.MathUtils.clamp(effect.age / effect.duration, 0, 1);
      effect.update(progress, delta);
      if (progress < 1) continue;
      effect.dispose();
      effects.delete(effect);
    }
  }

  return {
    trigger,
    update,
    dispose() {
      swordTrail?.dispose();
      for (const effect of effects) effect.dispose();
      effects.clear();
    },
  };
}
