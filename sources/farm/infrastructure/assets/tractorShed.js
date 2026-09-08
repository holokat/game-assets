import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const TRACTOR_SHED_PASSES = Object.freeze(['blockout','structural-pass','form-refinement','material-pass','surface-pass','lighting-pass','interaction-pass','optimization-pass']);
const PASS_INDEX = new Map(TRACTOR_SHED_PASSES.map((id,index)=>[id,index]));
const material=(name,color,roughness=.76,metalness=0)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group,minimumPass='blockout')=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group,minimumPass);
function box(c,p,id,size,pos,m,group,pass='blockout'){const q=mesh(c,p,id,new THREE.BoxGeometry(...size),m,group,pass);q.position.set(...pos);return q;}
function beam(c,p,id,a,b,w,m,group,pass='structural-pass'){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const q=box(c,p,id,[w,d.length(),w],A.clone().add(B).multiplyScalar(.5).toArray(),m,group,pass);q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return q;}

export function createTractorShed(options={}){
  const passId=TRACTOR_SHED_PASSES.includes(options.passId)?options.passId:'optimization-pass';
  const c=createAssetContext('tractor-shed',{label:'Tractor Shed',targetHeightMetres:3.25,passId});
  const {model}=c;
  const stone=material('tractor-shed-warm-stone','#9a8b73',.94);
  const panel=material('tractor-shed-pale-wall-panel','#d5d0c2',.84);
  const galvanized=material('tractor-shed-galvanized-roof','#7e8989',.48,.26);
  const iron=material('tractor-shed-dark-frame','#343a38',.58,.22);
  const teal=material('tractor-shed-muted-teal-gates','#587d78',.68,.08);
  const shell=addPivot(c,model,'shed-shell');
  const gateAssembly=addPivot(c,shell,'front-gate-assembly');
  const leftGate=addPivot(c,gateAssembly,'left-hinged-gate',[-1.72,.2,2.05]);
  const rightGate=addPivot(c,gateAssembly,'right-fixed-gate',[1.72,.2,2.05]);
  const service=addPivot(c,shell,'rear-service-shelf');
  box(c,shell,'stone-foundation-curb',[3.8,.18,4.35],[0,.09,0],stone,'foundation');
  box(c,shell,'interior-floor',[3.55,.08,4.1],[0,.22,0],galvanized,'foundation');
  box(c,shell,'rear-windbreak-wall',[3.55,2.25,.12],[0,1.35,-2],panel,'windbreak','structural-pass');
  box(c,shell,'left-windbreak-wall',[.12,2.25,4],[-1.72,1.35,0],panel,'windbreak','structural-pass');
  for(const x of [-1.72,1.72]) for(const z of [-2,2]) box(c,shell,`frame-post-${x}-${z}`,[.14,2.72,.14],[x,1.55,z],iron,'frame','structural-pass');
  box(c,shell,'rear-top-beam',[3.58,.14,.14],[0,2.78,-2],iron,'frame','structural-pass');
  box(c,shell,'front-top-beam',[3.58,.14,.14],[0,2.78,2],iron,'frame','structural-pass');
  for(const x of [-1.72,0,1.72]) beam(c,shell,`roof-rafter-a-${x}`,[x,2.78,-2],[x,3.26,0],.11,iron,'roof-frame');
  for(const x of [-1.72,0,1.72]) beam(c,shell,`roof-rafter-b-${x}`,[x,3.26,0],[x,2.78,2],.11,iron,'roof-frame');
  const rearRoof=box(c,shell,'rear-roof-plane',[3.78,.1,2.18],[0,3.05,-1],galvanized,'roof','structural-pass');rearRoof.rotation.x=-.235;
  const frontRoof=box(c,shell,'front-roof-plane',[3.78,.1,2.18],[0,3.05,1],galvanized,'roof','structural-pass');frontRoof.rotation.x=.235;
  box(c,shell,'roof-ridge',[3.82,.12,.14],[0,3.29,0],iron,'roof','surface-pass');
  box(c,leftGate,'left-gate-panel',[1.66,2.12,.1],[.83,1.16,0],teal,'gate','form-refinement');
  box(c,leftGate,'left-gate-top-rail',[1.62,.1,.14],[.83,2.13,.01],iron,'gate-hardware','surface-pass');
  box(c,leftGate,'left-gate-diagonal',[.09,1.74,.13],[.83,1.16,.015],iron,'gate-hardware','surface-pass').rotation.z=-.57;
  for(const y of [.55,1.77]){const hinge=mesh(c,leftGate,`left-hinge-${y}`,new THREE.CylinderGeometry(.07,.07,.18,8),iron,'gate-hardware','interaction-pass');hinge.position.set(0,y,0);hinge.rotation.x=Math.PI/2;}
  box(c,rightGate,'right-gate-panel',[1.66,2.12,.1],[-.83,1.16,0],teal,'gate','form-refinement');
  box(c,rightGate,'right-gate-top-rail',[1.62,.1,.14],[-.83,2.13,.01],iron,'gate-hardware','surface-pass');
  box(c,rightGate,'right-gate-diagonal',[.09,1.74,.13],[-.83,1.16,.015],iron,'gate-hardware','surface-pass').rotation.z=.57;
  box(c,service,'rear-service-shelf-board',[1.58,.1,.45],[.72,1.03,-1.68],teal,'service-shelf','form-refinement');
  for(const x of [0,1.44]) beam(c,service,`shelf-brace-${x}`,[x,.45,-1.82],[x,1,-1.65],.07,iron,'service-shelf');
  box(c,service,'rear-attachment-rail',[1.55,.09,.09],[.72,1.55,-1.92],iron,'service-shelf','surface-pass');
  addChannel(c,leftGate,'rotation','y',-1.35,.72,0);
  for(const [id,pos] of [['ground',[0,0,0]],['terrain',[0,0,0]],['vehicle-entry',[0,.25,2.35]],['parking',[0,.25,.05]],['maintenance',[0,.25,-.95]],['service-shelf',[.72,1.2,-1.62]],['attachment',[0,2.75,-2.1]],['adjacency-left',[-2.2,.1,0]],['adjacency-right',[2.2,.1,0]],['adjacency-front',[0,.1,2.65]],['adjacency-rear',[0,.1,-2.55]]]) addSocket(c,model,id,pos);
  addCollider(c,shell,'foundation','box',[0,.12,0],{width:3.8,height:.24,depth:4.35,isTrigger:false});
  addCollider(c,shell,'left-wall','box',[-1.72,1.35,0],{width:.15,height:2.3,depth:4.05,isTrigger:false});
  addCollider(c,shell,'rear-wall','box',[0,1.35,-2],{width:3.55,height:2.3,depth:.16,isTrigger:false});
  addCollider(c,leftGate,'left-gate','box',[.83,1.16,0],{width:1.7,height:2.16,depth:.14,isTrigger:false});
  addCollider(c,rightGate,'right-gate','box',[-.83,1.16,0],{width:1.7,height:2.16,depth:.14,isTrigger:false});
  addCollider(c,service,'service-shelf','box',[.72,1.03,-1.68],{width:1.62,height:.14,depth:.5,isTrigger:false});
  addCollider(c,shell,'parking-zone','box',[0,.65,.15],{width:3.1,height:1.2,depth:3.45,isTrigger:true});
  const root=finishAsset(c);
  root.userData.artDirection={concept:'references/concepts/tractor-shed.png',identity:['lean single-tractor shelter','gable galvanized roof','two windbreak walls','broad hinged gate','rear service shelf'],motion:'Only the visible left front gate leaf swings on its hinge.',correctionPasses:0};
  root.userData.qualityContract={suitability:'pass',triangleBudget:5000,optimizedDrawRange:[4,6],criticalFeatures:['stone curb','open-front shed','double broad gate','rear service shelf']};
  Object.defineProperty(root.userData,'tractorShedRig',{value:{shell,leftGate,rightGate,service},enumerable:false,configurable:true});
  root.userData.applyPassState=(id)=>applyTractorShedPassState(root,id);applyTractorShedPassState(root,passId);return root;
}
export function applyTractorShedPassState(root,passId='optimization-pass'){const id=TRACTOR_SHED_PASSES.includes(passId)?passId:'optimization-pass',n=PASS_INDEX.get(id),rt=root.userData.sculptRuntime,block=rt.nodes['tractor-shed-root'].userData.blockoutMaterial??=new THREE.MeshStandardMaterial({name:'tractor-shed-blockout-mat',color:'#a49d92',roughness:.94,flatShading:true});root.userData.passId=id;root.traverse(q=>{if(!q.isMesh)return;q.visible=n>=(PASS_INDEX.get(q.userData.minimumPass??'blockout')??0);q.userData.authoredMaterial??=q.material;q.material=n<PASS_INDEX.get('material-pass')?block:q.userData.authoredMaterial;});return root;}
export function animateTractorShed(root,timeSeconds=0){const gate=root?.userData?.tractorShedRig?.leftGate,ch=root?.userData?.sculptRuntime?.animationChannels?.[0];if(gate&&ch)gate.rotation.y=ch.baseValue+Math.max(0,Math.sin(Math.max(0,timeSeconds)*ch.frequency+ch.phase))*ch.amplitude;return root;}
