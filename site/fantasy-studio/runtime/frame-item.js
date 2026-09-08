import * as THREE from 'three';

export const itemViewDirections = Object.freeze({
  front: [0, -1, 0.06], side: [1, 0, 0.08], back: [0, 1, 0.08],
  three: [0.55, -1, 0.34], face: [0.3, -1, 0.2],
  top: [0, 0, 1], overhead: [0.3, -0.5, 1], bottom: [0, 0, -1],
});

/** Fit all eight corners, including depth, within the current camera aspect. */
export function frameItem(camera, bounds, {view = 'three', padding = 1.18, controls} = {}) {
  const direction = new THREE.Vector3(...(itemViewDirections[view] || itemViewDirections.three)).normalize();
  if (controls && Math.abs(direction.z) > .999) direction.y = -.0001;
  direction.normalize();
  const cameraUp = new THREE.Vector3(...(Math.abs(direction.z) > .999 && !controls ? [0, 1, 0] : [0, 0, 1]));
  const center = bounds.getCenter(new THREE.Vector3());
  const right = new THREE.Vector3().crossVectors(cameraUp, direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tangentY = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tangentX = tangentY * camera.aspect;
  let distance = 0;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const offset = new THREE.Vector3(x, y, z).sub(center);
    distance = Math.max(distance, padding * Math.max(Math.abs(offset.dot(right)) / tangentX, Math.abs(offset.dot(up)) / tangentY) + offset.dot(direction));
  }
  distance = Math.max(distance, camera.near * 4, controls?.minDistance || 0.01);
  const damping = controls?.enableDamping;
  if (controls) {
    controls.enableDamping = false;
    controls.update();
    controls.target.copy(center);
  }
  camera.up.copy(cameraUp);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  if (controls) { controls.update(); controls.enableDamping = damping; }
  return {center, distance};
}
