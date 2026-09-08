import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {structureById} from '../data/structure-catalog.js';
import {disposeStructure} from './structures/primitives.js';
import {atlasStructure} from './structures/material-atlas.js';

const familyIds = {
 buildings: new Set('chapel manor gate_tower inn bank stable smithy cottage_a cottage_b cottage_c healer mill millers_house granary foremans_hut chapel_sunken'.split(' ')),
 landscape: new Set('waystone_village flint_wall_4m flint_wall_corner hedge_4m stone_bridge_10m stable_pen mound_fence lane_slab boundary_stone eel_weir footbridge stepping_stones fallen_beech badger_sett rooting_patch chalk_face_4m headframe mine_mouth spoil_heap rail_2m cellar_arch camp_fence milestone road_kerb road_slab_2m lookout_platform palisade_stake_3m headstone_a headstone_b headstone_c headstone_d headstone_e lily_pad_patch stone_wall_4m fence_rail_3m'.split(' ')),
};
const loaders = {
 buildings: () => import('./structures/buildings/index.js'),
 landscape: () => import('./structures/landscape/index.js'),
 props: () => import('./structures/props/index.js'),
};
export function structureFamily(id) { return Object.entries(familyIds).find(([,ids])=>ids.has(id))?.[0] || 'props'; }
function materialKey(m){return JSON.stringify([m.name,m.color.toArray(),m.roughness,m.metalness,m.emissive.toArray(),m.emissiveIntensity,m.side,m.transparent,m.opacity]);}

/** Native metre-scale Y-up models. Presentation transforms and light rigs stay outside this root. */
export async function createStructureModel(id,{batch=true}={}) {
 const entry=structureById.get(id);if(!entry)throw new Error(`Unknown structure: ${id}`);
 const {buildStructure}=await loaders[structureFamily(id)]();
 const root=buildStructure(id);root.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(root,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 if(size.toArray().some(n=>!Number.isFinite(n)||n<=0)){disposeStructure(root);throw new Error(`Invalid structure bounds: ${id}`);}
 const [w,d,h]=entry.size,scale=new THREE.Vector3(w/size.x,h/size.y,d/size.z);
 const normalize=new THREE.Matrix4().makeScale(...scale.toArray()).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const output=new THREE.Group();output.name=id;
 const buckets=new Map(),parts=[],features=new Set(),effectSockets=[];let triangles=0;
 root.traverse(o=>{
  for(const f of o.userData.features||[])features.add(f);
  if(o.userData.smokeSocket){const position=new THREE.Vector3().fromArray(o.userData.smokeSocket.position).applyMatrix4(o.matrixWorld).applyMatrix4(normalize);effectSockets.push({effect:'chimney_smoke',position:position.toArray(),direction:[0,1,0]});}
  if(!o.isMesh)return;
  const g=o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize,o.matrixWorld));
  if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const original=Array.isArray(o.material)?o.material[0]:o.material;
  const key=batch?materialKey(original):`${materialKey(original)}:${parts.length}`;
  if(!buckets.has(key))buckets.set(key,{material:original.clone(),geometries:[],names:[]});
  const bucket=buckets.get(key);bucket.geometries.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();bucket.names.push(o.name);
  parts.push(o.name);triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
 });
 if(batch)output.add(atlasStructure(buckets));
 else for(const {material,geometries,names} of buckets.values()){
  const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();
  if(!geometry){disposeStructure(root);disposeStructure(output);throw new Error(`Could not batch ${id}`);}
  const mesh=new THREE.Mesh(geometry,material);mesh.name=batch?material.name:names[0];mesh.castShadow=true;mesh.receiveShadow=true;output.add(mesh);
 }
 output.userData={structureId:id,source:'https://kaldera-codex.cogentgene.workers.dev/structures',dimensions:{width:w,depth:d,height:h},units:'metres',upAxis:'Y',features:[...features],parts:parts.length,triangles,drawCalls:output.children.length,runtimeTriangleBudget:h<2?800:h<4?(/bridge|well|pavilion/.test(id)?2500:1500):h<7?8000:15000};
 if(id==='mill_wheel'){
  const pivot=new THREE.Group();pivot.name='mill_wheel_pivot';pivot.position.y=h/2;output.add(pivot);
  for(const mesh of [...output.children])if(mesh!==pivot){mesh.position.y=-h/2;pivot.add(mesh);}
  pivot.userData.rotationAxis='X';output.userData.movingPart='mill_wheel_pivot';
 }
 if(effectSockets.length){output.userData.effectSockets=effectSockets;effectSockets.forEach((socket,i)=>{const node=new THREE.Object3D();node.name=`chimney_smoke_socket_${i+1}`;node.position.fromArray(socket.position);node.userData.effect=socket.effect;output.add(node);});}
 disposeStructure(root);return output;
}
export {disposeStructure};
