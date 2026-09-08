import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {applyReadyEquipmentPose} from '../models/equipment-grips.js';
import {applyTwoHandedEquipmentPose} from '../models/two-handed-grips.js';
import {applyShieldEquipmentPose} from '../models/shield-grips.js';
import {createHandheldItem,disposeItem} from '../models/weapons.js';

/** Bow draw buffers are mutable; a skeleton clone still shares those buffers. */
function restoreBowGeometry(item,ownedGeometry){
 const rest=createHandheldItem(item.userData.itemId),meshes=new Map();
 try{
  rest.traverse(mesh=>{
   if(!mesh.isMesh)return;
   if(!meshes.has(mesh.name))meshes.set(mesh.name,[]);
   meshes.get(mesh.name).push(mesh);
  });
  item.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const source=meshes.get(mesh.name)?.shift();
   mesh.geometry=(source?.geometry||mesh.geometry).clone();ownedGeometry.add(mesh.geometry);
  });
 }finally{disposeItem(rest);}
}

function prepareEquipment(actor,model,ownedGeometry){
 const originals=[],copies=[];actor.group.traverse(node=>originals.push(node));model.traverse(node=>copies.push(node));
 const nodes=new Map(originals.map((node,index)=>[node,copies[index]])),joints={};
 for(const node of copies){
  if(node.userData.previewRest){node.position.fromArray(node.userData.previewRest.position);node.quaternion.fromArray(node.userData.previewRest.quaternion);}
  if(!node.isBone)continue;
  joints[node.name]=node;const rest=actor.rig.rest[node.name];
  if(rest){node.position.copy(rest.p);node.quaternion.copy(rest.q);node.scale.copy(rest.s);}
 }
 // Object3D.clone serializes userData. Recover real cloned loadout nodes before posing.
 const loadout=(actor.group.userData.loadout||[]).map(item=>nodes.get(item));
 model.userData.loadout=loadout;
 const rig={group:model,joints,rest:actor.rig.rest,bodyType:actor.rig.bodyType,style:actor.rig.style,
  gripPoints:Object.fromEntries(Object.entries(actor.rig.gripPoints||{}).map(([side,point])=>[side,point.clone()])),
 };
 for(const item of loadout)if(item.userData.twoHandedGrip?.kind==='bow')restoreBowGeometry(item,ownedGeometry);
 model.updateMatrixWorld(true);applyReadyEquipmentPose(rig);applyTwoHandedEquipmentPose(rig);applyShieldEquipmentPose(rig);
 for(const item of loadout){
  const profile=item.userData.twoHandedGrip;if(!profile||profile.kind==='staff')continue;
  const side=profile.kind==='bow'?'L':'R';
  joints['hand'+side].attach(item);item.userData.mountedHand=side;
 }
 // Keep only serializable equipment metadata in the GLB, without nested model copies.
 delete model.userData.loadout;
}

export async function exportCharacter(actor){
 const model=clone(actor.group),skeletons=new Set(),ownedGeometry=new Set();model.rotation.set(0,0,0);
 model.traverse(node=>{if(node.isSkinnedMesh)skeletons.add(node.skeleton);});
 try{
  prepareEquipment(actor,model,ownedGeometry);
  const root=new THREE.Group();root.name='Character';root.rotation.x=-Math.PI/2;root.add(model);
  root.updateMatrixWorld(true);for(const skeleton of skeletons)skeleton.update();
  return await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true,trs:true});
 }finally{for(const skeleton of skeletons)skeleton.dispose();for(const geometry of ownedGeometry)geometry.dispose();}
}
export function downloadBlob(data,type,filename){
 const blob=data instanceof Blob?data:new Blob([data],{type});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
