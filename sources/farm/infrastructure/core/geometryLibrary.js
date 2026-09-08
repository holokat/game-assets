import * as THREE from 'three';

function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function faceted(geometry, seed) {
  let result = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geometry.dispose();
  result.computeVertexNormals();
  const position = result.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const base = hash(seed);
  for (let index = 0; index < position.count; index += 3) {
    const tone = 0.92 + (((base ^ (index * 2654435761)) >>> 0) & 255) / 2550;
    for (let corner = 0; corner < 3; corner += 1) {
      colors[(index + corner) * 3] = tone;
      colors[(index + corner) * 3 + 1] = tone;
      colors[(index + corner) * 3 + 2] = tone;
    }
  }
  result.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return result;
}

export function beamBetween(start, end, radius, segments = 6) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const length = a.distanceTo(b);
  const geometry = new THREE.CylinderGeometry(radius * 0.92, radius, length, segments, 1, false);
  geometry.translate(0, length / 2, 0);
  geometry.rotateX(Math.PI / 2);
  const direction = b.clone().sub(a).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  geometry.applyQuaternion(quaternion);
  geometry.translate(...start);
  return geometry;
}

export function tubeThrough(points, radius, radialSegments = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'centripetal');
  return new THREE.TubeGeometry(curve, Math.max(4, points.length * 2), radius, radialSegments, false);
}
