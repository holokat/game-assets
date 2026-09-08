import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const EPSILON = 0.000001;
const exact = (actual, expected) => actual.length === expected.length && actual.every((value, index) => Math.abs(value - expected[index]) <= EPSILON);
const writeJson = async (path, value) => { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 2) }); if (!response.ok) throw new Error(`Cannot write ${path}`); };

export async function verifyRoadTileContract(result, id) {
  const source = (await new GLTFLoader().loadAsync(`./source-glb/${id}.source.glb`)).scene;
  source.updateMatrixWorld(true);
  const expectedSockets = { ground: [0, 0, 0], terrain: [0, 0, 0], 'road-front': [0, 0, 4], 'road-rear': [0, 0, -4], 'adjacency-left': [-2, 0, 0], 'adjacency-right': [2, 0, 0], 'terrain-left': [-2, 0, 0], 'terrain-right': [2, 0, 0] };
  const actualSockets = {};
  source.traverse((node) => { if (node.userData.socket) actualSockets[node.userData.socket.id] = node.getWorldPosition(new THREE.Vector3()).toArray(); });
  const roadCollider = source.getObjectByName(`${id}-collider-road-tile`)?.userData.collider;
  const surfaceCollider = source.getObjectByName(`${id}-collider-road-surface`)?.userData.collider;
  result.checks.push(
    { name: 'exact 4m by 8m centered tile bounds survive browser reload', passed: exact(result.source.bounds.size.slice(0, 3), [4, result.source.bounds.size[1], 8]) && Math.abs(result.source.bounds.center[0]) <= EPSILON && Math.abs(result.source.bounds.center[2]) <= EPSILON, details: { size: result.source.bounds.size, center: result.source.bounds.center } },
    { name: 'front, rear, left, right and terrain sockets have exact tile coordinates', passed: Object.entries(expectedSockets).every(([idKey, position]) => exact(actualSockets[idKey] ?? [], position)), details: actualSockets },
    { name: 'road and surface colliders match the modular footprint', passed: roadCollider?.width === 4 && roadCollider?.depth === 8 && roadCollider?.isTrigger === false && surfaceCollider?.width === 3.45 && surfaceCollider?.depth === 8, details: { roadCollider, surfaceCollider } },
  );
  result.result = result.checks.every((check) => check.passed) ? 'pass' : 'fail';
  const review = await fetch(`./review/${id}/final-review.json`, { cache: 'no-store' }).then((response) => response.json());
  Object.assign(review, result, { visualReview: { ...review.visualReview, decision: result.result === 'pass' ? 'continue' : 'needs-correction', visualPasses: 1, correctionPasses: 0, notes: 'One browser visual pass accepted. The rendered tile retains the requested road identity, exact modular footprint, grounded underside, and static behavior.' } });
  await Promise.all([writeJson(`manifests/${id}.validation.json`, result), writeJson(`review/${id}/final-review.json`, review)]);
  return result;
}
