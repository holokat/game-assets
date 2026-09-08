import * as T from 'three';
import { TRAINING_TARGETS } from './targetLayout';
import type { AbilityDefinition } from '../../abilities/types';
import { disposeTree } from '../spells/spellVfxUtils';

export function createTrainingTargets(parent:T.Group) {
  const root=new T.Group();root.name='AbilityTrainingTargets';parent.add(root);
  const wood=new T.MeshStandardMaterial({color:'#6b5946',roughness:.87});
  const metal=new T.MeshStandardMaterial({color:'#414b51',roughness:.6,metalness:.6});
  const torsoGeo=new T.CylinderGeometry(.19,.25,.64,14),headGeo=new T.SphereGeometry(.14,16,12);
  const postGeo=new T.CylinderGeometry(.045,.07,.70,10),armGeo=new T.CylinderGeometry(.075,.075,.85,10);
  const targets=TRAINING_TARGETS.map((position,index)=>{
    const target=new T.Group();target.position.copy(position);target.name=`TrainingTarget${index+1}`;
    const torso=new T.Mesh(torsoGeo,wood),head=new T.Mesh(headGeo,wood),post=new T.Mesh(postGeo,metal),arm=new T.Mesh(armGeo,wood);
    head.position.y=.48;post.position.y=-.68;arm.rotation.z=Math.PI/2;arm.position.y=.20;
    target.add(torso,head,post,arm);root.add(target);return target;
  });
  return {
    sample(ability:AbilityDefinition,time:number,release:number) {
      root.visible=['projectile','volley','lightning','mark','meteor','slash','impact'].includes(ability.visual.family)&&!['jump','lightning','lunge'].includes(ability.id);
      for(let i=0;i<targets.length;i++) {
        const target=targets[i]!;target.visible=i===0||ability.id==='chain-lightning';
        const age=time-release-(ability.id==='chain-lightning'?i*.11:.42);
        target.rotation.x=age<0?0:Math.sin(age*22)*Math.exp(-age*9)*.08;
      }
    },
    dispose() {disposeTree(root);},
  };
}
