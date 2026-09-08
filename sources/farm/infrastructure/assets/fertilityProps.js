import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';
const material=(name,color,roughness=.78)=>new THREE.MeshStandardMaterial({name,color,roughness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
const box=(c,p,id,size,pos,m,group)=>{const q=mesh(c,p,id,new THREE.BoxGeometry(...size),m,group);q.position.set(...pos);return q;};
const cylinder=(c,p,id,r,h,segs,pos,m,group)=>{const q=mesh(c,p,id,new THREE.CylinderGeometry(r,r,h,segs),m,group);q.position.set(...pos);return q;};
export function createCompostPile(){const c=createAssetContext('compost-pile',{label:'Compost Pile',targetHeightMetres:1.65}),{model}=c,m={soil:material('compost-dark-soil','#543a2a'),leaf:material('compost-dry-leaf-ochre','#a8763e'),green:material('compost-organic-green','#627642'),timber:material('compost-weathered-timber','#735238'),pipe:material('compost-aeration-pipe','#66706b')},pile=addPivot(c,model,'compost-mound'),edge=addPivot(c,model,'timber-edging'),tools=addPivot(c,model,'turning-tool');
 box(c,pile,'grounded-compost-base',[3.9,.12,3.1],[0,.06,0],m.soil,'compost');
 const lower=mesh(c,pile,'faceted-dark-compost-mound',new THREE.ConeGeometry(1.7,.95,8),m.soil,'compost');lower.position.y=.52;lower.scale.z=.8;
 const leaf=mesh(c,pile,'visible-dry-leaf-band',new THREE.CylinderGeometry(1.48,1.62,.14,8),m.leaf,'layers');leaf.position.y=.34;leaf.scale.z=.82;
 const scraps=mesh(c,pile,'green-organic-scrap-layer',new THREE.CylinderGeometry(1.08,1.35,.13,8),m.green,'layers');scraps.position.y=.67;scraps.scale.z=.8;
 for(const [i,x,z] of [[1,-1.92,-1.46],[2,1.92,-1.46],[3,-1.92,1.46],[4,1.92,1.46]])box(c,edge,`low-timber-edge-${i}`,[.18,.36,3.15],[x,.18,z],m.timber,'timber-edging');
 for(const [i,z] of [[5,-1.46],[6,1.46]])box(c,edge,`low-timber-side-${i}`,[3.85,.36,.18],[0,.18,z],m.timber,'timber-edging');
 const pipe=cylinder(c,pile,'inset-aeration-pipe',.13,.84,7,[.98,.66,.35],m.pipe,'aeration');pipe.rotation.z=.16;
 const handle=box(c,tools,'wooden-turning-fork-handle',[.11,1.5,.11],[-1.9,.95,.9],m.timber,'turning-tool');handle.rotation.z=-.34;const head=box(c,tools,'turning-fork-head',[.58,.12,.12],[-2.13,.33,.9],m.pipe,'turning-tool');head.rotation.y=.15;
 for(let i=0;i<3;i++){const tine=box(c,tools,`fork-tine-${i+1}`,[.05,.3,.05],[-2.36+i*.22,.19,.9],m.pipe,'turning-tool');tine.rotation.z=-.08;}
 const sockets=[['ground',[0,0,0]],['terrain',[0,0,0]],['organic-input',[0,.8,1.25]],['compost-output',[0,.5,-1.3]],['aeration',[.98,.66,.35]],['tool',[-1.9,.95,.9]],['interaction',[0,.6,0]],['adjacency-left',[-2.3,.1,0]],['adjacency-right',[2.3,.1,0]],['adjacency-front',[0,.1,1.8]],['adjacency-rear',[0,.1,-1.8]]];sockets.forEach(([id,pos])=>addSocket(c,model,id,pos));
 addCollider(c,pile,'compost-mound','cylinder',[0,.52,0],{radius:1.7,height:1.05,axis:'y',isTrigger:false});addCollider(c,edge,'timber-edging','box',[0,.18,0],{width:4.05,height:.36,depth:3.25,isTrigger:false});addCollider(c,pile,'organic-input-zone','box',[0,.9,0],{width:2.7,height:1.1,depth:2.25,isTrigger:true});addCollider(c,tools,'turning-tool','box',[-1.9,.95,.9],{width:.5,height:1.6,depth:.25,isTrigger:false});
 const root=finishAsset(c);root.userData.artDirection={concept:'references/concepts/compost-pile.png',identity:['grounded faceted compost mound','dry-leaf and organic layers','low timber edging','inset aeration pipe','wooden turning fork'],motion:'Static asset. No animation channels are authored.',correctionPasses:0};root.userData.qualityContract={suitability:'pass',triangleBudget:5000,optimizedDrawRange:[4,5],criticalFeatures:root.userData.artDirection.identity,reviewCamera:[-6,4,6.4]};return root;}
