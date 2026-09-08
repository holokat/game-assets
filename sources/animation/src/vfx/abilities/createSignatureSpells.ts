import * as T from 'three';
import { createFireballVfx, FIREBALL_RELEASE } from '../spells/createFireballVfx';
import { createEnergyMissilesVfx } from '../spells/createEnergyMissilesVfx';
import { createLightningVfx } from '../spells/createLightningVfx';
import { createHealingVfx } from '../spells/createHealingVfx';
import type { SpellEffectContext } from '../spells/types';
import type { SpellTextures } from '../spells/loadSpellTextures';

/** The original authored effects, with a single-missile variant, not duplicate recipes. */
export function createSignatureSpells(root: T.Group, textures: SpellTextures) {
  const palm=new T.Vector3();
  const context: SpellEffectContext={actor:root,sockets:new Map(),textures,
    socketPosition(_name,out) { return out.copy(palm); }};
  const fireball=createFireballVfx(context), arrow=createEnergyMissilesVfx(context,{single:true});
  const lightning=createLightningVfx(context), healing=createHealingVfx(context);
  const effects=[fireball,arrow,lightning,healing];
  let lastId='';
  return {
    sample(id:string,time:number,release:number,origin:T.Vector3) {
      for (const effect of effects) effect.root.visible=false;
      palm.copy(origin);
      if(lastId!==id) {fireball.reset();arrow.reset();lightning.reset();lastId=id;}
      const effect=id==='fireball'?fireball:id==='magic-arrow'?arrow:id==='lightning'?lightning:id==='heal'?healing:null;
      if(!effect) return false;
      const sourceRelease=id==='fireball'?FIREBALL_RELEASE:id==='magic-arrow'?.43:id==='lightning'?.74:1.08;
      // Preserve native release/recovery speed, including the complete effect tail.
      const sourceTime=time<release?time/release*sourceRelease:sourceRelease+time-release;
      effect.update(sourceTime); return true;
    },
    reset() {lastId='';fireball.reset();arrow.reset();lightning.reset(); for(const effect of effects) effect.root.visible=false;},
    dispose() {for(const effect of effects) effect.dispose();},
  };
}
