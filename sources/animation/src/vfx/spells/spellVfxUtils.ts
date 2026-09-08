import * as THREE from 'three';
import type { SpellEffectContext } from './types';
import { enableSpellBloom } from './spellBloom';

export const additiveMaterial = (color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial =>
  enableSpellBloom(new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }));

export function createSpellEffectContext(
  actor: THREE.Object3D,
  sockets: SpellEffectContext['sockets'],
): SpellEffectContext {
  return {
    actor,
    sockets,
    socketPosition(name, target) {
      const socket = sockets.get(name);
      if (!socket) return target.set(0, 1.25, 0.18);
      actor.updateWorldMatrix(true, false);
      socket.getWorldPosition(target);
      return actor.worldToLocal(target);
    },
  };
}

export function disposeTree(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  root.parent?.remove(root);
}

export function smoothRange(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function quadraticBezier(
  target: THREE.Vector3,
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const inverse = 1 - t;
  return target.set(
    inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    inverse * inverse * start.z + 2 * inverse * t * control.z + t * t * end.z,
  );
}

export function setMaterialOpacity(material: THREE.Material, opacity: number): void {
  if ('opacity' in material) (material as THREE.Material & { opacity: number }).opacity = opacity;
}
