import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../models/character.js';
import {studioClasses} from '../data/studio-classes.js';
import {studioNpcs,isStudioNpc} from '../data/studio-npcs.js';
import {mountLoadout} from '../models/weapons.js';

export async function captureSheet(stage,actors,iteration='current',only=null,bodyType='neutral'){
 const kinds=(isStudioNpc(actors[0]?.kind)?studioNpcs:studioClasses).map(c=>c.id);
 stage.capturing=true;
 const {renderer,scene,camera}=stage,oldSize=new THREE.Vector2();renderer.getSize(oldSize);
 const oldRatio=renderer.getPixelRatio(),oldGrid=stage.grid.visible,oldTarget=stage.target.visible;
 const saved=scene.children.filter(o=>o.isGroup||o.type==='SkeletonHelper').map(o=>[o,o.visible]);for(const[o]of saved)o.visible=false;
 const contactPosition=stage.contact.position.clone();stage.contact.position.set(-.1,.15,.01);
 stage.grid.visible=false;stage.target.visible=false;
 const output=document.createElement('canvas');output.width=2400;output.height=Math.ceil((only?4:kinds.length)/4)*1200;
 const ctx=output.getContext('2d');ctx.fillStyle='#ded9d0';ctx.fillRect(0,0,output.width,output.height);
 const specs=only?['front','three','side','back'].map(v=>[only,v]):kinds.map(k=>[k,'three']);
 const measurements=[];renderer.setPixelRatio(1);
 try{
  for(let index=0;index<specs.length;index++){
   const[kind,view]=specs[index],a=await createCharacter(kind,{bodyType,customization:actors[0]?.customization});mountLoadout(a.rig,'default','default');scene.add(a.group);
   const size={width:600,height:1080};renderer.setSize(size.width,size.height,false);
   const bounds=visibleBounds(a.group),center=bounds.getCenter(new THREE.Vector3());
   const angle={front:0,three:.34,side:-Math.PI/2,back:Math.PI}[view];
   const height=Math.max(7.2,bounds.max.z+1.1),width=height*size.width/size.height;
   const c=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,100);c.up.set(0,0,1);
   const target=new THREE.Vector3(center.x,center.y,bounds.max.z*.5);
   c.position.set(target.x+Math.sin(angle)*25,target.y-Math.cos(angle)*25,target.z+3.7);c.lookAt(target);
   renderer.render(scene,c);ctx.drawImage(renderer.domElement,(index%4)*600,Math.floor(index/4)*1200+12);

   ctx.textAlign='center';ctx.fillStyle='#514a3f';ctx.font='30px Georgia';
   ctx.fillText(only?view==='three'?'Three-quarter':view[0].toUpperCase()+view.slice(1):kind[0].toUpperCase()+kind.slice(1),(index%4)*600+300,Math.floor(index/4)*1200+1125);
   measurements.push({kind,view,triangles:renderer.info.render.triangles});disposeCharacter(a);
  }
  const url=await canvasImageURL(output);return {url,measurements};
 }finally{
  stage.capturing=false;stage.grid.visible=oldGrid;stage.target.visible=oldTarget;
  renderer.setPixelRatio(oldRatio);renderer.setSize(oldSize.x,oldSize.y,false);
  for(const[o,visible]of saved)o.visible=visible;stage.contact.position.copy(contactPosition);stage.resize();renderer.render(scene,camera);
 }
}
function visibleBounds(group){const box=new THREE.Box3();group.updateMatrixWorld(true);group.traverse(o=>{if(!o.isMesh||!o.visible)return;o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});return box;}
async function canvasImageURL(canvas){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Image could not be encoded');return URL.createObjectURL(blob);}
export async function saveCanvas(stage,name){if(stage.renderFrame)stage.renderFrame();else stage.renderer.render(stage.scene,stage.camera);return canvasImageURL(stage.renderer.domElement);}
