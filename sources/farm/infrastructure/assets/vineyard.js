import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';

export const VINEYARD_PASSES = Object.freeze(['blockout', 'trellis-structure', 'vine-detail', 'material', 'interaction', 'optimization']);
const material = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: false });
const addMesh = (ctx, parent, id, geometry, mat, group, pass) => registerMesh(ctx, parent, id, new THREE.Mesh(geometry, mat), group, pass);

export function createVineyard() {
  const ctx = createAssetContext('vineyard', { label: 'Vineyard', targetLengthMetres: 4 });
  ctx.materials = { timber: material('vineyard-honey-timber-mat', '#a57745', 0.8), soil: material('vineyard-cultivated-soil-mat', '#403025', 0.95), wire: material('vineyard-charcoal-wire-mat', '#34383a', 0.42, 0.65), vine: material('vineyard-muted-vine-mat', '#65713e', 0.88), irrigation: material('vineyard-irrigation-mat', '#526a6d', 0.62, 0.32) };
  const { model } = ctx;
  addSocket(ctx, model, 'terrain-anchor', [0, 0, 0]); addSocket(ctx, model, 'west-adjacency', [-2.08, 0, 0]); addSocket(ctx, model, 'east-adjacency', [2.08, 0, 0]); addSocket(ctx, model, 'irrigation-feed', [-2.04, 0.1, -1.1]); addSocket(ctx, model, 'harvest-service', [0, 0.16, 0]);
  const soilRows = addPivot(ctx, model, 'soil-row-beds'); const trellises = addPivot(ctx, model, 'trellis-rows'); const vines = addPivot(ctx, model, 'vine-clusters'); const service = addPivot(ctx, model, 'service-infrastructure');
  const rowZ = [-0.94, 0, 0.94]; const postGeometry = new THREE.BoxGeometry(0.12, 1.35, 0.12); const postMesh = new THREE.InstancedMesh(postGeometry, ctx.materials.timber, 12); postMesh.name = 'vineyard-shared-trellis-posts-mesh'; postMesh.castShadow = true; postMesh.receiveShadow = true; postMesh.userData.minimumPass = 'trellis-structure'; postMesh.userData.destructionGroup = 'trellis-posts'; trellises.add(postMesh); ctx.nodes[postMesh.name] = postMesh; ctx.destructionGroups['trellis-posts'] = [postMesh.name];
  const matrix = new THREE.Matrix4(); let postIndex = 0;
  rowZ.forEach((z, row) => {
    const soil = addMesh(ctx, soilRows, `soil-strip-${row + 1}`, new THREE.BoxGeometry(4, 0.12, 0.48), ctx.materials.soil, 'soil-rows', 'blockout'); soil.position.set(0, 0.06, z); addCollider(ctx, soilRows, `row-${row + 1}`, 'box', [0, 0.12, z], { width: 4, height: 0.24, depth: 0.52, isTrigger: false });
    [-1.82, -0.6, 0.6, 1.82].forEach((x) => { matrix.makeTranslation(x, 0.675, z); postMesh.setMatrixAt(postIndex++, matrix); });
    [0.68, 1.08].forEach((y, wire) => { const mesh = addMesh(ctx, trellises, `row-${row + 1}-wire-${wire + 1}`, new THREE.CylinderGeometry(0.018, 0.018, 3.72, 6), ctx.materials.wire, 'trellis-wires', 'trellis-structure'); mesh.position.set(0, y, z); mesh.rotation.z = Math.PI / 2; });
    const drip = addMesh(ctx, service, `row-${row + 1}-irrigation-line`, new THREE.CylinderGeometry(0.024, 0.024, 3.8, 6), ctx.materials.irrigation, 'irrigation-lines', 'interaction'); drip.position.set(0, 0.19, z - 0.16); drip.rotation.z = Math.PI / 2;
  });
  postMesh.instanceMatrix.needsUpdate = true;
  const leafGeometry = new THREE.OctahedronGeometry(0.09, 0); const leafMesh = new THREE.InstancedMesh(leafGeometry, ctx.materials.vine, 72); leafMesh.name = 'vineyard-instanced-angular-vines-mesh'; leafMesh.castShadow = true; leafMesh.receiveShadow = true; leafMesh.userData.minimumPass = 'vine-detail'; leafMesh.userData.destructionGroup = 'vine-clusters'; vines.add(leafMesh); ctx.nodes[leafMesh.name] = leafMesh; ctx.destructionGroups['vine-clusters'] = [leafMesh.name];
  let leafIndex = 0; rowZ.forEach((z, row) => { [-1.55, -1.15, -0.75, -0.35, 0.35, 0.75, 1.15, 1.55].forEach((x, cluster) => { for (let leaf = 0; leaf < 3; leaf += 1) { const offset = (leaf - 1) * 0.085; matrix.makeTranslation(x + offset * 0.3, 0.69 + (leaf % 2) * 0.25 + (cluster % 2) * 0.04, z + offset); matrix.scale(new THREE.Vector3(1.25, 1.7, 0.55)); leafMesh.setMatrixAt(leafIndex++, matrix); } }); });
  leafMesh.instanceMatrix.needsUpdate = true;
  const inlet = addMesh(ctx, service, 'irrigation-inlet-collar', new THREE.CylinderGeometry(0.11, 0.11, 0.12, 8), ctx.materials.irrigation, 'irrigation-lines', 'interaction'); inlet.position.set(-1.98, 0.18, -1.1); inlet.rotation.z = Math.PI / 2;
  const root = finishAsset(ctx); root.userData.artDirection = { lengthMetres: 4, forwardAxis: '+Z', note: 'Static three-row vineyard module with low angular vine clusters and a central service gap.' }; return root;
}
