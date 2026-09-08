import * as THREE from 'three';
import {addChannel,addCollider,addPivot,addSocket,createAssetContext,finishAsset,registerMesh} from '../core/assetContext.js';
import {faceted} from '../core/geometryLibrary.js';
const material=(name,color,roughness=.62)=>new THREE.MeshStandardMaterial({name,color,roughness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
export function createCowBarn(){
 const c=createAssetContext('cow-barn'),{model}=c,stone=material('cow-barn-stone-foundation','#837a6d'),timber=material('cow-barn-weathered-timber','#76583e'),roof=material('cow-barn-galvanized-roof','#657378',.42),iron=material('cow-barn-dark-iron','#354043',.42),trough=material('cow-barn-feed-trough','#9a907e');
 addSocket(c,model,'ground',[0,0,0]);const barn=addPivot(c,model,'long-cow-barn-structure',[0,0,0]);
 const foundation=mesh(c,barn,'long-stone-foundation',new THREE.BoxGeometry(5.4,.2,2.55),stone,'foundation');foundation.position.y=.1;
 const rear=mesh(c,barn,'rear-timber-wall',new THREE.BoxGeometry(5.1,1.3,.16),timber,'structure');rear.position.set(0,.82,-1.0);
 for(const x of[-2.4,-1.2,0,1.2,2.4]){const post=mesh(c,barn,'open-feeding-side-post',new THREE.BoxGeometry(.11,1.52,.11),iron,'frame');post.position.set(x,.86,1.0);const rearPost=mesh(c,barn,'rear-frame-post',new THREE.BoxGeometry(.11,1.52,.11),iron,'frame');rearPost.position.set(x,.86,-1.0);}
 for(const z of[-.46,.46]){const slope=mesh(c,barn,'broad-shallow-galvanized-roof',new THREE.BoxGeometry(5.65,.09,1.36),roof,'roof');slope.position.set(0,1.63,z);slope.rotation.x=z<0?.39:-.39;}
 const ridge=mesh(c,barn,'continuous-ventilation-ridge',new THREE.BoxGeometry(5.52,.1,.15),iron,'ventilation');ridge.position.set(0,1.83,0);
 const troughMesh=mesh(c,barn,'continuous-open-feeding-trough',new THREE.BoxGeometry(4.82,.34,.38),trough,'feeding');troughMesh.position.set(0,.39,1.07);const curb=mesh(c,barn,'feeding-side-curb',new THREE.BoxGeometry(5.1,.14,.23),stone,'feeding');curb.position.set(0,.07,1.28);
 for(const x of[-1.8,-.6,.6,1.8]){const rail=mesh(c,barn,'open-side-feed-rail',new THREE.BoxGeometry(.84,.08,.07),iron,'feeding');rail.position.set(x,.86,.92);}
 const door=addPivot(c,barn,'broad-sliding-service-door',[-2.58,.78,-.05]);const panel=mesh(c,door,'broad-timber-service-door-panel',new THREE.BoxGeometry(.1,1.24,1.35),timber,'door');panel.position.set(0,0,0);addChannel(c,door,'position','z',.68,.38,0);
 const manureGate=mesh(c,barn,'side-manure-service-gate',new THREE.BoxGeometry(.1,.82,.82),iron,'service');manureGate.position.set(2.58,.51,-.25);const track=mesh(c,barn,'door-track',new THREE.BoxGeometry(.12,.06,1.66),iron,'door');track.position.set(-2.59,1.45,-.05);
 const drain=mesh(c,barn,'manure-drainage-channel-cue',new THREE.BoxGeometry(2.5,.04,.2),iron,'drainage');drain.position.set(0,.22,-1.26);
 addSocket(c,barn,'terrain-anchor',[0,0,0]);addSocket(c,barn,'feed',[0,.42,1.35]);addSocket(c,barn,'water',[1.8,.35,1.26]);addSocket(c,barn,'manure-service',[0,.2,-1.35]);addSocket(c,barn,'loading',[-2.8,.25,-.05]);addSocket(c,barn,'service',[2.8,.5,-.25]);addSocket(c,barn,'attachment',[0,1.85,0]);addSocket(c,barn,'adjacency-east',[2.8,0,0]);addSocket(c,barn,'livestock-open-side',[0,.8,1.35]);
 addCollider(c,barn,'barn-volume','box',[0,.86,0],{width:5.2,height:1.62,depth:2.05,isTrigger:false});addCollider(c,barn,'feed-trough','box',[0,.39,1.07],{width:4.82,height:.34,depth:.38,isTrigger:false});addCollider(c,barn,'service-door','box',[-2.58,.78,-.05],{width:.12,height:1.24,depth:1.35,isTrigger:false});addCollider(c,barn,'manure-gate','box',[2.58,.51,-.25],{width:.12,height:.82,depth:.82,isTrigger:false});return finishAsset(c);
}
export function animateCowBarn(root,time){for(const ch of root?.userData?.sculptRuntime?.animationChannels||[])ch.node.position.z=ch.baseValue+Math.sin((Number.isFinite(time)?time:0)*ch.frequency+ch.phase)*ch.amplitude;return root;}
