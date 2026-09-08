import * as THREE from 'three';
import {addChannel,addCollider,addPivot,addSocket,createAssetContext,finishAsset,registerMesh} from '../core/assetContext.js';
import {faceted} from '../core/geometryLibrary.js';
const material=(name,color,roughness=.62)=>new THREE.MeshStandardMaterial({name,color,roughness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
export function createChickenCoop(){
 const c=createAssetContext('chicken-coop'),{model}=c;
 const stone=material('chicken-coop-stone-feet','#837b6d'),timber=material('chicken-coop-timber','#7b6044'),roof=material('chicken-coop-galvanized-roof','#69777a',.42),iron=material('chicken-coop-dark-mesh-frame','#354044',.42),nest=material('chicken-coop-nesting-box','#a67e49');
 addSocket(c,model,'ground',[0,0,0]);const coop=addPivot(c,model,'elevated-coop-structure',[0,0,0]);
 const platform=mesh(c,coop,'raised-coop-platform',new THREE.BoxGeometry(1.72,.16,1.3),timber,'platform');platform.position.set(-.35,.69,0);
 const box=mesh(c,coop,'elevated-coop-box',new THREE.BoxGeometry(1.6,.78,1.17),timber,'structure');box.position.set(-.35,1.15,0);
 for(const x of[-1.05,.35])for(const z of[-.48,.48]){const foot=mesh(c,coop,'stone-post-foot',new THREE.BoxGeometry(.2,.12,.2),stone,'foundation');foot.position.set(x,.06,z);const post=mesh(c,coop,'slender-elevated-post',new THREE.BoxGeometry(.1,.62,.1),iron,'frame');post.position.set(x,.37,z);}
 for(const z of[-.32,.32]){const slope=mesh(c,coop,'shallow-galvanized-roof',new THREE.BoxGeometry(1.95,.08,.72),roof,'roof');slope.position.set(-.35,1.63,z);slope.rotation.x=z<0?.29:-.29;}
 const ridge=mesh(c,coop,'roof-ridge',new THREE.BoxGeometry(1.9,.06,.08),iron,'roof');ridge.position.set(-.35,1.76,0);
 const hatch=addPivot(c,coop,'front-access-hatch',[-.35,.92,.625]);mesh(c,hatch,'small-hinged-access-door',new THREE.BoxGeometry(.48,.43,.06),timber,'door');addChannel(c,hatch,'rotation','x',.64,.7,0);
 const ramp=mesh(c,coop,'narrow-slatted-access-ramp',new THREE.BoxGeometry(.56,.08,.92),timber,'access');ramp.position.set(-.35,.268,.97);ramp.rotation.x=-.53;for(let i=0;i<5;i++){const slat=mesh(c,coop,'ramp-cross-slat',new THREE.BoxGeometry(.62,.035,.06),nest,'access');slat.position.set(-.35,.17+i*.105,.64+i*.16);slat.rotation.x=-.53;}
 const run=mesh(c,coop,'open-mesh-run-volume',new THREE.BoxGeometry(1.18,.05,1.28),iron,'run');run.position.set(1.05,.025,0);for(const x of[.52,1.58])for(const z of[-.52,.52]){const runPost=mesh(c,coop,'run-frame-post',new THREE.BoxGeometry(.06,.7,.06),iron,'run');runPost.position.set(x,.35,z);}for(const x of[-.72,-.05]){const boxNest=mesh(c,coop,'external-nesting-box-cue',new THREE.BoxGeometry(.32,.26,.32),nest,'nesting');boxNest.position.set(x,1.05,-.74);}
 addSocket(c,coop,'terrain-anchor',[0,0,0]);addSocket(c,coop,'feed',[1.28,.3,.72]);addSocket(c,coop,'service',[-.35,1.12,.72]);addSocket(c,coop,'access',[-.35,.1,1.38]);addSocket(c,coop,'attachment',[-.35,1.76,0]);addSocket(c,coop,'adjacency-east',[1.7,0,0]);addSocket(c,coop,'livestock-run',[1.05,.35,0]);
 addCollider(c,coop,'coop-box','box',[-.35,1.15,0],{width:1.6,height:.78,depth:1.17,isTrigger:false});addCollider(c,coop,'run','box',[1.05,.36,0],{width:1.18,height:.7,depth:1.28,isTrigger:true});addCollider(c,coop,'ramp','box',[-.35,.3,.97],{width:.56,height:.16,depth:.92,isTrigger:false});return finishAsset(c);
}
export function animateChickenCoop(root,time){for(const ch of root?.userData?.sculptRuntime?.animationChannels||[])ch.node.rotation.x=ch.baseValue+Math.sin((Number.isFinite(time)?time:0)*ch.frequency+ch.phase)*ch.amplitude;return root;}
