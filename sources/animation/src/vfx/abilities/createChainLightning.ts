import * as T from 'three';
import { createSpellRibbon, createSpellGlow } from '../spells/createSpellGlow';
import { createSpellParticleLayer } from '../spells/createSpellParticleLayer';
import { writeHierarchicalBolt } from '../spells/lightningGeometry';
import { TRAINING_TARGETS } from './targetLayout';

/** Discrete strikes propagate target to target, with secondary branching and restrikes. */
export function createChainLightning(parent:T.Group) {
  const root=new T.Group();root.name='BranchingChainLightning';parent.add(root);
  const strands=Array.from({length:24},(_,i)=>{
    const core=createSpellRibbon('#e4f6ff',33,i%6===0?.015:.005);
    const glow=createSpellRibbon('#408bff',33,i%6===0?.050:.018);
    core.uniforms.uColor.value.multiplyScalar(3);glow.uniforms.uColor.value.multiplyScalar(1.6);
    root.add(glow.mesh,core.mesh);
    return {core,glow,points:Array.from({length:33},()=>new T.Vector3())};
  });
  const flashes=TRAINING_TARGETS.map(()=>{const flash=createSpellGlow('#a3d8ff',.34);root.add(flash.mesh);return flash;});
  const ions=createSpellParticleLayer({capacity:128,additive:true,hdr:3.2});root.add(ions.mesh);
  const light=new T.PointLight('#6ea6ff',0,6,2);root.add(light);
  const start=new T.Vector3(),end=new T.Vector3(),point=new T.Vector3(),white=new T.Color('#d6f1ff');
  function draw(index:number,seed:number,amplitude:number,alpha:number,time:number) {
    const strand=strands[index]!;writeHierarchicalBolt(strand.points,start,end,seed,amplitude,.57);
    strand.core.update(strand.points);strand.glow.update(strand.points);
    strand.core.mesh.visible=strand.glow.mesh.visible=alpha>.003;
    strand.core.uniforms.uAlpha.value=alpha;strand.glow.uniforms.uAlpha.value=alpha*.45;
    strand.core.uniforms.uTime.value=strand.glow.uniforms.uTime.value=time;
  }
  return {
    sample(active:boolean,time:number,release:number,origin:T.Vector3) {
      root.visible=active;if(!active)return;
      for(const strand of strands)strand.core.mesh.visible=strand.glow.mesh.visible=false;
      for(const flash of flashes)flash.mesh.visible=false;
      let count=0,peak=0;const elapsed=time-release;
      for(let link=0;link<4;link++) {
        const age=elapsed-link*.115;
        const pulse=(age>=0&&age<.72)?(1-T.MathUtils.smoothstep(age,.42,.72))*(age<.07?1:.24+.76*Math.pow(Math.max(0,Math.cos((age-.19)*37)),6)):0;
        peak=Math.max(peak,pulse);
        start.copy(link?TRAINING_TARGETS[link-1]!:origin);end.copy(TRAINING_TARGETS[link]!);
        draw(link*6,71+link*121+Math.floor(Math.max(0,age)*14),.22,pulse,time);
        const main=strands[link*6]!;
        for(let fork=1;fork<6;fork++) {
          const attachment=5+fork*4;start.copy(main.points[attachment]!);
          end.copy(start).add(point.set(Math.sin(fork*3.7+link)*.35,(fork%2?1:-1)*.25,Math.cos(fork*2.3)*.27));
          draw(link*6+fork,111+link*31+fork*17+Math.floor(Math.max(0,age)*14),.09,pulse*(.65-fork*.06),time);
        }
        const flash=flashes[link]!;flash.mesh.visible=pulse>0;flash.mesh.position.copy(TRAINING_TARGETS[link]!);
        flash.uniforms.uAlpha.value=pulse*.56;flash.uniforms.uIntensity.value=2.7;
        if(age>=0&&age<.85) for(let i=0;i<32;i++) {
          const flight=age-(i%4)*.012;if(flight<0)continue;const angle=i*2.399;
          point.copy(TRAINING_TARGETS[link]!);
          point.x+=Math.cos(angle)*flight*(.7+i%3*.2);point.z+=Math.sin(angle)*flight*.85;
          point.y+=flight*(.8+i%4*.2)-3.8*flight*flight;
          point.y=Math.max(.03,point.y);
          ions.setParticle(count++,point,.008+i%3*.002,angle,white,Math.max(0,1-flight/.8),0,2.8);
        }
      }
      ions.commit(count);light.position.copy(TRAINING_TARGETS[1]);light.intensity=peak*2.2;
    },
    dispose(){for(const s of strands){s.core.dispose();s.glow.dispose();}for(const f of flashes)f.dispose();ions.dispose();light.dispose();parent.remove(root);},
  };
}
