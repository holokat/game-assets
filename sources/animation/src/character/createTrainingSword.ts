import * as THREE from 'three';

export interface TrainingSword {
  readonly root: THREE.Group;
  readonly lowerHandSocket: THREE.Object3D;
  readonly offHandSocket: THREE.Object3D;
  readonly impactSocket: THREE.Object3D;
  setOneHanded(enabled: boolean): void;
  setVisible(visible: boolean): void;
  getImpactWorldPosition(): THREE.Vector3 | null;
  dispose(): void;
}

function markPart<T extends THREE.Object3D>(part: T, id: string): T {
  part.name = id;
  part.userData.partId = id;
  part.userData.clickable = true;
  return part;
}

function createBladeGeometry(): THREE.ExtrudeGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(-0.055, 0);
  profile.lineTo(0.055, 0);
  profile.lineTo(0.043, 1.12);
  profile.lineTo(0.018, 1.32);
  profile.lineTo(0, 1.4);
  profile.lineTo(-0.018, 1.32);
  profile.lineTo(-0.043, 1.12);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.006,
    bevelThickness: 0.004,
    curveSegments: 1,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0.009, 0);
  geometry.computeVertexNormals();
  return geometry;
}

export function createTrainingSword(parent: THREE.Object3D): TrainingSword {
  const root = new THREE.Group();
  root.name = 'TrainingSword';
  root.visible = false;
  parent.add(root);

  const steel = new THREE.MeshStandardMaterial({
    name: 'TrainingSteel',
    color: '#c8d3ce',
    metalness: 0.92,
    roughness: 0.24,
  });
  const darkSteel = new THREE.MeshStandardMaterial({
    name: 'TrainingDarkSteel',
    color: '#33413b',
    metalness: 0.76,
    roughness: 0.34,
  });
  const gripMaterial = new THREE.MeshStandardMaterial({
    name: 'TrainingGrip',
    color: '#17201c',
    metalness: 0.08,
    roughness: 0.72,
  });

  const pommel = markPart(new THREE.Group(), 'Pommel');
  pommel.position.z = -0.055;
  const pommelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.052, 0.07, 12), darkSteel);
  pommelMesh.rotation.x = Math.PI / 2;
  pommel.add(pommelMesh);

  const grip = markPart(new THREE.Group(), 'Grip');
  grip.position.z = 0.09;
  const gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.25, 12), gripMaterial);
  gripMesh.rotation.x = Math.PI / 2;
  grip.add(gripMesh);
  for (let index = 0; index < 6; index += 1) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.0325, 0.003, 5, 18), darkSteel);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.z = -0.1 + index * 0.04;
    grip.add(wrap);
  }

  const guard = markPart(new THREE.Group(), 'Guard');
  guard.position.z = 0.23;
  const guardBar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.04, 2, 1, 1), darkSteel);
  guard.add(guardBar);
  const leftQuillon = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.09, 10), darkSteel);
  leftQuillon.rotation.z = Math.PI / 2;
  leftQuillon.position.x = 0.2;
  guard.add(leftQuillon);
  const rightQuillon = leftQuillon.clone();
  rightQuillon.position.x = -0.2;
  guard.add(rightQuillon);

  const blade = markPart(new THREE.Group(), 'Blade');
  blade.position.z = 0.255;
  const bladeMesh = new THREE.Mesh(createBladeGeometry(), steel);
  blade.add(bladeMesh);
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.021, 1.16), darkSteel);
  fuller.position.z = 0.56;
  blade.add(fuller);

  const bladeTip = markPart(new THREE.Object3D(), 'BladeTip');
  bladeTip.position.z = 1.655;
  const lowerHandSocket = markPart(new THREE.Object3D(), 'LowerHandGripSocket');
  lowerHandSocket.position.z = 0;
  // The calibrated hand contact maps this sword-local +Z shaft across the
  // finger roots. This socket supplies the remaining palm-frame conversion.
  lowerHandSocket.rotation.x = Math.PI / 2;
  lowerHandSocket.rotation.y = THREE.MathUtils.degToRad(15);
  const offHandSocket = markPart(new THREE.Object3D(), 'OffHandGripSocket');
  offHandSocket.position.z = 0.155;
  offHandSocket.rotation.x = Math.PI / 2;
  // The mirrored upper palm needs a distinct roll around the same shaft axis;
  // sharing the lower-hand frame hyperextends its wrist across the handle.
  offHandSocket.rotation.y = THREE.MathUtils.degToRad(110);
  const impactSocket = markPart(new THREE.Object3D(), 'ImpactSocket');
  impactSocket.position.z = 1.36;
  root.add(pommel, grip, guard, blade, bladeTip, lowerHandSocket, offHandSocket, impactSocket);

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });

  root.userData.sculptRuntime = {
    parts: { pommel, grip, guard, blade, bladeTip },
    sockets: { lowerHandGrip: lowerHandSocket, offHandGrip: offHandSocket, impact: impactSocket },
    colliders: [
      { id: 'blade-trigger', type: 'capsule', radius: 0.055, length: 1.46, trigger: true },
    ],
    destructionGroups: [],
    attachment: {
      parent: parent.name,
      contactType: 'constrained-prop',
      lowerHand: 'RightHand',
      upperHand: 'LeftHand',
    },
  };

  const impactPosition = new THREE.Vector3();
  return {
    root,
    lowerHandSocket,
    offHandSocket,
    impactSocket,
    setOneHanded(enabled) {
      // The external one-handed strikes were authored for a shorter sword.
      // Keep the calibrated handle fixed while resizing its blade and VFX reach.
      const bladeScale = enabled ? 0.62 : 1;
      blade.scale.z = bladeScale;
      bladeTip.position.z = blade.position.z + 1.4 * bladeScale;
      impactSocket.position.z = blade.position.z + (1.36 - blade.position.z) * bladeScale;
    },
    setVisible(visible) {
      root.visible = visible;
    },
    getImpactWorldPosition() {
      if (!root.visible) return null;
      root.updateWorldMatrix(true, true);
      return impactSocket.getWorldPosition(impactPosition).clone();
    },
    dispose() {
      parent.remove(root);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
      });
      steel.dispose();
      darkSteel.dispose();
      gripMaterial.dispose();
    },
  };
}
