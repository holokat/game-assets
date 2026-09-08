import {ABILITIES,ABILITY_SCHOOLS,MOVE_CATALOG,abilityTiming} from '../vendor/source-library.js';
import {weapons,shields,resolveHandheldId} from '../models/weapons.js';
import {twoHandedProfiles} from '../models/two-handed-profiles.js';
import {abilityEquipmentModes,normalizeAbilityEquipment} from '../runtime/ability-equipment.js';
const sentence=value=>value.charAt(0).toUpperCase()+value.slice(1).toLowerCase();
const $=id=>document.getElementById(id);
export function createAbilityPanel(actions){
 let kind='ability',selected=null;
 const search=$('ability-search'),filter=$('ability-category'),list=$('ability-list');
 for(const [id,options]of[['ability-equipment-mode',abilityEquipmentModes],['ability-weapon',weapons],['ability-shield',shields]]){
  $(id).replaceChildren(...options.map(([value,label])=>new Option(label,value)));
 }
 function equipment(preferences,resolved){
  const selected=normalizeAbilityEquipment(preferences),custom=selected.mode==='custom';
  const weapon=selected.weapon==='default'?resolved?.weapon:resolveHandheldId(selected.weapon),profile=twoHandedProfiles[weapon];
  const bothHands=custom&&!!profile&&profile.kind!=='staff';
  $('ability-equipment-mode').value=selected.mode;
  $('ability-custom-equipment').hidden=!custom;
  $('ability-weapon').value=selected.weapon;
  $('ability-shield').value=bothHands?'none':selected.shield;
  $('ability-shield').disabled=bothHands;
  $('ability-offhand-note').hidden=!bothHands;
  $('ability-equipment-description').textContent=selected.mode==='character'?'Uses the equipment selected in Character.':selected.mode==='action'?'Matches each action, including unarmed spells.':'Keeps these choices when you change spells. Character equipment stays saved.';
 }
 equipment();
 function categories(){
  filter.replaceChildren(new Option('All '+(kind==='ability'?'schools':'categories'),'all'));
  for(const name of kind==='ability'?ABILITY_SCHOOLS:[...new Set(MOVE_CATALOG.map(m=>m.category))])filter.add(new Option(name,name));
 }
 function renderList(){
  const query=search.value.trim().toLowerCase(),entries=kind==='ability'?ABILITIES:MOVE_CATALOG;
  const shown=entries.filter(e=>(filter.value==='all'||(e.school||e.category)===filter.value)&&[e.id,e.name||e.label,e.school||e.category,e.description].join(' ').toLowerCase().includes(query));
  list.replaceChildren();
  for(const entry of shown){
   const button=document.createElement('button');button.className='ability-card';button.dataset.entry=entry.id;button.setAttribute('aria-pressed',String(selected?.id===entry.id&&selected?.type===kind));
   const title=document.createElement('span');title.textContent=sentence(entry.name||entry.label);
   const meta=document.createElement('small');meta.textContent=kind==='ability'?entry.school:entry.category;
   button.append(title,meta);button.onclick=()=>actions.select(kind,entry.id);list.append(button);
  }
  $('ability-count').textContent=`${shown.length} ${kind==='ability'?'abilities':'motions'}`;
  $('ability-empty').hidden=shown.length!==0;
 }
 categories();renderList();search.oninput=renderList;filter.onchange=renderList;
 for(const button of document.querySelectorAll('[data-library]'))button.onclick=()=>{
  kind=button.dataset.library;search.value='';categories();renderList();
  document.querySelectorAll('[data-library]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));
 };
 $('ability-play').onclick=actions.toggle;$('ability-replay').onclick=actions.replay;
 $('ability-timeline').oninput=e=>actions.seek(Number(e.target.value));
 $('ability-speed').onchange=e=>actions.speed(Number(e.target.value));
 $('ability-loop').onchange=e=>actions.loop(e.target.checked);
 $('ability-equipment-mode').onchange=e=>actions.equipment({mode:e.target.value});
 $('ability-weapon').onchange=e=>actions.equipment({mode:'custom',weapon:e.target.value});
 $('ability-shield').onchange=e=>actions.equipment({mode:'custom',shield:e.target.value});
 $('ability-effects').onchange=e=>actions.effects(e.target.checked);
 $('ability-frame').onclick=actions.frame;
 return {
  equipment,
  select(type,entry,duration){
   selected={type,id:entry.id};
   if(kind!==type){kind=type;search.value='';categories();}
   document.querySelectorAll('[data-library]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.library===kind)));
   $('ability-title').textContent=sentence(entry.name||entry.label);
   $('ability-school').textContent=entry.school||entry.category;
   $('ability-description').textContent=entry.description;
   $('ability-requirement').textContent=type==='ability'?entry.requirement:'';
   $('ability-requirement').hidden=!$('ability-requirement').textContent;
   const facts=type==='ability'?[['Motion',sentence(MOVE_CATALOG.find(m=>m.id===entry.visual.motion).label)],['Effect',sentence(entry.visual.family)],['Preview',`${duration.toFixed(2)} s`]]:[['Preview',`${duration.toFixed(2)} s`],['Playback',entry.loop?'Looping motion':'One-shot motion']];
   $('ability-facts').replaceChildren();
   for(const[label,value]of facts){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('ability-facts').append(dt,dd);}
   renderList();
  },
  update(state){
   $('ability-play').textContent=state.playing?'Pause':'Play';$('ability-play').setAttribute('aria-label',state.playing?'Pause ability preview':'Play ability preview');
   $('ability-timeline').value=String(state.progress);$('ability-timeline').setAttribute('aria-valuetext',`${state.time.toFixed(2)} of ${state.duration.toFixed(2)} seconds`);
   $('ability-time').textContent=`${state.time.toFixed(2)} / ${state.duration.toFixed(2)} s`;
   $('ability-phase').textContent=state.phase;$('ability-speed').value=String(state.speed);
   $('ability-loop').checked=state.loop;
   if(state.equipment)equipment(state.equipment,state.resolvedEquipment);
  },
  busy(value){for(const id of['ability-play','ability-replay','ability-timeline'])$(id).disabled=value;},
  dispose(){
   for(const element of document.querySelectorAll('#ability-library button,#ability-library input,#ability-library select,#ability-inspector button,#ability-inspector input,#ability-inspector select')){
    element.onclick=null;element.oninput=null;element.onchange=null;
   }
  },
 };
}
