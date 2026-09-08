import * as THREE from 'three';
import {ABILITIES,MOVE_CATALOG,abilityTiming} from '../vendor/source-library.js';
import {saveCanvas} from './capture.js';
import {fingerprint} from './verification-source.js';
import {verifyAbilityEquipment} from './verify-ability-equipment.js';
const require=(value,message)=>{if(!value)throw new Error(message);};
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const signature=actor=>actor.rig.bones.flatMap(b=>[...b.position,...b.quaternion]);
function inspect(actor,label){
 actor.group.updateMatrixWorld(true);actor.rig.skeleton.update();
 for(const b of actor.rig.bones)require([...b.matrixWorld.elements,...b.quaternion].every(Number.isFinite),label+': invalid bone '+b.name);
 const point=new THREE.Vector3();let bound=0;
 actor.group.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!mesh.visible)return;
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i+=Math.max(1,Math.floor(positions.count/35))){
   point.fromBufferAttribute(positions,i);mesh.applyBoneTransform(i,point);
   require(Number.isFinite(point.length()),label+': invalid skin '+mesh.name);bound=Math.max(bound,point.length());
  }
 });
 require(bound<45,label+': exploded skin');return bound;
}
export async function verifyAbilities(studio){
 studio.testing=true;const result={passed:false,motions:[],abilities:[],variants:[],captures:[],controls:[],sourceFingerprint:null};
 const {workspace,stage}=studio;
 const originalLoadout={...studio.actor.group.userData.resolvedLoadout};
 try{
  require(document.getElementById('speed').value==='2.5','Default speed must be 2.5×');
  await workspace.setMode('abilities');let wb=workspace.workbench;
  result.controls.push(...await verifyAbilityEquipment(studio));wb=workspace.workbench;wb.setEquipment('action');
  for(const kind of['motion','ability'])for(const entry of kind==='motion'?MOVE_CATALOG:ABILITIES){
   wb.select(kind,entry.id);
   for(const phase of[0,.25,.6,1,.25]){wb.seek(phase);inspect(studio.actor,entry.id);}
   const first=signature(studio.actor);wb.seek(.8);wb.seek(.25);
   require(first.every((v,i)=>Math.abs(v-signature(studio.actor)[i])<1e-5),'Non-deterministic seek '+entry.id);
   stage.renderFrame();
   (kind==='motion'?result.motions:result.abilities).push(entry.id);
   await nextFrame();
  }
  wb.select('ability','lunge');wb.seek(0);const initial=studio.actor.rig.joints.hips.position.clone();wb.seek(.45);require(initial.distanceTo(studio.actor.rig.joints.hips.position)>3,'Lunge lost source travel');
  wb.select('motion','run');wb.setSpeed(2.5);wb.update(.05);require(Math.abs(wb.state().time-.125)<1e-6,'2.5× playback incorrect');
  for(const speed of[3,4]){wb.replay();wb.setSpeed(speed);wb.update(.05);require(Math.abs(wb.state().time-.05*speed)<1e-6,'Speed incorrect');result.controls.push(speed+'×');}
  wb.toggle();const paused=wb.state().time;wb.update(.2);require(wb.state().time===paused,'Paused preview advanced');result.controls.push('pause');
  wb.setLoop(true);wb.replay();wb.update(2);require(wb.state().playing&&wb.state().time<wb.state().duration,'Loop failed');wb.setLoop(false);result.controls.push('loop');
  wb.setEffects(false);require(!wb.effects.root.visible,'Effects switch failed');wb.setEffects(true);wb.setSpeed(2.5);
  wb.setEquipment(false);require(studio.actor.group.userData.resolvedLoadout.weapon===originalLoadout.weapon&&studio.actor.group.userData.resolvedLoadout.shield===originalLoadout.shield,'Manual default loadout was not restored');wb.setEquipment(true);result.controls.push('equipment restore','effects');
  const shots=[
   ['warrior','male','motion','light-attack',.27],['warrior','male','motion','heavy-attack',.33],['warrior','male','ability','lunge',.3],['warrior','male','motion','two-handed-strike',.52],
   ['mage','male','ability','fireball',.24],['mage','female','ability','lightning',.24],['wizard','male','ability','meteor',.62],['wizard','female','ability','raise-skeleton',.48],
   ['ranger','male','ability','aimed-shot',.22],['ranger','female','ability','volley',.36],['ranger','female','motion','run',.26],['warrior','female','motion','jump',.5],
   ['mage','female','motion','energy-missiles',.63],['wizard','male','ability','chain-lightning',.36],['ranger','male','ability','disengage',.2],['warrior','female','ability','shield-bash',.27],
  ];
  const sheet=document.createElement('canvas');sheet.width=2400;sheet.height=1760;const ctx=sheet.getContext('2d');
  ctx.fillStyle='#f5f2ed';ctx.fillRect(0,0,sheet.width,sheet.height);
  let index=0;const priorSize=stage.renderer.getSize(new THREE.Vector2()),priorRatio=stage.renderer.getPixelRatio();
  for(const[kind,body,type,id,phase]of shots){
   await workspace.setMode('character');await studio.setBody(body);await studio.selectClass(kind);await workspace.setMode('abilities');wb=workspace.workbench;
   wb.select(type,id);wb.seek(phase);workspace.frame();inspect(studio.actor,kind+' '+id);
   const variant=kind+'-'+body;if(!result.variants.includes(variant))result.variants.push(variant);
   stage.renderer.setPixelRatio(1);stage.renderer.setSize(600,400,false);stage.camera.aspect=1.5;stage.camera.updateProjectionMatrix();
   stage.renderFrame();
   const x=(index%4)*600,y=Math.floor(index/4)*440;ctx.drawImage(stage.renderer.domElement,x,y,600,400);ctx.fillStyle='#5a5143';ctx.font='15px -apple-system, sans-serif';ctx.fillText(`${kind} · ${body} · ${id}`,x+20,y+423);
   result.captures.push({kind,body,type,id,phase});index++;await nextFrame();
  }
  stage.renderer.setPixelRatio(priorRatio);stage.resize();
  await fetch('/__capture/import-review-sheet.png',{method:'POST',body:await new Promise(resolve=>sheet.toBlob(resolve,'image/png'))});
  const search=document.getElementById('ability-search');search.value='meteor';search.dispatchEvent(new Event('input'));require(document.querySelectorAll('#ability-list button').length===1,'Search failed');search.value='';search.dispatchEvent(new Event('input'));result.controls.push('search');
  require(studio.errors.length===0,'Browser errors: '+studio.errors.join(';'));
  result.sourceFingerprint=await fingerprint();result.passed=true;
 }catch(e){studio.errors.push(String(e.stack||e));}
 finally{
  await workspace.setMode('character');await studio.setBody('male');await studio.selectClass('mage');await workspace.setMode('abilities');workspace.workbench?.setEquipment('character');workspace.workbench?.select('ability','fireball');workspace.workbench?.seek(.24);workspace.frame();
  studio.testing=false;await studio.postReport({abilityVerification:result});
 }
 return result;
}
