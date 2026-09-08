import * as THREE from 'three';
import {hairstyles} from '../data/hairstyles.js';
import {skinTones,hairColors} from '../data/character-colors.js';
import {wiki} from '../data/wiki.js';
import {createCustomizationState,customizationStorageKey} from '../ui/customization-state.js';
import {createReviewSheet} from './review-sheet.js';
import {exportCharacter} from './export.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fingerprint} from './verification-source.js';

const assert=(value,message)=>{if(!value)throw new Error(message);};
const meshes=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
const hex=material=>'#'+material.color.getHexString();
async function waitFor(condition){const end=performance.now()+10000;while(!condition()){if(performance.now()>end)throw new Error('Character control did not finish rebuilding');await new Promise(resolve=>setTimeout(resolve,16));}}
function disposeLoaded(scene){const geometry=new Set(),materials=new Set(),skeletons=new Set();scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.skeleton)skeletons.add(o.skeleton);});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());}

export async function verifyCustomization(studio){
 const stage=studio.stage,renderer=stage.renderer,oldRatio=renderer.getPixelRatio(),oldState=studio.customization.snapshot(),oldBody=studio.actor.bodyType,oldKind=studio.actor.kind;
 const stored=localStorage.getItem(customizationStorageKey),result={passed:false,styles:[],skinTones:[],hairColors:[],helmets:0,exports:0,abilities:0,classes:[],sheets:[],persistence:false};
 studio.testing=true;studio.customization.suspendPersistence(true);
 const render=(body,angle=0,width=340,height=370,portrait=true)=>{
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);stage.camera.aspect=width/height;stage.camera.updateProjectionMatrix();
  const z=body==='female'?7.5*.965:7.5,distance=portrait?4.2:21;
  stage.camera.position.set(Math.sin(angle)*distance,-Math.cos(angle)*distance,portrait?z+.10:6.5);stage.camera.lookAt(0,.05,portrait?z:4);stage.renderFrame();
 };
 try{
  await studio.workspace.setMode('character');await studio.customization.restore({});
  for(const body of ['male','female']){
   await studio.setBody(body);await studio.selectClass('paladin');await studio.setEquipment('head','none');await studio.setEquipment('hands','none');
   await studio.customization.set({hairColor:'dark-brown',skinTone:'warm-tan'});
   const sheet=createReviewSheet({columns:3,count:18,cellWidth:340,cellHeight:370,title:'Hair styles · '+body});
   for(let i=0;i<hairstyles[body].length;i++){
    const style=hairstyles[body][i],styleControl=document.getElementById('hair-style');styleControl.value=style.id;styleControl.dispatchEvent(new Event('change'));await waitFor(()=>studio.actor.customization.hairStyle===style.id&&document.getElementById('loading').hidden);
    assert(document.getElementById('hair-style').value===style.id,'Hair control differs from model');
    assert(studio.actor.customization.hairStyle===style.id,'Hair style was not rebuilt');
    const hair=meshes(studio.actor.group).filter(m=>m.userData.part==='hair');assert(hair.length>0&&hair.every(m=>m.visible),'Hair missing with helmet removed');
    for(let view=0;view<3;view++){render(body,[.22,Math.PI/2,Math.PI][view],sheet.cellWidth,sheet.cellHeight);sheet.add(renderer.domElement,style.label+' · '+['Front','Side','Back'][view],i*3+view);}
    result.styles.push(body+':'+style.id);
    const buffer=await exportCharacter(studio.actor),parsed=await new GLTFLoader().parseAsync(buffer,'');
    assert(meshes(parsed.scene).some(m=>m.userData.part==='hair'&&m.isSkinnedMesh),'GLB lost skinned hair');
    const head=meshes(parsed.scene).find(m=>m.name.replaceAll('_',' ')==='Head facial planes');assert(head,'GLB lost face mesh');assert(hex(head.material)===skinTones[5].color,'GLB lost selected complexion: '+hex(head.material));disposeLoaded(parsed.scene);result.exports++;
    for(const tier of wiki.tiers){await studio.setEquipment('head',tier.id+'_head');assert(meshes(studio.actor.group).filter(m=>m.userData.part==='hair').every(m=>!m.visible),'Hair protrudes through helmet');assert(studio.actor.customization.hairStyle===style.id,'Helmet reset selected style');result.helmets++;}
    await studio.setEquipment('head','none');assert(meshes(studio.actor.group).filter(m=>m.userData.part==='hair').every(m=>m.visible),'Helmet removal lost hair');
    await studio.workspace.setMode('abilities');for(const move of ['cast','run']){studio.workspace.workbench.select('motion',move);studio.workspace.workbench.seek(.38);stage.renderFrame();for(const m of meshes(studio.actor.group).filter(m=>m.userData.part==='hair')){const p=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,0);m.applyBoneTransform(0,p);assert(p.toArray().every(Number.isFinite),'Hair skinning failed during '+move);}result.abilities++;}
    await studio.workspace.setMode('character');
   }
   result.sheets.push(await sheet.save('customization-hair-'+body));
   const skinSheet=createReviewSheet({columns:4,count:skinTones.length,cellWidth:320,cellHeight:360,title:'Skin tones · '+body});
   const protectedColors=()=>meshes(studio.actor.group).filter(m=>!['skin','skin_dark','skin_light','hair'].includes(m.userData.materialKey)).map(m=>m.name+':'+hex(m.material)).join('|');
   const untouched=protectedColors();
   for(let i=0;i<skinTones.length;i++){
    const tone=skinTones[i],slider=document.getElementById('skin-tone');slider.value=String(i);slider.dispatchEvent(new Event('input'));
    const exposed=meshes(studio.actor.group).filter(m=>m.visible&&m.userData.materialKey==='skin');
    assert(exposed.some(m=>m.name.startsWith('Block hand')),'Skin check omitted hands');
    assert(exposed.every(m=>hex(m.material)===tone.color),'Skin tone inconsistent across body: '+tone.id);
    assert(protectedColors()===untouched,'Skin slider changed eyes or equipment');assert(slider.getAttribute('aria-valuetext').includes(tone.label),'Slider lacks preset name');
    render(body,.2,skinSheet.cellWidth,skinSheet.cellHeight);skinSheet.add(renderer.domElement,tone.label,i);result.skinTones.push(body+':'+tone.id);
   }
   result.sheets.push(await skinSheet.save('customization-skin-'+body));
   await studio.customization.set({skinTone:'warm-tan'});
   const colorSheet=createReviewSheet({columns:4,count:hairColors.length,cellWidth:320,cellHeight:360,title:'Hair colors · '+body});
   for(let i=0;i<hairColors.length;i++){
    const color=hairColors[i];document.querySelector(`[data-hair-color="${color.id}"]`).click();
    const colored=meshes(studio.actor.group).filter(m=>m.userData.materialKey==='hair');assert(colored.some(m=>m.name.startsWith('Brow'))&&colored.every(m=>hex(m.material)===color.color),'Hair or brow color did not update');
    render(body,.2,colorSheet.cellWidth,colorSheet.cellHeight);colorSheet.add(renderer.domElement,color.label,i);result.hairColors.push(body+':'+color.id);
   }
   result.sheets.push(await colorSheet.save('customization-colors-'+body));
  }
  await studio.customization.set({skinTone:'deep-brown',hairColor:'auburn',hairStyle:hairstyles.female[2].id});
  const older=studio.customization.set({hairStyle:hairstyles.female[1].id});studio.customization.faceView();const facePosition=stage.camera.position.clone();const newer=studio.customization.set({hairStyle:hairstyles.female[2].id});await Promise.all([older,newer]);assert(stage.camera.position.distanceTo(facePosition)<1e-8,'Rapid hairstyle changes reset the current camera');
  await studio.setBody('male');await studio.customization.set({hairStyle:hairstyles.male[3].id});
  for(const body of ['male','female']){
   await studio.setBody(body);
   for(const opening of wiki.openings){await studio.selectClass(opening.id);assert(studio.actor.customization.skinTone==='deep-brown'&&studio.actor.customization.hairColor==='auburn','Class reset colors');assert(studio.actor.customization.hairStyle===hairstyles[body][body==='male'?3:2].id,'Body or class reset hair');result.classes.push(body+':'+opening.id);}
  }
  await studio.workspace.setMode('items');await studio.items.equip('plate_chest');await studio.workspace.setMode('abilities');studio.workspace.workbench.select('ability','fireball');studio.workspace.workbench.seek(.24);assert(studio.actor.customization.skinTone==='deep-brown','Equipment/workspace reset customization');await studio.workspace.setMode('character');
  await studio.setEquipment('head','none');
  const customBuffer=await exportCharacter(studio.actor),customParsed=await new GLTFLoader().parseAsync(customBuffer,'');assert(meshes(customParsed.scene).filter(m=>m.userData.materialKey==='skin').every(m=>hex(m.material)===skinTones.find(t=>t.id==='deep-brown').color),'GLB lost edited skin color');
  const exportedHair=meshes(customParsed.scene).filter(m=>m.userData.materialKey==='hair');assert(exportedHair.some(m=>m.userData.part==='hair')&&exportedHair.every(m=>hex(m.material)===hairColors.find(c=>c.id==='auburn').color),'GLB lost edited hair color');disposeLoaded(customParsed.scene);result.exports++;
  const saved=studio.customization.snapshot(),memory=new Map([[customizationStorageKey,JSON.stringify(saved)]]),reload=createCustomizationState({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)});assert(JSON.stringify(reload.snapshot())===JSON.stringify(saved),'Reload changed saved preferences');
  assert(localStorage.getItem(customizationStorageKey)===stored,'Verification changed saved user preferences');result.persistence=true;
  assert(studio.errors.length===0,studio.errors.join('\n'));result.sourceFingerprint=await fingerprint();result.passed=true;
 }catch(error){result.error=String(error.stack||error);studio.errors.push(result.error);}
 finally{
  await studio.customization.restore(oldState,{rebuildActor:false});studio.customization.suspendPersistence(false);await studio.workspace.setMode('character');await studio.setBody(oldBody);await studio.selectClass(oldKind);
  renderer.setPixelRatio(oldRatio);stage.resize();studio.testing=false;stage.renderFrame();await studio.postReport({customizationVerification:result});
 }
 return result;
}
