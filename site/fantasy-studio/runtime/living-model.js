import * as THREE from 'three';
import {bakeLivingClips} from './living-clips.js';
import {livingByKey} from '../data/living-catalog.js';
import {disposeLivingModel} from '../models/dressing/shared.js';
export async function createLivingModel(key,options={}){
 const entry=livingByKey.get(key);if(!entry)throw new Error(`Unknown world asset: ${key}`);
 if(entry.worldKind==='creatures'){const {createCreatureModel}=await import('../models/creatures/index.js');return createCreatureModel(entry.id,options);}
 if(entry.worldKind==='effects'||entry.type==='vfx'){const {createEffectModel}=await import('./world-effects/index.js');return createEffectModel(entry.id,options);}
 let root;
 let update;
 if(entry.worldKind==='forage'){const {createForageModel,updateForageModel}=await import('../models/forage/index.js');root=await createForageModel(entry.id,options);update=(time,clip)=>updateForageModel(root,time,clip);}
 else {const {createDressingModel,updateDressingModel}=await import('../models/dressing/index.js');root=await createDressingModel(entry.id,options);update=(time,clip)=>updateDressingModel(root,time,clip);}
 const clips=bakeLivingClips(root,update),mixer=new THREE.AnimationMixer(root);let current=null;
 return {group:root,clips,update(time,clip){const selected=clips.find(c=>c.name===clip)||clips[0];if(!selected)return;if(current!==selected){mixer.stopAllAction();mixer.clipAction(selected).play();current=selected;}mixer.setTime(Math.max(0,time));},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);disposeLivingModel(root);}};
}
