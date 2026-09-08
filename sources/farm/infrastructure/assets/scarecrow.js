import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = .65) => new THREE.MeshStandardMaterial({ name, color, roughness, flatShading: true, vertexColors: true });
const mesh = (c, parent, id, geometry, mat, group) => registerMesh(c, parent, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), mat), group);

export function createScarecrow() {
  const c = createAssetContext('scarecrow'), { model } = c;
  const timber = material('scarecrow-timber', '#63503a');
  const coat = material('scarecrow-cloth-coat', '#6d6045');
  const trousers = material('scarecrow-cloth-trousers', '#48545a');
  const straw = material('scarecrow-straw', '#c6a860');
  const rope = material('scarecrow-rope', '#8e7953');
  addSocket(c, model, 'ground', [0, 0, 0]);
  const body = addPivot(c, model, 'scarecrow-body', [0, 0, 0]);
  const stake = mesh(c, body, 'ground-stake', new THREE.ConeGeometry(.13, .38, 6), timber, 'pole'); stake.position.y = .19; stake.rotation.x = Math.PI;
  const pole = mesh(c, body, 'tall-pole', new THREE.CylinderGeometry(.07, .08, 2.28, 6), timber, 'pole'); pole.position.y = 1.33;
  const cross = mesh(c, body, 'cross-timber', new THREE.BoxGeometry(1.85, .1, .1), timber, 'pole'); cross.position.y = 1.82;
  const torso = mesh(c, body, 'narrow-torso', new THREE.ConeGeometry(.25, .19, .78, 5), coat, 'body'); torso.position.y = 1.43;
  const trousersNode = mesh(c, body, 'slim-trousers', new THREE.BoxGeometry(.34, .54, .2), trousers, 'body'); trousersNode.position.y = .88;
  for (const x of [-.72, .72]) { const sleeve = mesh(c, body, 'outstretched-sleeve', new THREE.ConeGeometry(.16, .1, .62, 5), coat, 'body'); sleeve.position.set(x, 1.77, 0); sleeve.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2; const hand = mesh(c, body, 'straw-hand', new THREE.ConeGeometry(.09, .05, .22, 5), straw, 'body'); hand.position.set(x * 1.25, 1.77, 0); hand.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2; }
  const head = mesh(c, body, 'sack-head', new THREE.DodecahedronGeometry(.19, 0), straw, 'head'); head.position.y = 2.12;
  const hatBrim = mesh(c, body, 'thin-straw-hat-brim', new THREE.CylinderGeometry(.36, .36, .045, 8), straw, 'head'); hatBrim.position.y = 2.27;
  const hatCrown = mesh(c, body, 'straw-hat-crown', new THREE.CylinderGeometry(.15, .18, .16, 7), straw, 'head'); hatCrown.position.y = 2.36;
  for (const y of [1.02, 1.61]) { const tie = mesh(c, body, 'rope-tie', new THREE.TorusGeometry(.12, .022, 4, 8), rope, 'ties'); tie.position.y = y; tie.rotation.x = Math.PI / 2; }
  addSocket(c, body, 'attachment', [0, 1.82, 0]);
  addSocket(c, body, 'interaction', [0, 1.4, .24]);
  addSocket(c, body, 'destruction', [0, 1.0, -.15]);
  addCollider(c, body, 'pole', 'capsule', [0, 1.18, 0], { radius: .1, height: 2.35, isTrigger: false });
  addCollider(c, body, 'body', 'box', [0, 1.46, 0], { width: .56, height: .9, depth: .32, isTrigger: false });
  return finishAsset(c);
}
