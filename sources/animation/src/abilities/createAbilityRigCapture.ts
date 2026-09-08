import * as T from 'three';
import type { MoveId } from '../animation/types';
import type { AbilityDefinition } from './types';
import { abilityTiming } from './abilityTiming';
import { actionPhase } from './actionChoreography';
import { ATTACK_SAMPLES } from '../vfx/abilities/createMeasuredAttackTrail';

interface Options {
  actor: T.Group;
  character: T.Group;
  clips: ReadonlyMap<MoveId, T.AnimationClip>;
  sample(move: MoveId, motionPhase: number, phase: number): void;
  release(): void;
  motion(index: number): void;
}

/** Bake active-rig anchors without seeking or restarting the live ability player. */
export function createAbilityRigCapture(options: Options) {
  const mixer = new T.AnimationMixer(options.character);
  const nodes: T.Object3D[] = [options.actor];
  // Capture only the canonical objects present at construction. A later fitted
  // skeleton or companion must never become another animation binding target.
  options.character.traverse(node => nodes.push(node));
  return {
    capture(ability: AbilityDefinition, melee: boolean): void {
      const clip = options.clips.get(ability.visual.motion);
      if (!clip) throw new Error(`Missing motion clip for ${ability.visual.motion}.`);
      const saved = nodes.map(node => ({ node, position: node.position.clone(), quaternion: node.quaternion.clone(),
        scale: node.scale.clone(), visible: node.visible }));
      const restore = () => {
        for (const pose of saved) {
          pose.node.position.copy(pose.position); pose.node.quaternion.copy(pose.quaternion);
          pose.node.scale.copy(pose.scale); pose.node.visible = pose.visible;
        }
        options.actor.updateMatrixWorld(true);
      };
      const timing = abilityTiming(ability);
      const action = mixer.clipAction(clip).setLoop(T.LoopOnce, 1);
      action.clampWhenFinished = true;
      function sample(time: number) {
        action.stop(); restore();
        const phase = time < timing.release ? time / timing.release * timing.marker
          : Math.min(1, timing.marker + (time - timing.release) / timing.recovery * (1 - timing.marker));
        action.reset().play(); action.time = T.MathUtils.clamp(phase, 0, .999999) * clip!.duration;
        mixer.update(0);
        options.sample(ability.visual.motion, phase, actionPhase(ability, time));
        options.actor.updateMatrixWorld(true);
      }
      try {
        if (melee) for (let index = 0; index < ATTACK_SAMPLES; index++) {
          sample(index / (ATTACK_SAMPLES - 1) * (timing.release + timing.recovery));
          options.motion(index);
        }
        sample(timing.release); options.release();
      } finally { action.stop(); restore(); }
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(options.character); },
  };
}
