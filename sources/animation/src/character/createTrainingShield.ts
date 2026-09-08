import * as THREE from 'three';

export interface TrainingShield {
  readonly root: THREE.Group;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export function createTrainingShield(parent: THREE.Object3D): TrainingShield {
  const root = new THREE.Group();
  root.name = 'TrainingShield';
  root.visible = false;
  parent.add(root);

  const faceMaterial = new THREE.MeshStandardMaterial({
    name: 'TrainingShieldFace',
    color: '#53615b',
    metalness: 0.24,
    roughness: 0.58,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    name: 'TrainingShieldRim',
    color: '#26342f',
    metalness: 0.72,
    roughness: 0.34,
  });

  const faceGeometry = new THREE.CylinderGeometry(0.29, 0.27, 0.045, 24, 1);
  faceGeometry.rotateX(Math.PI / 2);
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.name = 'ShieldFace';

  const rimGeometry = new THREE.TorusGeometry(0.285, 0.022, 7, 28);
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.name = 'ShieldRim';
  rim.position.z = 0.03;

  const bossGeometry = new THREE.SphereGeometry(0.085, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const boss = new THREE.Mesh(bossGeometry, rimMaterial);
  boss.name = 'ShieldBoss';
  boss.rotation.x = Math.PI / 2;
  boss.position.z = 0.04;

  root.add(face, rim, boss);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  root.userData.sculptRuntime = {
    parts: { face, rim, boss },
    attachment: { parent: parent.name, contactType: 'forearm-strapped', forearm: 'LeftForeArm' },
  };

  return {
    root,
    setVisible(visible) {
      root.visible = visible;
    },
    dispose() {
      parent.remove(root);
      faceGeometry.dispose();
      rimGeometry.dispose();
      bossGeometry.dispose();
      faceMaterial.dispose();
      rimMaterial.dispose();
    },
  };
}
