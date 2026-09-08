const require=(value,message)=>{if(!value)throw new Error(message);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const resolved=studio=>({...studio.actor.group.userData.resolvedLoadout});

/** Exercise real equipment controls, rebuilds and workspace restoration. */
export async function verifyAbilityEquipment(studio){
 const {workspace}=studio,original={kind:studio.actor.kind,body:studio.actor.bodyType,
  weapon:studio.controls.weapon,shield:studio.controls.shield,loadout:resolved(studio)};
 const change=(id,value)=>{const control=document.getElementById(id);control.value=value;control.dispatchEvent(new Event('change'));};
 let wb=workspace.workbench;
 wb.setEquipment('character');wb.select('ability','fireball');
 require(equal(resolved(studio),original.loadout),'Character weapons disappeared from a spell preview');
 change('ability-equipment-mode','custom');change('ability-weapon','staff');change('ability-shield','skull');
 for(const id of['fireball','lightning']){
  wb.select('ability',id);wb.seek(.36);
  require(equal(resolved(studio),{weapon:'staff',shield:'skull'}),'Changing spells replaced custom equipment');
 }
 change('ability-weapon','greatsword');
 require(resolved(studio).shield==='none'&&document.getElementById('ability-shield').disabled,'Two-handed spell preview did not suppress its offhand');
 require(wb.state().equipment.shield==='skull','Two-handed spell preview erased the custom offhand choice');
 change('ability-weapon','bone_staff');
 require(equal(resolved(studio),{weapon:'bone_staff',shield:'skull'})&&!document.getElementById('ability-shield').disabled,'Caster staff did not restore the custom offhand');
 change('ability-equipment-mode','action');wb.select('ability','fireball');
 require(resolved(studio).weapon==='none','Match action no longer selects the spell loadout');
 change('ability-equipment-mode','custom');
 require(equal(resolved(studio),{weapon:'bone_staff',shield:'skull'}),'Switching back to Custom lost its saved equipment');
 await studio.setBody(original.body==='male'?'female':'male');wb=workspace.workbench;
 require(wb.state().equipment.mode==='custom'&&equal(resolved(studio),{weapon:'bone_staff',shield:'skull'}),'Body rebuild lost custom spell equipment');
 await studio.selectClass('mage');wb=workspace.workbench;
 require(equal(resolved(studio),{weapon:'bone_staff',shield:'skull'}),'Class rebuild lost custom spell equipment');
 require(document.getElementById('ability-weapon').value==='bone_staff'&&document.getElementById('ability-shield').value==='skull','Rebuilt preview controls differ from mounted equipment');
 await workspace.setMode('character');
 require(equal(resolved(studio),studio.actor.group.userData.classLoadout),'Leaving Abilities did not restore the current class equipment');
 await studio.setBody(original.body);await studio.selectClass(original.kind);
 studio.controls.weapon=original.weapon;studio.controls.shield=original.shield;await studio.rebuild({preserveCamera:true});
 await workspace.setMode('abilities');wb=workspace.workbench;
 require(wb.state().equipment.mode==='custom','Custom preferences did not survive a workspace round trip');
 wb.setEquipment('character');
 require(equal(resolved(studio),original.loadout),'Character mode did not restore the original selected loadout');
 return ['equipped spells','custom equipment controls','equipment mode retention','two-handed offhand handling','equipment rebuild persistence','character equipment restore'];
}
