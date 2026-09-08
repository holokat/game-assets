import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {disposeStructure} from '../models/structures/primitives.js';
async function createStructureModel(id){
 const models=await import('../models/structure-model.js');
 return models.createStructureModel(id);
}
import {structureById} from '../data/structure-catalog.js';
import {createStructurePresentation} from '../runtime/structure-presentation.js';
import {createStructurePanel} from './structure-panel.js';
import {downloadBlob} from '../runtime/export.js';

export function createStructureWorkspace({stage,getActor,dirty,report,root=document}){
 const element=id=>root.getElementById(id),presentation=createStructurePresentation(stage,{dirty});
 let id='inn',model=null,active=false,disposed=false,revision=0,wire=false,turn=false,moving=false;
 const panel=createStructurePanel({root,select,lighting:presentation.lighting,
  wireframe(value){wire=value;applyWireframe();},rotate(value){turn=value;dirty();},animate(value){moving=value;dirty();},exportModel});
 function applyWireframe(){model?.traverse(o=>{if(o.material)o.material.wireframe=wire;});dirty();}
 function heading(){
  const entry=structureById.get(id);element('class-title').textContent=entry.name;element('class-subtitle').textContent=entry.zone;
  element('action-status').textContent='Structure inspection · Metres';
  element('geometry-count').textContent=model?`${model.userData.triangles.toLocaleString()} triangles · ${model.userData.drawCalls} draw calls`:'';
  element('scene').setAttribute('aria-label',`Interactive 3D structure: ${entry.name}`);
 }
 function visibility(){
  if(getActor())getActor().group.visible=!active;if(stage.skeletonHelper)stage.skeletonHelper.visible=!active&&element('skeleton').checked;
  presentation.setActive(active);if(active)heading();
 }
 async function select(value){
  if(disposed)return;if(!structureById.has(value))throw new Error(`Unknown structure: ${value}`);
  const token=++revision;id=value;panel.update(id,{busy:true});
  try{
   const next=await createStructureModel(id);
   if(disposed||token!==revision){disposeStructure(next);return;}
   if(model)disposeStructure(model);model=next;presentation.setModel(model);applyWireframe();
   panel.update(id,{stats:model.userData});if(active){visibility();heading();}dirty();
  }catch(error){if(!disposed&&token===revision){report(error);panel.update(id,{error:'The structure could not be built. Select it to retry.'});}}
 }
 async function exportBuffer(value=id){
  const asset=await createStructureModel(value);
  try{return await new GLTFExporter().parseAsync(asset,{binary:true,onlyVisible:true,trs:true});}finally{disposeStructure(asset);}
 }
 async function exportModel(){
  try{const selected=id,buffer=await exportBuffer(selected);if(!disposed)downloadBlob(buffer,'model/gltf-binary',`${selected}.glb`);}catch(error){if(!disposed)report(error);}
 }
 return {select,exportBuffer,exportModel,presentation,panel,
  get id(){return id;},get model(){return model;},get active(){return active;},
  async enter(){active=true;visibility();if(model?.userData.structureId===id){panel.update(id,{stats:model.userData});presentation.frame();}else await select(id);},
  exit(){revision++;active=false;visibility();},
  afterRebuild(){if(active)visibility();},
  frame:view=>presentation.frame(view),
  update(delta){return presentation.update(delta,{rotate:turn,animate:moving});},
  lighting:presentation.lighting,
  state(){return{id,active,lighting:presentation.preset,wireframe:wire,rotate:turn,animate:moving};},
  dispose(){if(disposed)return;active=false;visibility();disposed=true;revision++;panel.dispose();presentation.dispose();if(model)disposeStructure(model);model=null;},
 };
}
