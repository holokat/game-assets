import * as THREE from 'three';

export function createHandPumpMaterials() {
  const make = (name, color, roughness, metalness) => new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness,
    flatShading: true,
    vertexColors: true,
  });
  return {
    teal: make('infra-painted-teal-mat', '#3d7772', 0.72, 0.48),
    tealLight: make('infra-painted-teal-light-mat', '#5c9188', 0.67, 0.42),
    iron: make('infra-dark-iron-mat', '#68716b', 0.54, 0.62),
    wood: make('infra-wood-grip-mat', '#ad6929', 0.51, 0),
    woodEnd: make('infra-wood-end-mat', '#754116', 0.58, 0),
    blockout: new THREE.MeshStandardMaterial({ name: 'infra-blockout-mat', color: '#b6aaa0', roughness: 0.9, metalness: 0, flatShading: true }),
  };
}

export function createWellMaterials() {
  const make = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness,
    flatShading: true,
    vertexColors: true,
  });
  const stoneDark = make('well-shaft-cavity-mat', '#292825', 0.94);
  stoneDark.side = THREE.DoubleSide;
  return {
    stone: make('well-warm-stone-mat', '#978e7b', 0.82),
    stoneDark,
    timber: make('well-structural-timber-mat', '#664b35', 0.78),
    bucketWood: make('well-bucket-wood-mat', '#684832', 0.76),
    rope: make('well-dark-rope-mat', '#3c3329', 0.92),
    iron: make('well-dark-iron-mat', '#62625b', 0.66, 0.4),
    blockout: new THREE.MeshStandardMaterial({ name: 'well-blockout-mat', color: '#b6aaa0', roughness: 0.9, flatShading: true }),
  };
}
