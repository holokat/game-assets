import {weapons,shields} from '../models/weapons.js';

export const abilityEquipmentModes=Object.freeze([
 ['character','Character equipment'],['action','Match action'],['custom','Custom equipment'],
]);
const modes=new Set(abilityEquipmentModes.map(([id])=>id));
const weaponIds=new Set(weapons.map(([id])=>id)),shieldIds=new Set(shields.map(([id])=>id));

/** Keep custom choices when changing modes; booleans retain the original API. */
export function normalizeAbilityEquipment(value,previous={mode:'character',weapon:'default',shield:'default'}){
 const change=typeof value==='boolean'?{mode:value?'action':'character'}:typeof value==='string'?{mode:value}:value||{};
 const next={mode:change.mode??previous.mode,weapon:change.weapon??previous.weapon,shield:change.shield??previous.shield};
 if(!modes.has(next.mode))throw new RangeError('Unknown preview equipment mode: '+next.mode);
 if(!weaponIds.has(next.weapon))throw new RangeError('Unknown preview weapon: '+next.weapon);
 if(!shieldIds.has(next.shield))throw new RangeError('Unknown preview offhand: '+next.shield);
 return next;
}
