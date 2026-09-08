import * as THREE from 'three';

/** Marks a material as an explicit contributor to the selective spell-bloom pass. */
export function enableSpellBloom<T extends THREE.Material>(material: T): T {
  material.userData.spellBloom = true;
  return material;
}
