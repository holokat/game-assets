import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted, tubeThrough } from '../core/geometryLibrary.js';

const material = (name, color, roughness = .65, opacity = 1) => new THREE.MeshStandardMaterial({ name, color, roughness, transparent: opacity < 1, opacity, side: THREE.DoubleSide, flatShading: true, vertexColors: true });
const mesh = (c, parent, id, geometry, mat, group) => registerMesh(c, parent, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), mat), group);

export function createCropNetting() {
  const c = createAssetContext('crop-netting'), { model } = c;
  const timber = material('crop-netting-timber', '#936f3f');
  const metal = material('crop-netting-hoops', '#495253', .45);
  const net = material('crop-netting-faceted-mesh', '#b8c3be', .7, .42);
  const flap = material('crop-netting-flap', '#c4ccc6', .7, .58);
  addSocket(c, model, 'ground', [0, 0, 0]);
  const shelter = addPivot(c, model, 'tunnel-frame', [0, 0, 0]);
  for (const x of [-.75, .75]) { const curb = mesh(c, shelter, 'timber-curb', new THREE.BoxGeometry(.13, .18, 3.8), timber, 'base'); curb.position.set(x, .09, 0); }
  for (const z of [-1.9, 1.9]) { const endCurb = mesh(c, shelter, 'timber-end-curb', new THREE.BoxGeometry(1.62, .18, .13), timber, 'base'); endCurb.position.set(0, .09, z); }
  for (const z of [-1.8, -1.08, -.36, .36, 1.08, 1.8]) { const hoop = mesh(c, shelter, 'six-hoop-frame', tubeThrough([[-.75,.12,z],[-.75,.66,z],[-.48,1.1,z],[0,1.28,z],[.48,1.1,z],[.75,.66,z],[.75,.12,z]], .035, 6), metal, 'frame'); hoop.userData.attachment = { parentSocket: 'ground', localStart: [-.75,.12,z], localEnd: [.75,.12,z], contactType: 'embedded', embedDepth: .04, gapTolerance: .01 }; for (const x of [-.83,.83]) { const anchor = mesh(c, shelter, 'ground-anchor', new THREE.ConeGeometry(.08,.28,5), metal, 'anchors'); anchor.position.set(x,.14,z); anchor.rotation.x=Math.PI; } }
  const canopy = mesh(c, shelter, 'faceted-net-canopy', new THREE.CylinderGeometry(.76,.76,3.72,8,1,true,Math.PI,Math.PI).rotateX(Math.PI/2), net, 'mesh'); canopy.position.y = .76;
  const frontFlap = addPivot(c, shelter, 'front-rolled-flap', [0, 1.0, 1.91]);
  const roll = mesh(c, frontFlap, 'rolled-access-flap', new THREE.CylinderGeometry(.07,.07,1.32,7), flap, 'access'); roll.rotation.z=Math.PI/2;
  const frontPanel = mesh(c, frontFlap, 'front-net-panel', new THREE.PlaneGeometry(1.38,.88,4,3), flap, 'access'); frontPanel.position.y=-.43;
  addSocket(c, shelter, 'terrain-anchor', [0,0,0]);
  addSocket(c, shelter, 'adjacency-north', [0,0,-1.98]);
  addSocket(c, shelter, 'adjacency-south', [0,0,1.98]);
  addSocket(c, shelter, 'protection', [0,1.25,0]);
  addSocket(c, shelter, 'service', [-.86,.22,0]);
  addSocket(c, frontFlap, 'access', [0,.4,.08]);
  addCollider(c, shelter, 'base', 'box', [0,.09,0], { width:1.62,height:.18,depth:3.8,isTrigger:false });
  addCollider(c, shelter, 'volume', 'box', [0,.68,0], { width:1.5,height:1.35,depth:3.72,isTrigger:true });
  return finishAsset(c);
}
