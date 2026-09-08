import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = .65) => new THREE.MeshStandardMaterial({ name, color, roughness, flatShading: true, vertexColors: true });
const mesh = (c, parent, id, geometry, mat, group) => registerMesh(c, parent, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), mat), group);

export function createMushroomHouse() {
  const c = createAssetContext('mushroom-house'), { model } = c;
  const timber = material('mushroom-house-dark-timber', '#43392f');
  const roof = material('mushroom-house-roof', '#30383a');
  const panel = material('mushroom-house-wall', '#756c5b');
  const metal = material('mushroom-house-metal', '#4c5856', .48);
  const tray = material('mushroom-house-substrate', '#5a4431');
  const water = material('mushroom-house-water-barrel', '#53737c');
  addSocket(c, model, 'ground', [0, 0, 0]);
  const body = addPivot(c, model, 'building-body', [0, .1, 0]);
  mesh(c, body, 'low-curb', new THREE.BoxGeometry(2.4, .2, 1.2), panel, 'building');
  const rear = mesh(c, body, 'rear-wall', new THREE.BoxGeometry(2.25, 1.08, .07), timber, 'building'); rear.position.set(0, .62, -.54);
  for (const x of [-1.08, 1.08]) for (const z of [-.54, .54]) { const post = mesh(c, body, 'corner-post', new THREE.BoxGeometry(.09, 1.25, .09), timber, 'frame'); post.position.set(x, .72, z); }
  for (const z of [-.34, .34]) { const roofPanel = mesh(c, body, 'roof-panel', new THREE.BoxGeometry(2.55, .08, .74), roof, 'roof'); roofPanel.position.set(0, 1.35, z); roofPanel.rotation.z = z < 0 ? -.34 : .34; }
  const awning = mesh(c, body, 'entrance-awning', new THREE.BoxGeometry(.85, .07, .48), roof, 'roof'); awning.position.set(0, 1.08, .74); awning.rotation.x = -.18;
  const door = addPivot(c, body, 'front-door', [-.34, .61, .58]);
  const doorPanel = mesh(c, door, 'door-panel', new THREE.BoxGeometry(.62, 1.02, .06), timber, 'door'); doorPanel.position.x = .31;
  addChannel(c, door, 'rotation', 'y', .52, .8, 0);
  for (const x of [-1.16, 1.16]) { const shutter = mesh(c, body, 'vent-shutter', new THREE.BoxGeometry(.06, .36, .45), metal, 'ventilation'); shutter.position.set(x, .8, 0); }
  const barrel = mesh(c, body, 'external-water-barrel', new THREE.CylinderGeometry(.16, .18, .72, 8), water, 'water'); barrel.position.set(1.46, .46, -.32);
  const barrelCap = mesh(c, body, 'barrel-cap', new THREE.CylinderGeometry(.11, .11, .04, 8), metal, 'water'); barrelCap.position.set(1.46, .84, -.32);
  for (const z of [-.26, .26]) {
    const rack = addPivot(c, body, 'interior-rack', [0, .18, z]);
    for (const x of [-.72, .72]) { const leg = mesh(c, rack, 'rack-leg', new THREE.BoxGeometry(.06, .62, .06), metal, 'racks'); leg.position.set(x, .31, 0); }
    for (const y of [.28, .55]) { const shelf = mesh(c, rack, 'rack-shelf', new THREE.BoxGeometry(1.55, .05, .23), metal, 'racks'); shelf.position.set(0, y, 0); for (const x of [-.48, 0, .48]) { const substrate = mesh(c, rack, 'substrate-tray', new THREE.BoxGeometry(.38, .08, .19), tray, 'trays'); substrate.position.set(x, y + .065, 0); } }
  }
  addSocket(c, body, 'terrain-anchor', [0, 0, 0]);
  addSocket(c, body, 'water-in', [1.58, .28, -.32]);
  addSocket(c, body, 'ventilation', [1.25, .8, 0]);
  addSocket(c, body, 'service', [1.28, .2, .35]);
  addSocket(c, body, 'loading', [0, .1, .78]);
  addSocket(c, body, 'adjacency-east', [1.32, 0, 0]);
  addCollider(c, body, 'building', 'box', [0, .68, 0], { width: 2.35, height: 1.35, depth: 1.15, isTrigger: false });
  addCollider(c, body, 'rack-row-a', 'box', [0, .53, -.26], { width: 1.6, height: .7, depth: .26, isTrigger: false });
  addCollider(c, body, 'rack-row-b', 'box', [0, .53, .26], { width: 1.6, height: .7, depth: .26, isTrigger: false });
  return finishAsset(c);
}

export function animateMushroomHouse(root, time) {
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (channel) channel.node.rotation.y = Math.sin((Number.isFinite(time) ? time : 0) * channel.frequency + channel.phase) * channel.amplitude;
  return root;
}
