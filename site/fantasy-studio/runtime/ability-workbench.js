import {ABILITIES,ABILITY_BY_ID,MOVE_CATALOG,MOVE_BY_ID,abilityTiming,actionPhase,ATTACK_SAMPLES} from '../vendor/source-library.js';
import {createSourceMotion} from './source-motion.js';
import {createSourceEffects} from './source-effects.js';
import {applyPreviewEquipment,previewLoadout,posePreviewEquipment,previewEquipmentMode} from './preview-equipment.js';
import {mountLoadout} from '../models/weapons.js';
import {normalizeAbilityEquipment} from './ability-equipment.js';

export async function createAbilityWorkbench(stage,actor,options={}){
 const characterLoadout={...(actor.group.userData.resolvedLoadout||actor.group.userData.classLoadout||{weapon:'none',shield:'none'})};
 let equipment=normalizeAbilityEquipment(options.equipment);
 const motion=await(options.createMotion||createSourceMotion)(actor);
 let effects;
 try{effects=await(options.createEffects||createSourceEffects)(stage,actor,{scale:motion.scale,eventPhases:motion.authoredLibrary.eventPhases,motionDurations:new Map(motion.catalog.map(m=>[m.id,m.duration])),sampleMotion:(id,phase)=>{motion.sample(id,phase);posePreviewEquipment(actor,motion);}});}catch(error){motion.dispose();throw error;}
 let type='motion',entry=MOVE_BY_ID.get('idle'),time=0,duration=motion.clips.get('idle').duration,playing=false,loop=false,speed=2.5,showEffects=true,disposed=false,seekVersion=0;
 function pose(at){
  if(type==='ability'){
   const timing=abilityTiming(entry),phase=at<timing.release?at/timing.release*timing.marker:Math.min(1,timing.marker+(at-timing.release)/timing.recovery*(1-timing.marker));
   motion.sample(entry.visual.motion,phase,entry,actionPhase(entry,at));
  }else motion.sample(entry.id,Math.min(1,at/duration));
  actor.group.updateMatrixWorld(true);
  posePreviewEquipment(actor,motion);
  if(stage.contact){const hip=actor.rig.joints.hips;stage.contact.position.x=hip.position.x;stage.contact.position.y=hip.position.y+.15;}
 }
 function render(delta){
  pose(time);
  if(showEffects){if(type==='ability')effects.sample(time);else effects.updateMotion(entry.id,Math.min(1,time/duration),delta);}
 }
 function anchors(){
  if(type!=='ability'||!showEffects)return;
  const timing=abilityTiming(entry);
  if(['slash','impact'].includes(entry.visual.family))for(let i=0;i<ATTACK_SAMPLES;i++){pose(i/(ATTACK_SAMPLES-1)*(timing.release+timing.recovery));effects.captureMotionSample(i);}
  pose(timing.release);effects.captureRelease();pose(time);
 }
 function startEffects(){effects.reset();pose(0);if(type==='ability'&&showEffects){effects.begin(entry);anchors();}render();}
 function equip(next=equipment){
  if(next.mode==='action')applyPreviewEquipment(actor,previewLoadout(entry,type));
  else{
   if(next.mode==='custom')mountLoadout(actor.rig,next.weapon,next.shield);
   else if(options.restoreEquipment)options.restoreEquipment();
   else mountLoadout(actor.rig,characterLoadout.weapon,characterLoadout.shield);
   actor.previewEquipment=previewEquipmentMode(actor.group.userData.resolvedLoadout?.weapon);
  }
  equipment=next;
  options.appearance?.();
 }
 const api={
  motion,effects,abilities:ABILITIES,motions:MOVE_CATALOG,
  select(nextType,id){
   const next=nextType==='ability'?ABILITY_BY_ID.get(id):MOVE_BY_ID.get(id);if(!next)throw new Error(`Unknown ${nextType}: ${id}`);
   type=nextType;entry=next;time=0;duration=type==='ability'?abilityTiming(entry).duration:motion.clips.get(entry.id).duration;playing=true;
   equip();startEffects();options.select?.(type,entry,duration);options.change?.(api.state());return api.state();
  },
  update(delta){
   if(disposed||!playing)return;
   time+=Math.max(0,delta)*speed;
   if(time>=duration){if(loop){time%=duration;startEffects();}else{time=duration;playing=false;}}
   render(delta*speed);options.change?.(api.state());
  },
  seek(progress){seekVersion++;time=Math.max(0,Math.min(1,progress))*duration;playing=false;effects.reset();if(type==='ability'&&showEffects){pose(0);effects.begin(entry);anchors();}render();options.change?.(api.state());},
  replay(){time=0;playing=true;startEffects();options.change?.(api.state());},
  toggle(){if(!playing&&time>=duration)api.replay();else playing=!playing;options.change?.(api.state());},
  setSpeed(value){speed=Math.max(.1,Math.min(4,Number(value)||2.5));options.change?.(api.state());},
  setLoop(value){loop=!!value;options.change?.(api.state());},
  setEquipment(value){equip(normalizeAbilityEquipment(value,equipment));startEffects();options.change?.(api.state());},
  setEffects(value){showEffects=!!value;startEffects();},
  refreshEffects(){if(!disposed&&showEffects)effects.refreshFrame?.();},
  state(){const timing=type==='ability'?abilityTiming(entry):null;return {type,id:entry.id,label:entry.name||entry.label,time,duration,progress:duration?time/duration:0,playing,loop,speed,seekVersion,autoEquipment:equipment.mode==='action',equipment:{...equipment},resolvedEquipment:{...actor.group.userData.resolvedLoadout},showEffects,phase:time>=duration?'Complete':timing?(time<timing.release?'Gather':time<timing.release+timing.recovery?'Release':'Aftermath'):'Motion'};},
  dispose({restoreActor=true}={}){disposed=true;playing=false;effects.dispose();motion.dispose();if(restoreActor){actor.group.visible=true;if(stage.contact)stage.contact.position.set(-.1,.15,.01);delete actor.previewEquipment;}},
 };
 return api;
}
