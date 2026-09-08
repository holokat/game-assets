import * as THREE from 'three';
import {addChannel,addCollider,addPivot,addSocket,createAssetContext,finishAsset,registerMesh} from '../core/assetContext.js';
import {faceted} from '../core/geometryLibrary.js';
const material=(name,color,roughness=.62)=>new THREE.MeshStandardMaterial({name,color,roughness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
export function createPigsty(){
 const c=createAssetContext('pigsty'),{model}=c,stone=material('pigsty-stone-curb','#82786b'),timber=material('pigsty-weathered-timber','#76583d'),roof=material('pigsty-galvanized-roof','#68777b',.42),iron=material('pigsty-dark-iron','#394345',.42),mud=material('pigsty-packed-mud','#80664e'),drain=material('pigsty-drainage-blue-gray','#668e95',.5);
 addSocket(c,model,'ground',[0,0,0]);const sty=addPivot(c,model,'low-pigsty-module',[0,0,0]);
 const curb=mesh(c,sty,'low-stone-curb',new THREE.BoxGeometry(3.25,.16,2.16),stone,'foundation');curb.position.y=.08;
 const shelter=mesh(c,sty,'low-timber-shelter',new THREE.BoxGeometry(1.52,.78,1.72),timber,'shelter');shelter.position.set(-.77,.55,-.14);
 for(const z of[-.33,.33]){const slope=mesh(c,sty,'shallow-galvanized-roof',new THREE.BoxGeometry(1.8,.075,1.03),roof,'roof');slope.position.set(-.77,1.0,z-.14);slope.rotation.x=z<0?.2:-.2;}
 const ridge=mesh(c,sty,'roof-ridge',new THREE.BoxGeometry(1.77,.06,.08),iron,'roof');ridge.position.set(-.77,1.08,-.14);
 const yard=mesh(c,sty,'fenced-packed-mud-yard',new THREE.BoxGeometry(1.56,.06,1.78),mud,'yard');yard.position.set(.83,.19,.04);
 for(const x of[.1,1.56])for(const z of[-.77,.85]){const post=mesh(c,sty,'sturdy-yard-fence-post',new THREE.BoxGeometry(.075,.7,.075),iron,'fence');post.position.set(x,.51,z);}
 for(const z of[-.77,.85]){const rail=mesh(c,sty,'horizontal-yard-fence-rail',new THREE.BoxGeometry(1.56,.07,.06),iron,'fence');rail.position.set(.83,.67,z);}
 const rear=mesh(c,sty,'rear-yard-fence-rail',new THREE.BoxGeometry(.06,.07,1.68),iron,'fence');rear.position.set(1.56,.67,.04);
 const gate=addPivot(c,sty,'broad-swing-yard-gate',[.1,.52,-.77]);const gateFrame=mesh(c,gate,'broad-yard-gate-frame',new THREE.BoxGeometry(1.44,.62,.065),iron,'gate');gateFrame.position.set(.72,0,0);const brace=mesh(c,gate,'yard-gate-diagonal-brace',new THREE.BoxGeometry(1.5,.055,.055),timber,'gate');brace.position.set(.72,0,0);brace.rotation.z=-.39;addChannel(c,gate,'rotation','y',.74,.65,0);
 const trough=mesh(c,sty,'heavy-feed-trough',new THREE.BoxGeometry(.72,.24,.3),stone,'feeding');trough.position.set(.74,.34,.44);const drainbed=mesh(c,sty,'drainage-channel-cue',new THREE.BoxGeometry(2.72,.045,.22),drain,'drainage');drainbed.position.set(0,.183,1.02);const grate=mesh(c,sty,'drainage-grate',new THREE.BoxGeometry(1.72,.025,.04),iron,'drainage');grate.position.set(0,.225,1.02);
 addSocket(c,sty,'terrain-anchor',[0,0,0]);addSocket(c,sty,'feed',[.74,.34,.67]);addSocket(c,sty,'water',[1.7,.25,.22]);addSocket(c,sty,'service',[-1.55,.6,-.14]);addSocket(c,sty,'access',[.82,.1,-1.06]);addSocket(c,sty,'drainage',[0,.18,1.14]);addSocket(c,sty,'attachment',[-.77,1.08,-.14]);addSocket(c,sty,'adjacency-east',[1.7,0,0]);addSocket(c,sty,'livestock-yard',[.83,.3,.04]);
 addCollider(c,sty,'shelter','box',[-.77,.55,-.14],{width:1.52,height:.78,depth:1.72,isTrigger:false});addCollider(c,sty,'mud-yard','box',[.83,.3,.04],{width:1.56,height:.22,depth:1.78,isTrigger:true});addCollider(c,sty,'trough','box',[.74,.34,.44],{width:.72,height:.24,depth:.3,isTrigger:false});addCollider(c,sty,'gate','box',[.82,.52,-.77],{width:1.44,height:.62,depth:.08,isTrigger:false});return finishAsset(c);
}
export function animatePigsty(root,time){for(const ch of root?.userData?.sculptRuntime?.animationChannels||[])ch.node.rotation.y=ch.baseValue+Math.sin((Number.isFinite(time)?time:0)*ch.frequency+ch.phase)*ch.amplitude;return root;}
