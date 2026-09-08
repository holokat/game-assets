import * as THREE from 'three';
import {createSpellPostprocessing} from '../vendor/source-library.js';
export function createAbilityRenderer(stage){
 let pipeline=null,width=0,height=0,ratio=0;
 const size=new THREE.Vector2();
 return {
  render(active,delta=0){
   if(!active){stage.renderer.info.reset();stage.renderer.render(stage.scene,stage.camera);return;}
   pipeline??=createSpellPostprocessing(stage.renderer,stage.scene,stage.camera,.5);
   stage.renderer.getSize(size);const nextRatio=stage.renderer.getPixelRatio();
   if(size.x!==width||size.y!==height||ratio!==nextRatio){width=size.x;height=size.y;ratio=nextRatio;pipeline.setSize(width,height);}
   pipeline.setSpellPresentation(stage.enchantmentPresentation || null);
   pipeline.render(delta);
  },
  dispose(){pipeline?.dispose();pipeline=null;},
 };
}
