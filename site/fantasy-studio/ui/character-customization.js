import {createCustomizationState} from './customization-state.js';
import {createCustomizationPanel} from './customization-panel.js';
import {applyCharacterColors} from '../models/character-colors.js';

export function createCharacterCustomization({stage,getActor,getEquipment,rebuild,dirty,root=document}){
 const state=createCustomizationState();
 const panel=createCustomizationPanel({root:root.querySelector('#character-customization'),change:set,
  faceView,
  async reset(){state.restore({}, {persist:true});await rebuildKeepingView();},
 });
 function faceView(){stage.view('face');root.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='face'));dirty();}
 function refresh(){panel.update(state.selected(),getEquipment().head);}
 function apply(){const actor=getActor();if(!actor)return;applyCharacterColors(actor.group,state.selected());actor.customization={...actor.group.userData.customization};}
 async function rebuildKeepingView(){
  await rebuild({preserveCamera:true});refresh();dirty();
 }
 async function set(change){
  state.update(change);refresh();apply();dirty();
 }
 return {set,apply,refresh,faceView,options:()=>state.selected(),snapshot:state.snapshot,
  async restore(value,{persist=false,rebuildActor=true}={}){state.restore(value,{persist});if(rebuildActor)await rebuildKeepingView();else refresh();},
  suspendPersistence:state.suspendPersistence,
  dispose:panel.dispose,
 };
}
