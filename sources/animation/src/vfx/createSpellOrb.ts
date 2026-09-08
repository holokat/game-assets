import * as THREE from 'three';
import {
  sampleSpellOrbLocalPosition,
  spellOrbOpacity,
  spellOrbScale,
} from '../animation/spellcastingMotion';
import type { MoveId } from '../animation/types';
import { enableSpellBloom } from './spells/spellBloom';

export interface SpellOrb {
  readonly root: THREE.Group;
  update(move: MoveId, normalizedTime: number): void;
  dispose(): void;
}

export function createSpellOrb(parent: THREE.Object3D): SpellOrb {
  const root = new THREE.Group();
  root.name = 'SpellOrb';
  root.visible = false;
  parent.add(root);

  const coreGeometry = new THREE.IcosahedronGeometry(0.085, 2);
  const coreMaterial = enableSpellBloom(new THREE.MeshBasicMaterial({
    color: '#b9ffe0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.name = 'SpellOrbCore';

  const shellGeometry = new THREE.IcosahedronGeometry(0.125, 1);
  const shellMaterial = enableSpellBloom(new THREE.MeshBasicMaterial({
    color: '#35ff91', wireframe: true, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  shell.name = 'SpellOrbShell';
  const light = new THREE.PointLight('#50ff9d', 0, 2.4, 2);
  root.add(core, shell, light);
  return {
    root,
    update(move, normalizedTime) {
      const casting = move === 'cast';
      const opacity = casting ? spellOrbOpacity(normalizedTime) : 0;
      root.visible = opacity > 0.001;
      if (!root.visible) return;
      sampleSpellOrbLocalPosition(normalizedTime, root.position);
      const scale = spellOrbScale(normalizedTime);
      root.scale.setScalar(scale);
      coreMaterial.opacity = opacity * 0.96;
      shellMaterial.opacity = opacity * 0.56;
      shell.rotation.set(normalizedTime * Math.PI * 1.4, normalizedTime * Math.PI * 2.2, normalizedTime * Math.PI * 0.7);
      light.intensity = opacity * (2.8 + scale * 2.2);
      root.updateWorldMatrix(true, true);
    },
    dispose() {
      parent.remove(root);
      coreGeometry.dispose();
      shellGeometry.dispose();
      coreMaterial.dispose();
      shellMaterial.dispose();
      light.dispose();
    },
  };
}
