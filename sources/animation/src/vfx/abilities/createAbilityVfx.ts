import * as T from 'three';
import type { AbilityDefinition } from '../../abilities/types';
import { abilityTiming } from '../../abilities/abilityTiming';
import { createAbilityParticles } from './createAbilityParticles';
import { createAbilityShapes } from './createAbilityShapes';
import { createAbilityAtmosphere } from './createAbilityAtmosphere';
import { createSignatureSpells } from './createSignatureSpells';
import { createRangerEffects } from './createRangerEffects';
import { createChainLightning } from './createChainLightning';
import { createMeteorEffect } from './createMeteorEffect';
import { createActionAccents } from './createActionAccents';
import { createTrainingTargets } from './createTrainingTargets';
import { createMeasuredAttackTrail } from './createMeasuredAttackTrail';
import { createGroundSummon } from './summoning/createGroundSummon';
import { summonKind } from '../../abilities/summonDefinitions';
import type { SpellTextures } from '../spells/loadSpellTextures';

export interface EffectSockets {
  /** Coordinates in the actor's local frame, never derived from the equipped mesh. */
  hand(out: T.Vector3): void;
  strikeTip?(out: T.Vector3): void;
  nativeElementals?(): boolean;
  target?(ability: AbilityDefinition, out: T.Vector3): void;
}

export function createAbilityVfx(actor: T.Group, sockets: EffectSockets, textures: SpellTextures) {
  const root = new T.Group(); root.name = 'EquipmentIndependentAbilityVfx'; actor.add(root); root.visible = false;
  root.matrixAutoUpdate = false;
  const generic = new T.Group(); root.add(generic);
  const particles = createAbilityParticles(generic), shapes = createAbilityShapes(generic), atmosphere = createAbilityAtmosphere(generic, textures);
  const signatures=createSignatureSpells(root,textures), ranger=createRangerEffects(root), chain=createChainLightning(root);
  const meteor=createMeteorEffect(root,textures), accents=createActionAccents(root), targets=createTrainingTargets(root);
  const melee=createMeasuredAttackTrail(root);
  const summons=createGroundSummon(root,textures);
  const castWorld=new T.Matrix4(), castInverse=new T.Matrix4();
  const origin = new T.Vector3(), releaseOrigin = new T.Vector3(), target = new T.Vector3();
  let current: AbilityDefinition | null = null, seed = 1;
  function readHand(out:T.Vector3) {
    sockets.hand(out); actor.localToWorld(out); out.applyMatrix4(castInverse);
  }
  return {
    begin(ability: AbilityDefinition) {
      current = ability; root.visible = true; signatures.reset(); melee.reset(); summons.reset();
      actor.updateWorldMatrix(true,false); castWorld.copy(actor.matrixWorld);castInverse.copy(castWorld).invert();
      root.matrix.identity();root.matrixWorldNeedsUpdate=true;
      seed = Array.from(ability.id).reduce((value, c) => value + c.charCodeAt(0), 1);
      readHand(origin); releaseOrigin.copy(origin);
    },
    captureRelease() { readHand(releaseOrigin); },
    captureMotionSample(index:number) {
      if(sockets.strikeTip) {sockets.strikeTip(origin);actor.localToWorld(origin);origin.applyMatrix4(castInverse);}
      else readHand(origin);
      melee.capture(index,origin);
    },
    sample(time: number) {
      if (!current) return;
      // Effects and targets stay where the cast began when the actor lunges or teleports.
      actor.updateWorldMatrix(true,false);
      root.matrix.copy(actor.matrixWorld).invert().multiply(castWorld);root.matrixWorldNeedsUpdate=true;
      root.updateWorldMatrix(true,true);
      const timing = abilityTiming(current), family = current.visual.family;
      if (time < timing.release) readHand(origin); else origin.copy(releaseOrigin);
      const distant = ['projectile','volley','lightning','portal','drain','meteor','mark'].includes(family);
      target.set(0, ['projectile','lightning','drain','mark'].includes(family) ? 1.05 : .035, distant ? 3 : family === 'slash' ? .85 : 0);
      if(current.id==='lunge')target.set(0,1.1,2.7);
      if(current.id==='snare')target.set(-.13,.055,.48);
      if(current.id==='volley')target.y=.04;
      if(summonKind(current.id))target.set(.85,0,2.1);
      sockets.target?.(current, target);
      root.visible = time < timing.duration;
      targets.sample(current,time,timing.release);
      const signature=signatures.sample(current.id,time,timing.release,origin);
      ranger.sample(current,time,timing.release,origin,target);
      chain.sample(current.id==='chain-lightning',time,timing.release,origin);
      meteor.sample(current.id==='meteor',time,timing.release,target);
      accents.sample(current,time,timing.release,target,origin);
      const summoning=summons.sample(current.id,time,timing.release,target);
      melee.sample(['slash','impact'].includes(family),time,timing.release+timing.recovery,current.visual.accent);
      generic.visible=!signature && !summoning && current.visual.pose!=='bow'
        && !['snare','beast-call','blink','shadowstep','disengage','chain-lightning','meteor','hunters-mark'].includes(current.id);
      if(generic.visible) {
        particles.update(current.visual, time, timing.release, origin, target, seed);
        shapes.update(current, time, timing.release, origin, target);
        atmosphere.sample(current, time, timing.release, origin, target);
      }
    },
    reset() { current = null; root.visible = false; signatures.reset(); summons.reset(); },
    dispose() { particles.dispose(); shapes.dispose(); atmosphere.dispose(); signatures.dispose();ranger.dispose();chain.dispose();meteor.dispose();accents.dispose();targets.dispose();melee.dispose();summons.dispose();actor.remove(root); },
  };
}
