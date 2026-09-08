import * as THREE from 'three';
import {facePresets} from '../data/face-presets.js';
import {wiki} from '../data/wiki.js';
import {createReviewSheet} from './review-sheet.js';
import {frameItem} from './frame-item.js';
import {fingerprint} from './verification-source.js';
import {customizationStorageKey} from '../ui/customization-state.js';

const assert=(value,message)=>{if(!value)throw new Error(message);};
const waitFor=async predicate=>{const end=performance.now()+15000;while(!predicate()){if(performance.now()>end)throw Error('Face selection did not settle');await new Promise(resolve=>setTimeout(resolve,16));}};
const meshes=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(o);});return out;};

export async function verifyFacePresets(studio){
 const {stage}=studio,renderer=stage.renderer,oldRatio=renderer.getPixelRatio(),old=studio.customization.snapshot();
 const body=studio.actor.bodyType,kind=studio.actor.kind,equipment={...studio.equipment},stored=localStorage.getItem(customizationStorageKey);
 const result={passed:false,faces:[],sheets:[],helmets:0,motionChecks:0,connectionViews:0};
 const announce=text=>window.parent.postMessage({faceStatus:text},location.origin);
 const portrait=(type,view,width=300,height=350)=>{
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);stage.camera.aspect=width/height;stage.camera.updateProjectionMatrix();
  const scale=type==='female'?.965:1;
  const frame=frameItem(stage.camera,new THREE.Box3(new THREE.Vector3(-.59,-.66,6.88*scale),new THREE.Vector3(.59,.53,8.13*scale)),{view,padding:1.09});
  if(view==='underchin'){
   stage.camera.position.copy(frame.center).addScaledVector(new THREE.Vector3(.55,-1,-.42).normalize(),frame.distance);
   stage.camera.lookAt(frame.center);stage.camera.updateMatrixWorld(true);
  }
  studio.actor.group.rotation.z=0;stage.renderFrame();
 };
 studio.testing=true;studio.customization.suspendPersistence(true);
 try{
  await studio.workspace.setMode('character');
  for(const type of ['male','female']){
   await studio.setBody(type);await studio.selectClass('paladin');await studio.setEquipment('head','none');
   await studio.customization.set({hairStyle:'default',hairColor:'dark-brown',skinTone:'warm-tan'});
   studio.setMotion('reference');
   const sheet=createReviewSheet({columns:5,count:20,cellWidth:300,cellHeight:350,title:'Face presets · '+type});
   const connections=createReviewSheet({columns:5,count:10,cellWidth:420,cellHeight:450,title:'Face connections · '+type});
   for(let i=0;i<facePresets[type].length;i++){
    const choice=facePresets[type][i],control=document.getElementById('face-preset');
    announce('Comparing '+type+' · '+choice.label);
    assert(control.options.length===5,'Face menu must have five choices');
    const beforeEquipment=JSON.stringify(studio.equipment),hairBefore=studio.actor.customization.hairStyle;
    control.value=choice.id;control.dispatchEvent(new Event('change'));
    await waitFor(()=>studio.actor.customization.facePreset===choice.id&&document.getElementById('loading').hidden);
    assert(studio.actor.customization.hairStyle===hairBefore,'Face reset hairstyle');
    assert(studio.actor.customization.skinTone==='warm-tan'&&studio.actor.customization.hairColor==='dark-brown','Face reset colors');
    assert(JSON.stringify(studio.equipment)===beforeEquipment,'Face reset equipment');
    assert(document.getElementById('face-preset-description').textContent===choice.description,'Preset description did not update');
    for(const [j,view]of ['front','three','side','top'].entries()){
     portrait(type,view);sheet.add(renderer.domElement,choice.label+' · '+view,i+j*5);
    }
    for(const [j,view]of ['overhead','underchin'].entries()){
     portrait(type,view,420,450);connections.add(renderer.domElement,choice.label+' · '+(view==='overhead'?'above':'below'),i+j*5);result.connectionViews++;
    }
    result.faces.push(type+':'+choice.id);
    for(const tier of wiki.tiers){
     await studio.setEquipment('head',tier.id+'_head');assert(studio.actor.customization.facePreset===choice.id,'Headwear lost face selection');
     assert(meshes(studio.actor.group).filter(m=>m.userData.part==='hair').every(m=>!m.visible),'Hair remains visible through headwear');result.helmets++;
    }
    await studio.setEquipment('head','none');
   }
   result.sheets.push(await sheet.save('face-presets-'+type));
   result.sheets.push(await connections.save('face-connections-'+type));
  }
  await studio.customization.set({facePreset:'heart',hairStyle:'bob',skinTone:'deep-brown',hairColor:'auburn'});
  await studio.setBody('male');await studio.customization.set({facePreset:'broad',hairStyle:'side_part'});
  for(const type of ['male','female']){
   await studio.setBody(type);
   for(const c of ['ranger','sorcerer','warrior']){
    await studio.selectClass(c);
    assert(studio.actor.customization.facePreset===(type==='male'?'broad':'heart'),'Class/body change lost the face');
    assert(studio.actor.customization.hairStyle===(type==='male'?'side_part':'bob'),'Class/body change lost hair');
   }
   await studio.workspace.setMode('abilities');
   for(const move of ['cast','run','heavy-attack']){
    studio.workspace.workbench.select('motion',move);studio.workspace.workbench.seek(.38);stage.renderFrame();
    for(const mesh of meshes(studio.actor.group).filter(m=>m.userData.part==='head')){
     const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,0);mesh.applyBoneTransform(0,p);
     assert(p.toArray().every(Number.isFinite),'Face failed during '+move);
    }
    result.motionChecks++;
   }
   await studio.workspace.setMode('character');
  }
  await studio.setEquipment('head','none');studio.customization.faceView();
  const pos=stage.camera.position.clone(),target=stage.controls.target.clone();
  await Promise.all([studio.customization.set({facePreset:'square'}),studio.customization.set({facePreset:'oval'})]);
  assert(studio.actor.customization.facePreset==='oval','Stale face rebuild won a race');
  assert(stage.camera.position.distanceTo(pos)<1e-8&&stage.controls.target.distanceTo(target)<1e-8,'Changing face moved camera');
  await studio.workspace.setMode('items');await studio.items.equip('plate_chest');await studio.workspace.setMode('character');
  assert(studio.actor.customization.facePreset==='oval','Items tab lost face selection');
  document.getElementById('customization-reset').click();await waitFor(()=>studio.actor.customization.facePreset==='default'&&document.getElementById('loading').hidden);
  assert(studio.customization.snapshot().facePresets.male==='default'&&studio.customization.snapshot().facePresets.female==='default','Reset omitted a body choice');
  assert(localStorage.getItem(customizationStorageKey)===stored,'Review changed saved user appearance');
  assert(studio.errors.length===0,studio.errors.join('\n'));result.sourceFingerprint=await fingerprint();result.passed=true;
 }catch(error){result.error=String(error.stack||error);}
 finally{
  await studio.customization.restore(old,{rebuildActor:false});await studio.workspace.setMode('character');await studio.setBody(body);await studio.selectClass(kind);
  for(const [slot,id]of Object.entries(equipment))if(studio.equipment[slot]!==id)await studio.setEquipment(slot,id);
  studio.customization.suspendPersistence(false);renderer.setPixelRatio(oldRatio);stage.resize();studio.testing=false;stage.renderFrame();
  await studio.postReport({facePresetVerification:result});announce(result.passed?'Face comparison complete: 10 faces, 60 views.':result.error);
 }
 return result;
}
