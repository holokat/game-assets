import {skinToneById,hairColorById,defaultCharacterColors} from '../data/character-colors.js';

export const customizationStorageKey='kaldera-character-appearance-v1';
export function normalizeCustomization(value={}){
 return {
  hairColor:hairColorById.has(value?.hairColor)?value.hairColor:defaultCharacterColors.hairColor,
  skinTone:skinToneById.has(value?.skinTone)?value.skinTone:defaultCharacterColors.skinTone,
 };
}
export function createCustomizationState(storage=globalThis.localStorage){
 let saved;try{saved=JSON.parse(storage.getItem(customizationStorageKey));}catch{}
 let state=normalizeCustomization(saved),suspended=false;
 const save=()=>{if(suspended)return;try{storage.setItem(customizationStorageKey,JSON.stringify(state));}catch{}};
 return {
  snapshot:()=>normalizeCustomization(state),
  selected(){return {facePreset:'default',hairStyle:'default',hairColor:state.hairColor,skinTone:state.skinTone};},
  update(change){state=normalizeCustomization({...state,...change});save();return this.selected();},
  restore(value,{persist=false}={}){state=normalizeCustomization(value);if(persist)save();},
  suspendPersistence(value){suspended=value;},
 };
}
