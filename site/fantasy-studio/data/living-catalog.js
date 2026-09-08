import {creatureCatalog} from './creature-catalog.js';
import {forageCatalog} from './forage-catalog.js';
import {dressingCatalog} from './dressing-catalog.js';
import {effectCatalog} from './effect-catalog.js';
export const worldKinds=Object.freeze({creatures:'Creatures',forage:'Forage',dressing:'Dressing',effects:'Effects'});
export const livingCatalog=[
 ...creatureCatalog.map(e=>({...e,worldKind:'creatures',filter:e.rig,description:e.description||e.moves})),
 ...forageCatalog.map(e=>({...e,worldKind:'forage',filter:e.tag||e.category})),
 ...dressingCatalog.map(e=>({...e,worldKind:'dressing',filter:e.zone})),
 ...effectCatalog.map(e=>({...e,worldKind:'effects',filter:e.category})),
].map(e=>({...e,name: /Oram|Old Grist|Will o/.test(e.name)?e.name:e.name.charAt(0)+e.name.slice(1).toLowerCase(),key:`${e.worldKind}:${e.id}`}));
export const livingByKey=new Map(livingCatalog.map(e=>[e.key,e]));
export function filterLivingCatalog({kind='creatures',query='',filter=''}={}){const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return livingCatalog.filter(e=>e.worldKind===kind&&(!filter||e.filter===filter)&&words.every(w=>[e.id,e.name,e.description,e.filter,e.where,e.seasons,e.moves].flat().join(' ').toLowerCase().includes(w)));}
