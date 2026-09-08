import * as THREE from 'three';
import {addChannel,addCollider,addPivot,addSocket,createAssetContext,finishAsset,registerMesh} from '../core/assetContext.js';
import {faceted} from '../core/geometryLibrary.js';
const material=(name,color,roughness=.62)=>new THREE.MeshStandardMaterial({name,color,roughness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
export function createSeedVault(){
 const c=createAssetContext('seed-vault'),{model}=c;
 const earth=material('seed-vault-earth-cover','#766c4d'),stone=material('seed-vault-stone','#827b70'),concrete=material('seed-vault-concrete','#9a9589'),iron=material('seed-vault-sealed-iron','#354145',.4),brass=material('seed-vault-handle-brass','#a67f47',.35);
 addSocket(c,model,'ground',[0,0,0]);const vault=addPivot(c,model,'vault-structure',[0,0,0]);
 const base=mesh(c,vault,'stone-foundation',new THREE.BoxGeometry(2.7,.18,1.7),stone,'structure');base.position.y=.09;
 const chamber=mesh(c,vault,'reinforced-vault-body',new THREE.BoxGeometry(2.5,.9,1.52),concrete,'structure');chamber.position.set(0,.54,-.08);
 const cover=mesh(c,vault,'low-faceted-earth-cover',new THREE.DodecahedronGeometry(1,1),earth,'earth');cover.scale.set(1.42,.54,.88);cover.position.set(0,.86,-.24);
 const facade=mesh(c,vault,'reinforced-entrance-facade',new THREE.BoxGeometry(1.16,1.0,.16),stone,'entrance');facade.position.set(0,.5,.78);
 const hatch=addPivot(c,vault,'sealed-hatch-door',[-.43,.5,.88]);const hatchPanel=mesh(c,hatch,'sealed-dark-metal-hatch',new THREE.BoxGeometry(.86,.84,.09),iron,'door');hatchPanel.position.x=.43;addChannel(c,hatch,'rotation','y',.52,.72,0);
 const wheel=mesh(c,hatch,'hatch-wheel-handle',new THREE.TorusGeometry(.13,.024,5,8),brass,'door');wheel.position.set(.43,.04,.065);wheel.rotation.y=Math.PI/2;
 for(const y of[.25,.67]){const hinge=mesh(c,hatch,'heavy-hatch-hinge',new THREE.BoxGeometry(.07,.11,.12),iron,'door');hinge.position.set(.06,y-.5,.04);}
 for(let i=0;i<3;i++){const step=mesh(c,vault,'concrete-entry-step',new THREE.BoxGeometry(1.04,.12,.29),concrete,'entry');step.position.set(0,.06+i*.11,1.03-i*.18);}
 for(const x of[-.63,.63]){const wall=mesh(c,vault,'low-entry-retaining-wall',new THREE.BoxGeometry(.14,.34,.85),stone,'entry');wall.position.set(x,.17,.83);}
 for(const x of[-.55,.53]){const pipe=mesh(c,vault,'ventilation-pipe',new THREE.CylinderGeometry(.055,.055,.5,6),iron,'ventilation');pipe.position.set(x,1.11,-.22);const cap=mesh(c,vault,'ventilation-cap',new THREE.ConeGeometry(.09,.075,6),iron,'ventilation');cap.position.set(x,1.4,-.22);}
 const panel=mesh(c,vault,'compact-service-panel',new THREE.BoxGeometry(.24,.32,.1),iron,'service');panel.position.set(1.32,.55,.08);
 addSocket(c,vault,'terrain-anchor',[0,0,0]);addSocket(c,vault,'loading',[0,.15,1.37]);addSocket(c,vault,'storage',[0,.5,0]);addSocket(c,vault,'service',[1.42,.55,.08]);addSocket(c,vault,'ventilation',[-.55,1.4,-.22]);addSocket(c,vault,'attachment',[0,1.2,-.65]);addSocket(c,vault,'adjacency-east',[1.48,0,0]);
 addCollider(c,vault,'vault-body','box',[0,.54,-.08],{width:2.5,height:.9,depth:1.52,isTrigger:false});addCollider(c,vault,'entrance','box',[0,.5,.81],{width:1.16,height:1,depth:.18,isTrigger:false});addCollider(c,vault,'hatch','box',[0,.5,.9],{width:.86,height:.84,depth:.1,isTrigger:false});return finishAsset(c);
}
export function animateSeedVault(root,time){for(const ch of root?.userData?.sculptRuntime?.animationChannels||[])ch.node.rotation.y=ch.baseValue+Math.sin((Number.isFinite(time)?time:0)*ch.frequency+ch.phase)*ch.amplitude;return root;}
