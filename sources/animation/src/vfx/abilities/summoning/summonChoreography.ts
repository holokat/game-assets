import * as T from 'three';
import { smoothRange as ease } from '../../spells/spellVfxUtils';
import type { SummonFigure } from './createSummonFigure';
import type { SummonKind } from '../../../abilities/summonDefinitions';

/** Seconds after release. Pure time sampling also supports reverse timeline scrubbing. */
export function summonPortalOpening(age: number) {
  return ease(0,.45,age) * (1-ease(3.55,4.35,age));
}

export function createSummonChoreography(figure: SummonFigure, kind: SummonKind) {
  const target = new T.Vector3(), pole = new T.Vector3(), inverse = new T.Quaternion(), orientation = new T.Quaternion();
  const { root, pelvis, chest, head, leftArm, rightArm, leftLeg, rightLeg } = figure;
  const arms = [[leftArm,1,0],[rightArm,-1,.20]] as const;
  function solve(limb: typeof leftArm, x: number, y: number, z: number, px: number, py: number, pz: number, plantedHand = false) {
    root.localToWorld(target.set(x,y,z)); root.localToWorld(pole.set(px,py,pz)); limb.solver.solve(target,pole);
    // Hands are flat on the lip; the feet stay horizontal independently of shin rotation.
    root.getWorldQuaternion(orientation);
    limb.end.parent!.getWorldQuaternion(inverse).invert();
    limb.end.quaternion.copy(inverse).multiply(orientation);
    if(plantedHand) limb.end.rotateX(-Math.PI/2);
  }
  return {
    sample(age: number) {
      const t = age * (kind === 'imp' ? 1.12 : 1);
      const haul = ease(.65,1.85,t), knee = ease(1.65,2.45,t), stand = ease(2.35,3.30,t), step = ease(2.8,3.6,t);
      pelvis.position.set(.032*Math.sin(t*2)*haul*(1-stand), -.98+.28*ease(.2,.7,t)+.68*haul+.22*knee+.57*stand, -.23+.43*haul+.45*knee+.31*step);
      chest.position.z=.18*(1-stand);
      head.position.y=.20+.17*ease(.7,1.4,t);
      chest.rotation.set(.28+.36*haul-.58*stand,.08*Math.sin(t*2)*(1-stand),.035*(1-stand));
      head.rotation.set(-.22-.2*haul+.37*stand,-.18*(1-ease(.8,1.8,t)),0);
      const idle = ease(3.6,4.1,t);
      chest.rotation.x += Math.sin(t*2.3)*.009*idle;
      head.rotation.y += Math.sin(t*.9)*.06*idle;
      for(const limb of figure.limbs) { limb.upper.quaternion.identity(); limb.lower.quaternion.identity(); limb.end.quaternion.identity(); }
      root.updateWorldMatrix(true,true);
      for(const [limb,side,delay] of arms) {
        const plant=ease(.22+delay,.65+delay,t), release=ease(1.70+delay,2.18+delay,t);
        const restY=pelvis.position.y+.05;
        solve(limb,side*(.46-.18*release),T.MathUtils.lerp(-.36+.445*plant,restY,release),T.MathUtils.lerp(.48,pelvis.position.z+.12,release),side*.72,.30,pelvis.position.z-.18,true);
        // Relax the fingers down once the bracing hand is off the ground.
        limb.end.rotateX(release*Math.PI/2);
      }
      const first = ease(1.35,2.05,t), second = ease(2.15,2.82,t);
      solve(leftLeg,.16,-.88+.912*first,.03+.87*first+.17*step,.21,.35,1.0);
      solve(rightLeg,-.16,-1.0+1.032*second,-.12+1.06*second,-.23,.24,.8);
      root.updateWorldMatrix(true,true);
    },
  };
}
