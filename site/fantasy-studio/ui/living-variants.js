import {isChibiCreature} from '../data/chibi-creatures.js';
import {skinTones,hairColors} from '../data/character-colors.js';
import {isChibiMonster} from '../data/chibi-monsters.js';

const title=value=>String(value).replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export function livingVariantFields(entry){
 if(entry.worldKind==='creatures'&&isChibiMonster(entry.id))return [
  ...(entry.id==='skeleton'?[{key:'armor',label:'Outfit',choices:[{id:'bare',name:'Bare bones'},{id:'warrior',name:'Rusted warrior'}]}]:[]),
  {key:'clothColor',label:'Outfit color',type:'color'},
 ];
 if(entry.worldKind==='creatures'&&isChibiCreature(entry.id))return [
  {key:'skinTone',label:'Skin tone',choices:skinTones},
  {key:'hairColor',label:'Hair color',choices:hairColors},
  {key:'clothColor',label:'Outfit color',type:'color'},
 ];
 return Object.entries(entry.variants||{}).filter(([,choices])=>Array.isArray(choices)).map(([key,choices])=>({key,label:title(key),choices}));
}

export function renderLivingVariants(root,entry,actor,onVariant){
 const container=root.getElementById('living-variants');container.replaceChildren();
 for(const {key,label:text,choices,type} of livingVariantFields(entry)){
  const label=root.createElement('label');label.textContent=text;
  const control=root.createElement(type==='color'?'input':'select');control.setAttribute('aria-label',text);
  if(type==='color')control.type='color';
  else for(const choice of choices){const option=root.createElement('option');option.value=choice.id??choice;option.textContent=choice.label??choice.name??title(choice);control.append(option);}
  control.value=actor?.group.userData.variant?.[key]??choices?.[0]?.id??choices?.[0]??'#697054';
  control.addEventListener('change',()=>onVariant(key,control.value));label.append(control);container.append(label);
 }
}
