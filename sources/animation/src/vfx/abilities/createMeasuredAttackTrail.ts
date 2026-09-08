import * as T from 'three';
import { createSpellRibbon } from '../spells/createSpellGlow';

export const ATTACK_SAMPLES=65;
/** A short measured contact streak, never a prebuilt sweeping ring. */
export function createMeasuredAttackTrail(parent:T.Group) {
  const samples=Array.from({length:ATTACK_SAMPLES},()=>new T.Vector3());
  const points=Array.from({length:18},()=>new T.Vector3());
  const ribbon=createSpellRibbon('#e9ddb6',18,.016);ribbon.mesh.name='MeasuredContactStreak';parent.add(ribbon.mesh);
  const current=new T.Vector3(),previous=new T.Vector3();
  let count=0;
  function at(progress:number,out:T.Vector3) {
    const x=T.MathUtils.clamp(progress,0,1)*(ATTACK_SAMPLES-1),i=Math.min(ATTACK_SAMPLES-2,Math.floor(x));
    return out.lerpVectors(samples[i]!,samples[i+1]!,x-i);
  }
  return {
    reset(){count=0;ribbon.mesh.visible=false;},
    capture(index:number,point:T.Vector3){samples[index]!.copy(point);count=Math.max(count,index+1);},
    sample(active:boolean,time:number,duration:number,color:string) {
      ribbon.mesh.visible=false;if(!active||count!==ATTACK_SAMPLES||time>duration)return;
      at(time/duration,current);at((time-.014)/duration,previous);
      const speed=current.distanceTo(previous)/.014;
      if(speed<1.6)return;
      for(let i=0;i<18;i++)at((time-.065*(1-i/17))/duration,points[i]!);
      ribbon.update(points);ribbon.mesh.visible=true;ribbon.uniforms.uColor.value.set(color);
      ribbon.uniforms.uAlpha.value=Math.min(.5,(speed-1.6)*.12);ribbon.uniforms.uTime.value=time;
    },
    dispose(){parent.remove(ribbon.mesh);ribbon.dispose();},
  };
}
