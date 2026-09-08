import * as T from 'three';
import { createLimbTargetSolver } from './createLimbTargetSolver';
import { BASE_POSES } from './recipes/basePoses';
import { usesBow } from '../abilities/actionChoreography';
import type { AbilityDefinition } from '../abilities/types';

/** Construct before the mixer so rest transforms are the actual bind pose. */
export function createAbilityPose(root: T.Group, actor: T.Group) {
  const bones = new Map<string, { object: T.Object3D; q: T.Quaternion; p: T.Vector3 }>();
  root.traverse(object => bones.set(object.name, { object, q: object.quaternion.clone(), p: object.position.clone() }));
  const bone = (name: string) => bones.get(name)!.object;
  const arms = ['Left', 'Right'].map(side => createLimbTargetSolver(bone(`${side}Arm`), bone(`${side}ForeArm`), bone(`${side}Hand`)));
  const legs = ['Left', 'Right'].map(side => createLimbTargetSolver(bone(`${side}UpLeg`), bone(`${side}Leg`), bone(`${side}Foot`)));
  const footFrames = ['LeftFoot','RightFoot'].map(name => {
    actor.updateMatrixWorld(true);
    return { point: actor.worldToLocal(bone(name).getWorldPosition(new T.Vector3())), q: bone(name).getWorldQuaternion(new T.Quaternion()) };
  });
  const l = new T.Vector3(), r = new T.Vector3(), pole = new T.Vector3(), target = new T.Vector3();
  const q = new T.Quaternion(), parentQ = new T.Quaternion(), euler = new T.Euler();
  const ss = T.MathUtils.smoothstep, rad = T.MathUtils.degToRad;
  function rotate(name: string, x: number, y = 0, z = 0) {
    const value = bones.get(name); if (!value) return;
    value.object.quaternion.copy(value.q).multiply(q.setFromEuler(euler.set(rad(x), rad(y), rad(z))));
  }
  function arm(index: number, goal: T.Vector3, px: number, py: number, pz: number) {
    target.copy(goal); actor.localToWorld(target); pole.set(px, py, pz); actor.localToWorld(pole);
    arms[index]!.solve(target, pole);
  }
  function restoreBody() {
    for (const [name, value] of Object.entries(BASE_POSES.relaxed.rotations)) {
      const rest = bones.get(name); if (!rest) continue;
      rest.object.quaternion.copy(rest.q).multiply(q.setFromEuler(euler.set(value[0], value[1], value[2])));
    }
    bone('Hips').position.copy(bones.get('Hips')!.p).add(target.set(-.012,-.018,0));
  }
  function plantFeet(depth: number, stagger: number) {
    bone('Hips').position.copy(bones.get('Hips')!.p).add(target.set(0,-depth,-.10 * depth));
    actor.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      target.copy(footFrames[i]!.point); target.z += (i ? -1 : 1) * stagger;
      actor.localToWorld(target); pole.set(i ? -.18 : .18,.5,.85); actor.localToWorld(pole);
      legs[i]!.solve(target,pole);
      const foot = bone(i ? 'RightFoot' : 'LeftFoot');
      foot.parent!.getWorldQuaternion(parentQ).invert(); foot.quaternion.copy(parentQ).multiply(footFrames[i]!.q);
    }
  }
  return {
    sample(ability: AbilityDefinition, phase: number) {
      const pose = ability.visual.pose, bow = usesBow(ability);
      if (!pose && !bow) return;
      const up = ss(phase,0,.28), down = 1 - ss(phase,.75,1), weight = up * down;
      if (weight < .0001) return;
      restoreBody();
      if (bow) {
        const release = ss(phase,.5,.56), lift = ability.id === 'volley' ? .24 : 0;
        rotate('Hips',0,-35 * weight); rotate('Spine1',-2,-18 * weight); rotate('Spine2',0,-8 * weight);
        rotate('Head',-lift * 80,52 * weight); plantFeet(.035 * weight,.13 * weight);
        if(ability.id === 'disengage') {
          const tuck=ss(phase,.22,.38)*(1-ss(phase,.62,.78));
          rotate('LeftUpLeg',10+24*tuck);rotate('RightUpLeg',12+18*tuck);
          rotate('LeftLeg',-20-34*tuck);rotate('RightLeg',-24-28*tuck);
        }
        l.set(.06,1.45 + lift,.67 - lift * .45);
        r.set(-.13 - release * .10,1.51 + lift * .35,.13 - release * .12);
        const liftWeight = ss(phase,0,.22) * (1 - ss(phase,.68,1));
        l.lerp(target.set(.25,.84,.08),1-liftWeight); r.lerp(target.set(-.25,.90,.10),1-liftWeight);
        actor.updateMatrixWorld(true);
        arm(0,l,.48,1.32,.35); arm(1,r,-.50,1.53,-.27);
      } else if (pose === 'kneel') {
        rotate('Hips',18 * weight); rotate('Spine',22 * weight); rotate('Spine1',30 * weight); rotate('Head',-6 * weight);
        plantFeet(.49 * weight,.22 * weight);
        l.set(.19,.94-.71*weight,.17+.29*weight); r.set(-.13,.94-.81*weight,.18+.30*weight);
        actor.updateMatrixWorld(true); arm(0,l,.48,.63,.30); arm(1,r,-.43,.65,.36);
      } else if (pose === 'shout') {
        const call = ability.id === 'beast-call';
        rotate('Spine1',-6 * weight); rotate('Neck',-(call ? 18 : 4) * weight); rotate('Head',-(call ? 27 : 8) * weight);
        if (call) {
          l.set(.055,1.67,.08); r.set(-.055,1.67,.08);
          l.lerp(target.set(.25,.88,.08),1-weight); r.lerp(target.set(-.25,.88,.08),1-weight);
        } else { l.set(.35,.95+.40*weight,.25); r.set(-.35,.95+.40*weight,.25); }
        actor.updateMatrixWorld(true); arm(0,l,.40,1.37,.21); arm(1,r,-.40,1.37,.21);
      } else if (pose === 'thrust') {
        const strike = ss(phase,.28,.50) * (1-ss(phase,.65,1));
        rotate('Spine1',14 * strike); rotate('Spine2',0,15 * strike); plantFeet(.10*strike,.21*strike);
        l.set(.27,1.05,.18); r.set(-.15,1.10+.14*strike,.20+.55*strike);
        actor.updateMatrixWorld(true); arm(0,l,.4,1.15,.05); arm(1,r,-.45,1.1,.3);
      } else {
        l.set(.2,1.14,.39); r.set(-.12,1.12+Math.sin(phase*18)*.04,.38);
        actor.updateMatrixWorld(true); arm(0,l,.4,1.1,.2); arm(1,r,-.4,1.1,.2);
      }
    },
  };
}
