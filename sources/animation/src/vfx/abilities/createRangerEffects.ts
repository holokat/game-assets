import * as T from 'three';
import { createArrow } from '../../character/createArrowGeometry';
import { createSpellRibbon } from '../spells/createSpellGlow';
import { createSpellParticleLayer } from '../spells/createSpellParticleLayer';
import { disposeTree } from '../spells/spellVfxUtils';
import type { AbilityDefinition } from '../../abilities/types';

export function sampleArrowFlight(id:string,index:number,age:number,origin:T.Vector3,target:T.Vector3,out:T.Vector3) {
  const volley=id==='volley';
  const flight=volley?1.16:.38;
  const progress=T.MathUtils.clamp((age-index*(volley?.022:.12))/flight,0, id==='piercing-arrow'?1.65:1);
  out.lerpVectors(origin,target,progress);
  if(volley) {
    out.x+=Math.sin(index*7.1)*.8*progress;
    out.z+=Math.cos(index*9.3)*.65*progress;
    out.y+=4*3.2*progress*(1-progress);
  }
  return progress;
}

/** Physical arrows retain shafts and fletching. Their trails are short and velocity-aligned. */
export function createRangerEffects(parent:T.Group) {
  const root=new T.Group();root.name='RangerPhysicalProjectiles';parent.add(root);
  const template=createArrow();
  const arrowTipOffset=new T.Box3().setFromObject(template).max.z;
  const arrows=Array.from({length:24},(_,i)=>{const arrow=i?template.clone():template;root.add(arrow);return arrow;});
  const trails=arrows.map(()=>{const ribbon=createSpellRibbon('#d8cba0',12,.008);root.add(ribbon.mesh);return {ribbon,points:Array.from({length:12},()=>new T.Vector3())};});
  const sparks=createSpellParticleLayer({capacity:128,additive:true,hdr:2.2});root.add(sparks.mesh);
  const direction=new T.Vector3(),ahead=new T.Vector3(),position=new T.Vector3(),end=new T.Vector3();
  const forward=new T.Vector3(0,0,1),shotAxis=new T.Vector3(),color=new T.Color();
  function sampleRoot(id:string,index:number,age:number,origin:T.Vector3,target:T.Vector3,out:T.Vector3) {
    const progress=sampleArrowFlight(id,index,age,origin,target,out),volley=id==='volley';
    // A bounded tangent gives launch and landed poses the same orientation
    // regardless of the previous cast or editor seek.
    const delay=index*(volley?.022:.12),flight=(volley?1.16:.38)*(id==='piercing-arrow'?1.65:1);
    const tangentTime=T.MathUtils.clamp(age,delay,delay+flight);
    sampleArrowFlight(id,index,tangentTime-.008,origin,target,ahead);
    sampleArrowFlight(id,index,tangentTime+.008,origin,target,end);
    direction.subVectors(end,ahead).normalize();
    // The authored path describes a root near the point. Keep the physical
    // point on that same path when a volley pitches the shaft upward.
    out.addScaledVector(shotAxis,arrowTipOffset).addScaledVector(direction,-arrowTipOffset);
    return progress;
  }
  return {
    sample(ability:AbilityDefinition,time:number,release:number,origin:T.Vector3,target:T.Vector3) {
      root.visible=ability.visual.pose==='bow';if(!root.visible)return;
      const e=time-release,count=Math.min(24,ability.visual.count),volley=ability.id==='volley';
      shotAxis.subVectors(target,origin).normalize();color.set(ability.visual.color);let particleCount=0;
      for(let i=0;i<24;i++) {
        const arrow=arrows[i]!,trail=trails[i]!;
        const p=sampleRoot(ability.id,i,e,origin,target,position);
        arrow.visible=i<count&&e+1e-9>=i*(volley?.022:.12)&&e<2.5;
        if(ability.id==='piercing-arrow'&&p>=1.65)arrow.visible=false;
        trail.ribbon.mesh.visible=arrow.visible&&p>0&&p<(ability.id==='piercing-arrow'?1.65:1);
        if(!arrow.visible)continue;
        arrow.position.copy(position);
        if(direction.lengthSq()>1e-9)arrow.quaternion.setFromUnitVectors(forward,direction.normalize());
        for(let j=0;j<12;j++)sampleRoot(ability.id,i,e-.055*(1-j/11),origin,target,trail.points[j]!);
        trail.ribbon.update(trail.points);trail.ribbon.uniforms.uAlpha.value=ability.id==='piercing-arrow'?.85:.26;
        trail.ribbon.uniforms.uWidth.value=ability.id==='piercing-arrow'?.019:.008;
        trail.ribbon.uniforms.uTime.value=time;
        const impactAge=e-i*(volley?.022:.12)-(volley?1.16:.38);
        if(impactAge>=0&&impactAge<.4) {
          sampleArrowFlight(ability.id,i,10,origin,target,end);
          if(ability.id==='piercing-arrow')end.copy(target);
          for(let k=0;k<5;k++) {
            const a=k*2.4+i;position.copy(end);
            position.x+=Math.cos(a)*impactAge;position.y+=Math.sin(a)*impactAge*.7;position.z-=impactAge*.8;
            sparks.setParticle(particleCount++,position,.009,a,color,1-impactAge/.4,0,2.2);
          }
        }
      }
      sparks.commit(particleCount);
    },
    dispose(){for(const t of trails)t.ribbon.dispose();sparks.dispose();disposeTree(root);},
  };
}
