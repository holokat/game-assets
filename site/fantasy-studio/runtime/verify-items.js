import {wiki} from '../data/wiki.js';
import {studioClasses} from '../data/studio-classes.js';
import {studioNpcs} from '../data/studio-npcs.js';
import {verifyItemOutfits} from './verify-item-outfits.js';
import {itemCatalog,itemLabel} from '../data/item-catalog.js';
import {materialPresets} from '../data/materials.js';
import {createReviewSheet} from './review-sheet.js';
import {fingerprint} from './verification-source.js';

const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const sorted=values=>[...values].sort().join('|');
const meshes=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
function finite(root){for(const mesh of meshes(root))assert([...mesh.geometry.attributes.position.array].every(Number.isFinite),'Nonfinite '+mesh.name);}

export async function verifyItemStudio(studio){
 const result={passed:false,items:0,classes:[],npcs:[],outfitColorChecks:0,materials:[],swaps:0,exports:0,abilityChecks:0,interactionChecks:0,sheets:[]},stage=studio.stage,renderer=stage.renderer;
 const materialState=studio.items.snapshotMaterials(),oldRatio=renderer.getPixelRatio();
 const characterState=studio.customization.snapshot();studio.customization.suspendPersistence(true);await studio.customization.restore({}, {rebuildActor:false});
 studio.testing=true;document.body.dataset.verifying='true';
 studio.items.suspendPersistence(true);studio.items.restoreMaterials({});
 const renderSize=(width,height)=>{renderer.setPixelRatio(1);renderer.setSize(width,height,false);stage.camera.aspect=width/height;stage.camera.updateProjectionMatrix();if(studio.items.active&&studio.items.viewMode==='item')studio.items.frame('three');stage.renderFrame();};
 try{
  await studio.workspace.setMode('character');
  assert(sorted([...document.querySelectorAll('[data-class]')].map(b=>b.dataset.class))===sorted(studioClasses.map(c=>c.id)),'Class selector differs from the studio cast');
  assert(document.getElementById('speed').value==='2.5','Default playback speed changed');
  assert(['3','4'].every(v=>[...document.getElementById('speed').options].some(o=>o.value===v)),'Fast playback options missing');
  const speed=document.getElementById('speed');
  for(const value of ['0.5','1','1.5','2','2.5','3','4']){
   speed.value=value;speed.dispatchEvent(new Event('change'));
   assert(speed.value===value&&studio.animator.speed===Number(value)&&studio.state.preview.speed===Number(value),'Playback control lost its selected rate');
  }
  speed.value='2.5';speed.dispatchEvent(new Event('change'));result.interactionChecks++;
  assert(sorted([...document.getElementById('npc-occupation').options].map(option=>option.value))===sorted(studioNpcs.map(entry=>entry.id)),'NPC outfit choices changed');
  assert(!document.getElementById('item-slot'),'Individual armor slot control remains');
  assert(![...document.getElementById('item-category').options].some(option=>option.value==='armor'),'Retired armor category remains');
  const pendingRebuild=studio.rebuild();
  const weapon=document.getElementById('weapon');weapon.value='longsword';weapon.dispatchEvent(new Event('change'));
  await pendingRebuild;
  assert(weapon.value==='longsword'&&studio.actor.group.userData.resolvedLoadout.weapon==='longsword','Rebuild restored stale handheld controls');
  await studio.selectClass('warrior');result.interactionChecks++;
  const skeleton=document.getElementById('skeleton');skeleton.checked=true;skeleton.dispatchEvent(new Event('change'));
  await studio.workspace.setMode('items');
  assert(!stage.skeletonHelper.visible,'Skeleton overlays standalone item');await studio.workspace.setMode('character');assert(stage.skeletonHelper.visible,'Skeleton option was not restored');skeleton.checked=false;skeleton.dispatchEvent(new Event('change'));result.interactionChecks++;
  const first=studio.workspace.setMode('abilities');await studio.workspace.setMode('character');const second=studio.workspace.setMode('abilities');await Promise.all([first,second]);assert(studio.workspace.workbench,'Rapid tab switch stranded abilities');result.interactionChecks++;
  studio.workspace.workbench.setEquipment(false);assert(studio.actor.previewEquipment==='sword-shield','Default longsword uses unarmed adaptation');studio.workspace.workbench.setEquipment(true);result.interactionChecks++;
  await studio.workspace.setMode('items');
  assert(!itemCatalog.some(item=>['armor','armour'].includes(item.kind)),'Retired armor remains in active catalog');
  const categories=[['items',i=>i.kind!=='material'],['materials',i=>i.kind==='material']];
  for(const [name,filter]of categories){
   const entries=itemCatalog.filter(filter),sheet=createReviewSheet({columns:name==='materials'?5:6,count:entries.length,title:'Kaldera '+name});
   for(let index=0;index<entries.length;index++){
    const item=entries[index];await studio.items.select(item.id);const model=studio.items.preview.model;
    assert(model?.userData.itemId===item.id,'Wrong item preview: '+item.id);assert(meshes(model).length>0,'Empty item: '+item.id);finite(model);
    renderSize(sheet.cellWidth,sheet.cellHeight);sheet.add(renderer.domElement,itemLabel(item),index);result.items++;
   }
   result.sheets.push(await sheet.save('wiki-'+name+'-sheet'));
  }
  // Test the real search and category controls, including an empty result.
  const search=document.getElementById('item-search');search.value='plate';search.dispatchEvent(new Event('input'));
  assert(document.querySelectorAll('.item-card').length===itemCatalog.filter(i=>`${i.name} ${i.family||''} ${i.colour||''}`.toLowerCase().includes('plate')).length,'Item search mismatch');
  search.value='no-item-matches-this';search.dispatchEvent(new Event('input'));assert(!document.getElementById('item-empty').hidden,'No-results state missing');search.value='';search.dispatchEvent(new Event('input'));
  await studio.items.select('longsword');
  const materialTarget=document.getElementById('item-material-target');
  materialTarget.value='metal';materialTarget.dispatchEvent(new Event('change'));
  document.querySelector('[data-material="copper"]').click();
  await studio.items.select('longsword');
  assert(studio.items.selection('longsword').metal==='copper','Material component click lost its target');
  assert(document.querySelector('[data-material="copper"]').getAttribute('aria-pressed')==='true','Material selection feedback missing');
  assert(meshes(studio.items.preview.model).some(mesh=>mesh.material.userData.itemMaterial==='copper'),'Material target never reached preview geometry');
  materialTarget.value='finish';materialTarget.dispatchEvent(new Event('change'));
  await studio.items.material(null,'all');result.interactionChecks++;
  const finishSheet=createReviewSheet({columns:5,count:materialPresets.length,title:'Material finishes on matching construction parts'});
  for(let index=0;index<materialPresets.length;index++){
   const material=materialPresets[index];
   await studio.items.select(material.role==='wood'?'arrow':'longsword');
   await studio.items.material(material.id,'finish');
   assert(meshes(studio.items.preview.model).some(m=>m.material.userData.itemMaterial===material.id),'Finish did not reach model: '+material.id);
   renderSize(finishSheet.cellWidth,finishSheet.cellHeight);finishSheet.add(renderer.domElement,material.name,index);result.materials.push(material.id);
  }
  result.sheets.push(await finishSheet.save('wiki-material-finishes-sheet'));
  await studio.items.material(null,'all');
  await verifyItemOutfits(studio,{result,renderSize});
  await studio.selectClass('wizard');await studio.workspace.setMode('items');
  const completeOutfit=JSON.stringify(studio.equipment);
  for(const item of wiki.bases.filter(item=>item.kind==='armour')){
   await studio.items.select(item.id);
   assert(studio.items.id==='longsword','Retired item did not fall back: '+item.id);
   await studio.items.equip(item.id);
   assert(JSON.stringify(studio.equipment)===completeOutfit,'Retired item changed the complete outfit');
  }
  for(const item of itemCatalog.filter(i=>['weapon','shield','offhand','tool','jewellery'].includes(i.kind))){await studio.items.equip(item.id);finite(studio.actor.group);assert(item.id==='fists'||(studio.actor.group.userData.loadout||[]).some(root=>root.userData.itemId===item.id),'Handheld did not equip: '+item.id);result.swaps++;}
  // A finish chosen in the library survives character rebuilding and tab changes.
  await studio.items.equip('longsword');await studio.items.material('copper','finish');
  const colored=()=>{
   const item=studio.actor.group.userData.loadout.find(root=>root.userData.itemId==='longsword');
   const parts=item?meshes(item).filter(mesh=>mesh.userData.materialRole==='metal'):[];
   return parts.length>0&&parts.every(mesh=>mesh.material.userData.itemMaterial==='copper');
  };
  assert(colored(),'Material did not reach the equipped weapon');
  await studio.rebuild();assert(colored(),'Material lost during character rebuild');
  await studio.workspace.setMode('abilities');studio.workspace.workbench.setEquipment('character');studio.workspace.workbench.select('ability','fireball');studio.workspace.workbench.seek(.24);assert(colored(),'Material lost entering abilities');
  await studio.workspace.setMode('character');assert(colored(),'Material lost returning from abilities');
  assert(studio.errors.length===0,studio.errors.join('\n'));
  result.sourceFingerprint=await fingerprint();result.passed=true;
 }catch(error){result.error=String(error.stack||error);studio.errors.push(result.error);}
 finally{
  studio.items.restoreMaterials(materialState);studio.items.suspendPersistence(false);renderer.setPixelRatio(oldRatio);delete document.body.dataset.verifying;studio.testing=false;
  await studio.customization.restore(characterState,{rebuildActor:false});studio.customization.suspendPersistence(false);
  await studio.workspace.setMode('character');await studio.selectClass('warrior');stage.resize();stage.renderFrame();await studio.postReport({itemVerification:result});
 }
 return result;
}
