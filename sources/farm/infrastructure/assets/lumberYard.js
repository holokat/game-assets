import * as THREE from 'three';
import {addChannel,addCollider,addPivot,addSocket,createAssetContext,finishAsset,registerMesh} from '../core/assetContext.js';
import {faceted} from '../core/geometryLibrary.js';
const material=(name,color,roughness=.62)=>new THREE.MeshStandardMaterial({name,color,roughness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
export function createLumberYard(){
 const c=createAssetContext('lumber-yard'),{model}=c;
 const stone=material('lumber-yard-stone-feet','#837b6d'),timber=material('lumber-yard-frame-timber','#66503a'),lumber=material('lumber-yard-stacked-lumber','#a87b47'),roof=material('lumber-yard-galvanized-roof','#6c7a7b',.42),iron=material('lumber-yard-dark-iron','#354044',.42);
 addSocket(c,model,'ground',[0,0,0]);const yard=addPivot(c,model,'lumber-yard-structure',[0,0,0]);
 const deck=mesh(c,yard,'raised-plank-storage-deck',new THREE.BoxGeometry(3.25,.18,1.75),timber,'platform');deck.position.y=.25;
 for(const x of[-1.42,0,1.42])for(const z of[-.68,.68]){const foot=mesh(c,yard,'stone-post-foot',new THREE.BoxGeometry(.22,.12,.22),stone,'foundation');foot.position.set(x,.06,z);const post=mesh(c,yard,'slender-canopy-post',new THREE.BoxGeometry(.12,1.48,.12),iron,'frame');post.position.set(x,.86,z);}
 for(const z of[-.42,.42]){const slope=mesh(c,yard,'narrow-galvanized-roof',new THREE.BoxGeometry(3.55,.09,.85),roof,'roof');slope.position.set(0,1.62,z);slope.rotation.x=z<0?.29:-.29;}const ridge=mesh(c,yard,'roof-ridge',new THREE.BoxGeometry(3.5,.075,.1),iron,'roof');ridge.position.set(0,1.76,0);
 for(const z of[-.4,.4])for(const y of[.45,.62,.79]){const stack=mesh(c,yard,'orderly-squared-lumber-stack',new THREE.BoxGeometry(2.25,.13,.28),lumber,'lumber');stack.position.set(-.1,y,z);}
 for(const x of[-1.1,-.35,.4,1.15]){const tie=mesh(c,yard,'stack-cross-tie',new THREE.BoxGeometry(.07,.44,.72),timber,'lumber');tie.position.set(x,.61,0);}
const ramp=mesh(c,yard,'short-receiving-ramp',new THREE.BoxGeometry(1.0,.1,.65),stone,'loading');ramp.position.set(0,.10114,1.12);ramp.rotation.x=-.16;
 const beam=mesh(c,yard,'projecting-hoist-beam',new THREE.BoxGeometry(1.1,.12,.12),timber,'hoist');beam.position.set(-1.68,1.36,.02);
 const wheel=addPivot(c,yard,'hand-crank-winch',[-1.72,1.2,.02]);const drum=mesh(c,wheel,'hoist-winch-drum',new THREE.CylinderGeometry(.14,.14,.18,8),iron,'hoist');drum.rotation.x=Math.PI/2;const crank=mesh(c,wheel,'visible-winch-crank',new THREE.TorusGeometry(.18,.025,5,8),iron,'hoist');crank.rotation.y=Math.PI/2;addChannel(c,wheel,'rotation','z',1.3,.75,0);const hook=mesh(c,yard,'hoist-hook',new THREE.TorusGeometry(.07,.015,4,8,Math.PI),iron,'hoist');hook.position.set(-1.68,.72,.02);
 addSocket(c,yard,'terrain-anchor',[0,0,0]);addSocket(c,yard,'loading',[0,.18,1.48]);addSocket(c,yard,'storage',[0,.62,0]);addSocket(c,yard,'service',[-1.72,1.2,.02]);addSocket(c,yard,'attachment',[0,1.76,0]);addSocket(c,yard,'adjacency-east',[1.78,0,0]);addSocket(c,yard,'hoist',[-1.68,.72,.02]);
 addCollider(c,yard,'platform','box',[0,.25,0],{width:3.25,height:.18,depth:1.75,isTrigger:false});addCollider(c,yard,'lumber-stacks','box',[-.1,.62,0],{width:2.25,height:.48,depth:1.08,isTrigger:false});addCollider(c,yard,'hoist','box',[-1.68,1.12,.02],{width:.35,height:.65,depth:.3,isTrigger:false});return finishAsset(c);
}
export function animateLumberYard(root,time){for(const ch of root?.userData?.sculptRuntime?.animationChannels||[])ch.node.rotation.z=ch.baseValue+Math.sin((Number.isFinite(time)?time:0)*ch.frequency+ch.phase)*ch.amplitude;return root;}
