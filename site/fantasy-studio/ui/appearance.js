import * as THREE from 'three';
import {palettes} from './catalog.js';
import {materialRole} from '../models/item-materials.js';

export function prepareAppearance(actor){
 const materialCopies=new Map();
 actor.group.traverse(o=>{
  if(!o.isMesh)return;
  const originals=Array.isArray(o.material)?o.material:[o.material];
  const copies=originals.map(mat=>{
   if(!materialCopies.has(mat)){const copy=mat.userData.itemOwned||mat.userData.loadoutOwned?mat:mat.clone();copy.userData={...mat.userData,originalColor:mat.color.clone(),originalRoughness:mat.roughness};materialCopies.set(mat,copy);}
   return materialCopies.get(mat);
  });
  o.material=Array.isArray(o.material)?copies:copies[0];
 });
 actor.appearance={headwear:true,cape:true,quiver:true,palette:'original',wireframe:false};
}
export function slotFor(object){
 const n=object.name.toLowerCase(),s=object.userData.slot;
 if(s==='headwear'||/helmet|visor|hat |hat$|hood|mask|face wrap/.test(n))return 'headwear';
 if(s==='quiver'||/quiver|arrow|fletch/.test(n))return 'quiver';
 if(s==='cape'||/cape|mantle/.test(n))return 'cape';
 return null;
}
export function updateAppearance(actor,change){
 Object.assign(actor.appearance,change);const a=actor.appearance,palette=palettes[a.palette];
 actor.group.traverse(o=>{
  if(!o.isMesh)return;

  for(const mat of Array.isArray(o.material)?o.material:[o.material]){
   if(!mat.userData.originalColor)continue;
   mat.wireframe=a.wireframe;
   mat.color.copy(mat.userData.originalColor);
   if(a.palette==='original')continue;
   const key=(o.userData.materialKey||mat.name||'').toLowerCase();
   const original=mat.userData.originalColor,hsl={};original.getHSL(hsl);
   const role = o.userData.materialRole;
   if (role && !['metal','leather','cloth'].includes(role)) continue;
   if(/skin|hair|eye|crystal|jewel|visor|ivory|beard|bone|wood|gold/.test(key))continue;
   let target;
   if(role==='metal'||mat.metalness>.5)target=palette.metal;
   else if(role==='leather'||/leather/.test(key))target=palette.leather;
   else if(role==='cloth')target=palette.cloth;
   else if(hsl.s>.17||/cloth|robe|red|blue|green|violet|purple/.test(key))target=palette.cloth;
   if(target){mat.color.set(target);mat.color.multiplyScalar(THREE.MathUtils.clamp(hsl.l*1.45+.45,.65,1.15));}
  }
 });
}
export function availableSlots(actor){const slots=new Set();actor.group.traverse(o=>{if(o.isMesh&&!o.userData.underHeadwear){const s=slotFor(o);if(s)slots.add(s);}});return slots;}

/** Apply equipment color overrides after a palette and before per-item material presets. */
export function tintEquipment(group, colors) {
  group.traverse(object => {
    if (!object.isMesh) return;
    const slot = object.userData.slot;
    const channel = object.userData.colorChannel || object.userData.tintRole;
    const isWeapon = ['weapon', 'offhand'].includes(slot) || ['weapon', 'offhand'].includes(object.userData.part);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      const key = (object.userData.materialKey || material.name || '').toLowerCase();
      let color;
      if (isWeapon) {
        const offhand = slot === 'offhand' || object.userData.part === 'offhand';
        if (['metal', 'wood'].includes(materialRole(object))) color = offhand ? colors.shield : colors.weapon;
      } else if ((object.userData.materialRole && !['metal', 'leather', 'cloth'].includes(object.userData.materialRole)) || ['trim', 'accent', 'emissive', 'crystal'].includes(channel) || /skin|hair|eye|beard|moustache/.test(key)) continue;
      else if (channel === 'metal' || channel === 'leather' || material.metalness > 0.45 || /leather/.test(key)) color = colors.armor;
      else if (channel === 'cloth' || /cloth|robe|red|blue|violet|purple|green/.test(key)) color = colors.cloth;
      if (color) material.color.set(color);
    }
  });
}
