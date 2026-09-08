import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {livingCatalog,livingByKey} from '../data/living-catalog.js';
import {effectById} from '../data/effect-catalog.js';
import {createEffectContext,disposeEffectContext} from '../runtime/world-effects/context.js';
import {effectPreset} from '../runtime/world-effects/index.js';
import {createLivingModel} from '../runtime/living-model.js';
import {createStructurePresentation} from '../runtime/structure-presentation.js';
import {createLivingPanel} from './living-panel.js';
import {downloadBlob} from '../runtime/export.js';

export function createLivingWorkspace({stage,root=document,getActor,dirty,report}){
 const el=id=>root.getElementById(id),presentation=createStructurePresentation(stage,{dirty});
 let selected='creatures:bandit',actor=null,active=false,disposed=false,revision=0,time=0,clip='idle',playing=true,speed=1,loop=true,turn=false,wire=false,skeleton=false,helper=null,options={},context=null,showContext=true;
 const selectionByKind={};
 const panel=createLivingPanel({root,onSelect:select,onKind:setKind,onClip(value){clip=value;time=0;sample();},onPlay:toggle,onReplay:replay,onSeek:seek,onSpeed:value=>{speed=value;},onLoop:value=>{loop=value;},onLight:presentation.lighting,onWire:value=>{wire=value;applyInspection();},onSkeleton:value=>{skeleton=value;applyInspection();},onTurn:value=>{turn=value;dirty();},onContext:value=>{showContext=value;if(context)context.visible=value;dirty();},onExport:exportModel,onVariant(key,value){options={...options,[key]:value};select(selected,{preserveOptions:true});}});
 function isEffect(){const entry=livingByKey.get(selected);return entry?.worldKind==='effects'||entry?.type==='vfx';}
 function duration(){return actor?.clips?.find(c=>c.name===clip)?.duration||effectById.get(livingByKey.get(selected)?.id)?.duration||4;}
 function sample(){actor?.update(time,clip);helper?.updateMatrixWorld(true);panel.playback({time,duration:duration(),playing});dirty();}
 function clearHelper(){if(!helper)return;helper.removeFromParent();helper.geometry.dispose();helper.material.dispose();helper=null;}
 function applyInspection(){actor?.group.traverse(o=>{for(const mat of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if('wireframe'in mat)mat.wireframe=wire;}});if(helper)helper.visible=active&&skeleton;dirty();}
 function heading(){const entry=livingByKey.get(selected);el('class-title').textContent=entry.name;el('class-subtitle').textContent=entry.filter||'Living world';el('action-status').textContent=isEffect()?'Effect preview · Metres':'World asset · Metres';let triangles=0,draws=0;actor?.group.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws++;}if(o.isPoints)draws++;});el('geometry-count').textContent=`${Math.round(triangles).toLocaleString()} triangles · ${draws} draw calls`;el('scene').setAttribute('aria-label',`Interactive 3D world asset: ${entry.name}`);}
 function visibility(){if(getActor())getActor().group.visible=!active;if(stage.skeletonHelper)stage.skeletonHelper.visible=!active&&el('skeleton').checked;presentation.setActive(active);if(helper)helper.visible=active&&skeleton;if(active)heading();}
 async function select(key,{preserveOptions=false}={}){
  if(disposed)return;const entry=livingByKey.get(key);if(!entry)throw new Error(`Unknown asset: ${key}`);const token=++revision;selected=key;selectionByKind[entry.worldKind]=key;if(panel.kind!==entry.worldKind)panel.setKind(entry.worldKind);if(!preserveOptions)options={};panel.inspect(entry,{busy:true});
  try{const next=await createLivingModel(key,options);if(disposed||revision!==token){next.dispose();return;}clearHelper();if(actor)actor.dispose();actor=next;presentation.setModel(actor.group);if(context)disposeEffectContext(context);context=null;if(isEffect()){context=createEffectContext(entry.id);context.visible=showContext;presentation.root.add(context);}time=0;clip=actor.clips?.[0]?.name||'idle';playing=!!(actor.clips?.length||isEffect())&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   if(entry.worldKind==='creatures'){helper=new THREE.SkeletonHelper(actor.group);helper.name='Creature skeleton inspection';stage.scene.add(helper);}
   if(isEffect()){presentation.lighting('dusk');el('living-light').value='dusk';}else if(presentation.preset==='dusk'){presentation.lighting('daylight');el('living-light').value='daylight';}
   applyInspection();panel.inspect(entry,{actor,clip});sample();if(active){visibility();heading();}dirty();
  }catch(error){if(token===revision&&!disposed){report(error);panel.inspect(entry,{error:'This asset could not be built. Select it to retry.'});}}
 }
 async function setKind(kind){panel.setKind(kind);return select(selectionByKind[kind]||livingCatalog.find(e=>e.worldKind===kind).key);}
 function toggle(){playing=!playing;sample();}
 function replay(){time=0;playing=true;sample();}
 function seek(progress){time=Math.max(0,Math.min(1,progress))*duration();playing=false;sample();}
 async function exportBuffer(key=selected){const entry=livingByKey.get(key);if(entry.worldKind==='effects'||entry.type==='vfx')return JSON.stringify(effectPreset(entry.id),null,2)+'\n';const fresh=await createLivingModel(key,key===selected?options:{});try{fresh.update(0,'idle');return await new GLTFExporter().parseAsync(fresh.group,{binary:true,onlyVisible:true,trs:true,animations:fresh.clips||[]});}finally{fresh.dispose();}}
 async function exportModel(){const key=selected;try{panel.status('Preparing export…');const data=await exportBuffer(key);downloadBlob(data,typeof data==='string'?'application/json':'model/gltf-binary',`${livingByKey.get(key).id}.${typeof data==='string'?'effect.json':'glb'}`);panel.status(typeof data==='string'?'Effect preset exported.':'Asset and available clips exported.');}catch(error){report(error);panel.status('Export failed. Try again.');}}
 return {select,setKind,panel,presentation,exportBuffer,exportModel,toggle,replay,seek,
  get active(){return active;},get actor(){return actor;},get id(){return livingByKey.get(selected)?.id;},get key(){return selected;},get model(){return actor?.group;},
  async enter(){active=true;visibility();if(actor){panel.inspect(livingByKey.get(selected),{actor,clip});presentation.frame();}else await select(selected);},
  exit(){revision++;active=false;visibility();},afterRebuild(){if(active)visibility();},frame:view=>presentation.frame(view),
  state:()=>({selected,active,time,clip,playing,speed,loop,turn,options}),
  update(delta){if(!active)return false;if(playing){time+=Math.max(0,delta)*speed;const d=duration();if(time>d){if(loop)time%=d;else{time=d;playing=false;}}actor?.update(time,clip);helper?.updateMatrixWorld(true);panel.playback({time,duration:d,playing});}presentation.update(delta,{rotate:turn});return playing||turn;},
  dispose(){if(disposed)return;active=false;visibility();disposed=true;revision++;clearHelper();if(context)disposeEffectContext(context);context=null;actor?.dispose();actor=null;panel.dispose();presentation.dispose();},
 };
}
