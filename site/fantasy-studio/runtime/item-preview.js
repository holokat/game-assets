import * as THREE from 'three';
import {createItemModel} from '../models/item-model.js';
import {disposeItem} from '../models/item-materials.js';
import {frameItem} from './frame-item.js';

export function createItemPreview(stage,{dirty}){
 let current=null,version=0,active=false,disposed=false;
 const root=new THREE.Group();root.name='Item inspection';root.visible=false;stage.scene.add(root);
 const originalContact={x:stage.contact.position.x,y:stage.contact.position.y};
 function frame(view='three'){
  if (!current) return;
  frameItem(stage.camera, new THREE.Box3().setFromObject(current), {view, controls:stage.controls});
  dirty();
 }
 return {
  get root(){return root;},get model(){return current;},get active(){return active;},
  async show(id,options){
   if(disposed)return false;
   const token=++version;const model=await createItemModel(id,{...options,presentation:true});if(disposed||token!==version){disposeItem(model);return false;}
   if(current)disposeItem(current);current=model;
   const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   const scale=5.5/Math.max(size.x,size.y,size.z,.01);model.scale.setScalar(scale);model.position.set(-center.x*scale,-center.y*scale,-box.min.z*scale+.025);model.userData.previewHeight=size.z*scale;
   root.add(model);frame();return true;
  },
  setActive(value){active=value;root.visible=value;stage.contact.visible=!value;if(!value){stage.contact.position.set(originalContact.x,originalContact.y,.01);}dirty();},frame,
  cancel(){version++;},
  dispose(){if(disposed)return;disposed=true;version++;if(current)disposeItem(current);current=null;root.removeFromParent();},
 };
}

export function createItemThumbnails(stage){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e9e4db');scene.environment=stage.scene.environment;scene.environmentIntensity=.8;
 scene.add(new THREE.HemisphereLight('#fff6e9','#545c68',2));const key=new THREE.DirectionalLight('#fff7e9',4);key.position.set(-3,-5,7);scene.add(key);
 const rim=new THREE.DirectionalLight('#dce9ff',2);rim.position.set(4,3,5);scene.add(rim);
 const camera=new THREE.PerspectiveCamera(34,1,.01,100),target=new THREE.WebGLRenderTarget(192,192,{depthBuffer:true});
 target.texture.colorSpace=THREE.SRGBColorSpace;
 const pixels=new Uint8Array(192*192*4),canvas=document.createElement('canvas');canvas.width=canvas.height=192;const ctx=canvas.getContext('2d');
 const cache=new Map();let queue=Promise.resolve(),disposed=false;
 return {get(id,bodyType='male'){
  const key=id+':'+bodyType;if(cache.has(key))return cache.get(key);
  const promise=queue.then(async()=>{
   if(disposed)throw new Error('Item thumbnails are disposed');
   const model=await createItemModel(id,{bodyType,presentation:true});const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2;
   if(disposed){disposeItem(model);throw new Error('Item thumbnails are disposed');}
   model.position.sub(center);scene.add(model);camera.far=Math.max(100,radius*10);camera.updateProjectionMatrix();
   frameItem(camera,new THREE.Box3().setFromObject(model),{padding:1.2});
   const oldTarget=stage.renderer.getRenderTarget();
   try{stage.renderer.setRenderTarget(target);stage.renderer.render(scene,camera);stage.renderer.readRenderTargetPixels(target,0,0,192,192,pixels);}
   finally{stage.renderer.setRenderTarget(oldTarget);disposeItem(model);}
   const data=ctx.createImageData(192,192);for(let y=0;y<192;y++)data.data.set(pixels.subarray((191-y)*192*4,(192-y)*192*4),y*192*4);ctx.putImageData(data,0,0);return canvas.toDataURL('image/png');
  });
  queue=promise.catch(()=>{});cache.set(key,promise);return promise;
 },dispose(){if(disposed)return;disposed=true;target.dispose();cache.clear();}};
}
