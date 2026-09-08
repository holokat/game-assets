import * as THREE from 'three';
import {frameItem} from './frame-item.js';
import {createStructureSmoke} from './structure-smoke.js';

export const structureLightPresets=Object.freeze({
 daylight:{label:'Daylight',background:'#ded9d0',key:'#fff2d9',keyPower:3.1,fill:'#d4e4f4',fillPower:.95,rim:'#fff1d1',rimPower:1.5,ambient:.8,exposure:1.04},
 overcast:{label:'Overcast',background:'#d6dcda',key:'#eff4fa',keyPower:1.8,fill:'#e1e7f0',fillPower:1.3,rim:'#dae2e9',rimPower:.9,ambient:1,exposure:1.08},
 dusk:{label:'Dusk',background:'#465363',key:'#ffc28c',keyPower:2.1,fill:'#829cca',fillPower:.5,rim:'#93b6dd',rimPower:1,ambient:.45,exposure:1.14},
});
/** Owns a reversible light rig and adapts Y-up assets to the editor's Z-up canvas. */
export function createStructurePresentation(stage,{dirty=()=>{}}={}){
 const root=new THREE.Group();root.name='Structure presentation';root.rotation.x=Math.PI/2;root.visible=false;stage.scene.add(root);
 const lights=new THREE.Group();lights.name='Structure inspection lights';lights.visible=false;
 const sky=new THREE.HemisphereLight('#f4f1e7','#746957',.8),key=new THREE.DirectionalLight('#fff2d9',3.1),fill=new THREE.DirectionalLight('#d4e4f4',.95),rim=new THREE.DirectionalLight('#fff1d1',1.5);
 key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00012;key.shadow.normalBias=.025;key.shadow.radius=3;
 lights.add(sky,key,fill,rim,key.target,fill.target,rim.target);stage.scene.add(lights);
 let model=null,smoke=null,saved=null,active=false,preset='daylight';
 function lighting(value){
  preset=Object.hasOwn(structureLightPresets,value)?value:'daylight';const p=structureLightPresets[preset];
  key.color.set(p.key);key.intensity=p.keyPower;fill.color.set(p.fill);fill.intensity=p.fillPower;rim.color.set(p.rim);rim.intensity=p.rimPower;sky.intensity=p.ambient;
  if(active){stage.scene.background=new THREE.Color(p.background);stage.renderer.toneMappingExposure=p.exposure;stage.scene.fog=null;}dirty();
 }
 function frame(view='three'){
  if(!model)return;root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(...size.toArray(),1);
  stage.camera.near=Math.max(.005,radius/1500);stage.camera.far=Math.max(300,radius*20);stage.controls.minDistance=Math.max(.05,radius*.1);stage.controls.maxDistance=radius*12;stage.camera.updateProjectionMatrix();
  frameItem(stage.camera,bounds,{view,padding:1.16,controls:stage.controls});
  key.position.copy(center).add(new THREE.Vector3(-radius*.7,-radius*.9,radius*1.6));fill.position.copy(center).add(new THREE.Vector3(radius,-radius*.2,radius*.8));rim.position.copy(center).add(new THREE.Vector3(radius*.2,radius,radius));
  for(const light of [key,fill,rim])light.target.position.copy(center);
  Object.assign(key.shadow.camera,{left:-radius*.85,right:radius*.85,top:radius*.85,bottom:-radius*.85,near:.1,far:radius*5});key.shadow.camera.updateProjectionMatrix();key.shadow.normalBias=radius*.0006;dirty();
 }
 function setActive(value){
  if(active===value)return;active=value;root.visible=value;lights.visible=value;
  if(value){
   saved={background:stage.scene.background,fog:stage.scene.fog,exposure:stage.renderer.toneMappingExposure,near:stage.camera.near,far:stage.camera.far,min:stage.controls.minDistance,max:stage.controls.maxDistance,contact:stage.contact.visible,grid:stage.grid.visible,lights:stage.scene.children.filter(o=>o.isLight).map(o=>[o,o.visible])};
   for(const [o] of saved.lights)o.visible=false;stage.contact.visible=false;stage.grid.visible=false;lighting(preset);frame();
  }else if(saved){
   Object.assign(stage.scene,{background:saved.background,fog:saved.fog});stage.renderer.toneMappingExposure=saved.exposure;
   stage.camera.near=saved.near;stage.camera.far=saved.far;stage.camera.updateProjectionMatrix();stage.controls.minDistance=saved.min;stage.controls.maxDistance=saved.max;
   stage.contact.visible=saved.contact;stage.grid.visible=saved.grid;for(const[o,visible]of saved.lights)o.visible=visible;saved=null;
  }dirty();
 }
 return {root,lighting,frame,setActive,
  setModel(value){smoke?.dispose();smoke=null;if(model)root.remove(model);model=value;if(model){root.add(model);smoke=createStructureSmoke(model);root.add(smoke.root);}root.rotation.set(Math.PI/2,0,0);if(active)frame();},
  get model(){return model;},get active(){return active;},get preset(){return preset;},
  update(delta,{rotate=false,animate=false}={}){if(!active)return false;if(rotate)root.rotation.y+=delta*.22;if(animate){const wheel=model?.getObjectByName('mill_wheel_pivot');if(wheel)wheel.rotation.x+=delta*.35;}smoke?.update(delta,animate);return rotate||animate;},
  dispose(){setActive(false);smoke?.dispose();root.removeFromParent();lights.removeFromParent();key.shadow.dispose();},
 };
}
