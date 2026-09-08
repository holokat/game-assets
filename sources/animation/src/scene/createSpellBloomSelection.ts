import * as THREE from 'three';

/** Suppress ordinary color while retaining its depth, skinning and transparency rules. */
export function createSpellBloomSelection(scene: THREE.Scene) {
  const saved = new Map<THREE.Material, boolean>();
  let hasEmission = false;
  function inspectMaterial(material: THREE.Material) {
    if (!material.visible || saved.has(material)) return;
    saved.set(material, material.colorWrite);
    if (material.userData.spellBloom === true && material.colorWrite) hasEmission = true;
    else material.colorWrite = false;
  }
  function inspect(object: THREE.Object3D) {
    const material = (object as THREE.Mesh).material;
    if (Array.isArray(material)) for (const item of material) inspectMaterial(item);
    else if (material) inspectMaterial(material);
  }
  return {
    render(draw: () => void): boolean {
      hasEmission = false;
      try {
        scene.traverseVisible(inspect);
        if (hasEmission) draw();
        return hasEmission;
      } finally {
        for (const [material, colorWrite] of saved) material.colorWrite = colorWrite;
        saved.clear();
      }
    },
  };
}
