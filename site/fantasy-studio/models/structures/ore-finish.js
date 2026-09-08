import * as THREE from 'three';
import {random} from './primitives.js';

const host = ['#292825', '#34312c', '#40382f', '#302e2b'].map(hex => new THREE.Color(hex));
const copper = new THREE.Color('#a3633c');
const gold = new THREE.Color('#b68b3d');

/** Color existing closed rock facets, keeping the load geometry unchanged. */
export function finishOreRock(k, mesh, seed) {
  const material = k.mat('#ffffff');
  material.name = 'Dark mineral ore';
  material.roughness = .86;
  material.metalness = .12;
  mesh.material = material;
  mesh.userData.surface = 'Dark mineral ore with copper and gold flecks';
  const colors = mesh.geometry.attributes.color;
  const normal = mesh.geometry.attributes.normal;
  const rng = random(`mineral finish ${seed}`);
  for (let i = 0; i < colors.count; i += 3) {
    const inclusion = rng();
    const mineral = normal.getY(i) > -.25 && inclusion < .12;
    const color = mineral ? (inclusion < .025 ? gold : copper) : host[seed % host.length];
    const shade = .85 + rng() * .3;
    for (let j = 0; j < 3; j++) {
      colors.setXYZ(i + j, color.r * shade, color.g * shade, color.b * shade);
    }
  }
  colors.needsUpdate = true;
  return mesh;
}
