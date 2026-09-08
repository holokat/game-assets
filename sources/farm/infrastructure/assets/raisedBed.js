import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';

export const RAISED_BED_PASSES = Object.freeze(['blockout', 'structure', 'detail', 'material', 'interaction', 'optimization']);
const material = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: false });
const addMesh = (ctx, parent, id, geometry, mat, group, pass) => registerMesh(ctx, parent, id, new THREE.Mesh(geometry, mat), group, pass);

export function createRaisedBed() {
  const ctx = createAssetContext('raised-bed', { label: 'Raised Bed', targetLengthMetres: 3.2 });
  ctx.materials = {
    timber: material('raised-bed-honey-timber-mat', '#a8733c', 0.78),
    soil: material('raised-bed-dark-soil-mat', '#39291e', 0.96),
    seedlings: material('raised-bed-muted-seedling-mat', '#69713b', 0.9),
    metal: material('raised-bed-dark-bracket-mat', '#3f4642', 0.48, 0.58),
  };
  const { model } = ctx;
  addSocket(ctx, model, 'ground', [0, 0, 0]);
  addSocket(ctx, model, 'west-bed-attach', [-1.62, 0.52, 0]);
  addSocket(ctx, model, 'east-bed-attach', [1.62, 0.52, 0]);

  const frame = addPivot(ctx, model, 'timber-frame');
  const postPositions = [[-1.55, -0.55], [-1.55, 0.55], [1.55, -0.55], [1.55, 0.55]];
  postPositions.forEach(([x, z], index) => {
    const post = addMesh(ctx, frame, `corner-post-${index + 1}`, new THREE.BoxGeometry(0.18, 0.84, 0.18), ctx.materials.timber, 'timber-frame', 'structure');
    post.position.set(x, 0.42, z);
  });
  for (const y of [0.23, 0.53]) {
    for (const z of [-0.51, 0.51]) {
      const plank = addMesh(ctx, frame, `long-plank-${y}-${z}`, new THREE.BoxGeometry(3.12, 0.25, 0.11), ctx.materials.timber, 'timber-frame', 'structure');
      plank.position.set(0, y, z);
    }
    for (const x of [-1.51, 1.51]) {
      const plank = addMesh(ctx, frame, `end-plank-${y}-${x}`, new THREE.BoxGeometry(0.11, 0.25, 1.12), ctx.materials.timber, 'timber-frame', 'structure');
      plank.position.set(x, y, 0);
    }
  }
  addCollider(ctx, frame, 'raised-bed', 'box', [0, 0.42, 0], { width: 3.2, height: 0.84, depth: 1.2, isTrigger: false });

  const soil = addPivot(ctx, model, 'inset-soil');
  const soilMesh = addMesh(ctx, soil, 'soil-inset', new THREE.BoxGeometry(2.93, 0.16, 0.94), ctx.materials.soil, 'soil', 'structure');
  soilMesh.position.y = 0.66;
  addSocket(ctx, soil, 'planting-surface', [0, 0.75, 0]);

  const rows = addPivot(ctx, soil, 'planting-rows');
  for (let row = 0; row < 6; row += 1) {
    const z = -0.34 + row * 0.136;
    const ridge = addMesh(ctx, rows, `plant-row-${row + 1}`, new THREE.BoxGeometry(2.52, 0.055, 0.07), ctx.materials.seedlings, 'planting-rows', 'detail');
    ridge.position.set(0, 0.765, z);
    for (let plant = 0; plant < 4; plant += 1) {
      const sprout = addMesh(ctx, rows, `seedling-${row + 1}-${plant + 1}`, new THREE.OctahedronGeometry(0.055, 0), ctx.materials.seedlings, 'planting-rows', 'detail');
      sprout.position.set(-0.9 + plant * 0.6, 0.82, z + (plant % 2 ? 0.014 : -0.014));
      sprout.scale.y = 1.4;
    }
  }

  const hardware = addPivot(ctx, frame, 'corner-hardware');
  postPositions.forEach(([x, z], index) => {
    const bracket = addMesh(ctx, hardware, `corner-bracket-${index + 1}`, new THREE.BoxGeometry(0.035, 0.15, 0.18), ctx.materials.metal, 'hardware', 'detail');
    bracket.position.set(x + (x < 0 ? -0.102 : 0.102), 0.52, z);
  });
  const inlet = addPivot(ctx, model, 'irrigation-inlet', [-1.575, 0.28, 0]);
  const inletMesh = addMesh(ctx, inlet, 'inlet-collar', new THREE.CylinderGeometry(0.12, 0.12, 0.09, 8), ctx.materials.metal, 'irrigation-inlet', 'interaction');
  inletMesh.rotation.z = Math.PI / 2;
  const inletVoid = addMesh(ctx, inlet, 'inlet-void', new THREE.CylinderGeometry(0.067, 0.067, 0.095, 8), ctx.materials.soil, 'irrigation-inlet', 'interaction');
  inletVoid.rotation.z = Math.PI / 2;
  addSocket(ctx, inlet, 'irrigation-inlet-attach', [-0.06, 0, 0]);

  const root = finishAsset(ctx);
  root.userData.artDirection = { lengthMetres: 3.2, forwardAxis: '+Z', note: 'Static waist-low timber raised bed with six planting rows and an end irrigation inlet.' };
  return root;
}
