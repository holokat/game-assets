import * as THREE from 'three';
import {addCollider,addPivot,addSocket,createAssetContext,finishAsset,registerMesh} from '../core/assetContext.js';
import {faceted} from '../core/geometryLibrary.js';
const material=(name,color,roughness=.62)=>new THREE.MeshStandardMaterial({name,color,roughness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
export function createFeedingTrough(){
 const c=createAssetContext('feeding-trough'),{model}=c,galvanized=material('feeding-trough-galvanized-basin','#707d80',.42),iron=material('feeding-trough-dark-support','#354145',.42),wood=material('feeding-trough-reinforced-rim','#76583e');
 addSocket(c,model,'ground',[0,0,0]);const trough=addPivot(c,model,'modular-feeding-trough',[0,0,0]);
 const basin=mesh(c,trough,'long-open-galvanized-basin',new THREE.BoxGeometry(3.0,.4,.7),galvanized,'basin');basin.position.y=.51;const basinVoid=mesh(c,trough,'open-basin-interior-cue',new THREE.BoxGeometry(2.72,.04,.46),iron,'basin');basinVoid.position.y=.72;
 for(const z of[-.4,.4]){const rim=mesh(c,trough,'reinforced-basin-rim',new THREE.BoxGeometry(3.18,.1,.08),wood,'rim');rim.position.set(0,.75,z);}for(const x of[-1.5,1.5]){const end=mesh(c,trough,'reinforced-end-rim',new THREE.BoxGeometry(.08,.1,.8),wood,'rim');end.position.set(x,.75,0);}
 for(const x of[-1.0,0,1.0]){const divider=mesh(c,trough,'simple-feeding-divider-bar',new THREE.BoxGeometry(.06,.32,.86),iron,'dividers');divider.position.set(x,.82,0);}
 for(const x of[-1.18,1.18])for(const z of[-.25,.25]){const leg=mesh(c,trough,'sturdy-grounded-support-leg',new THREE.BoxGeometry(.12,.48,.12),iron,'supports');leg.position.set(x,.24,z);const foot=mesh(c,trough,'wide-support-foot',new THREE.BoxGeometry(.26,.07,.26),wood,'supports');foot.position.set(x,.035,z);}
 const funnel=mesh(c,trough,'small-feed-input-funnel-cue',new THREE.CylinderGeometry(.18,.1,.3,4),wood,'service');funnel.position.set(-1.23,.97,.15);const lever=mesh(c,trough,'side-cleanout-lever-cue',new THREE.BoxGeometry(.07,.38,.07),iron,'service');lever.position.set(1.57,.45,.2);lever.rotation.z=-.38;
 addSocket(c,trough,'feed-input',[-1.23,1.1,.15]);addSocket(c,trough,'service',[1.68,.45,.2]);addSocket(c,trough,'animal-approach',[0,.35,.65]);addSocket(c,trough,'adjacency-east',[1.75,0,0]);addSocket(c,trough,'terrain-anchor',[0,0,0]);addSocket(c,trough,'ground',[0,0,0]);
 addCollider(c,trough,'feed-basin','box',[0,.51,0],{width:3,height:.4,depth:.7,isTrigger:false});addCollider(c,trough,'animal-approach','box',[0,.3,.67],{width:3.1,height:.5,depth:.5,isTrigger:true});addCollider(c,trough,'supports','box',[0,.24,0],{width:2.55,height:.48,depth:.58,isTrigger:false});return finishAsset(c);
}
