import * as T from 'three';
import type { AbilityDefinition } from '../../abilities/types';
import { actionPhase, sampleActionTravel } from '../../abilities/actionChoreography';
import { createSpellGlow } from '../spells/createSpellGlow';
import { enableSpellBloom } from '../spells/spellBloom';
import { disposeTree } from '../spells/spellVfxUtils';

export function createActionAccents(parent:T.Group) {
  const root=new T.Group();root.name='ActionSpecificAccents';parent.add(root);
  const iconMaterial=enableSpellBloom(new T.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{color:{value:new T.Color()},alpha:{value:0},shield:{value:0}},
    vertexShader:`varying vec2 p;void main(){p=uv*2.-1.;vec4 c=modelViewMatrix*vec4(0,0,0,1);c.xy+=position.xy;gl_Position=projectionMatrix*c;}`,
    fragmentShader:`varying vec2 p;uniform vec3 color;uniform float alpha;uniform float shield;
      void main(){float r=length(p);float ring=1.-smoothstep(.022,.041,abs(r-.59));
        float cross=max((1.-step(.027,abs(p.x)))*step(.42,abs(p.y)),(1.-step(.027,abs(p.y)))*step(.42,abs(p.x)));
        float target=max(ring,max(cross,1.-smoothstep(.035,.055,r)));
        float side=abs(p.x)-(.57-max(0.,-p.y)*.7);float top=p.y-.6;
        float border=1.-smoothstep(.022,.045,min(abs(side),abs(top)));
        float inside=step(side,.025)*step(top,.025)*step(-.85,p.y);
        float crest=inside*(border+.10);
        float a=mix(target,crest,shield)*alpha; if(a<.005)discard;gl_FragColor=vec4(color*1.9,a);}`,
  }));
  const icon=new T.Mesh(new T.PlaneGeometry(.55,.55),iconMaterial);icon.frustumCulled=false;root.add(icon);
  const trap=new T.Group();trap.name='PlacedSnareTrap';root.add(trap);
  const iron=new T.MeshStandardMaterial({color:'#596268',roughness:.5,metalness:.8});
  const ring=new T.Mesh(new T.TorusGeometry(.21,.018,6,32),iron);ring.rotation.x=Math.PI/2;trap.add(ring);
  const plate=new T.Mesh(new T.CylinderGeometry(.09,.09,.015,16),iron);trap.add(plate);
  const toothGeo=new T.ConeGeometry(.024,.055,4);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const tooth=new T.Mesh(toothGeo,iron);tooth.position.set(Math.cos(a)*.20,.025,Math.sin(a)*.20);trap.add(tooth);}
  const orbMaterial=enableSpellBloom(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{time:{value:0},alpha:{value:0}},vertexShader:`varying vec3 p;varying vec3 n;varying vec3 v;void main(){p=position;n=normalMatrix*normal;vec4 mv=modelViewMatrix*vec4(position,1);v=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec3 p;varying vec3 n;varying vec3 v;uniform float time;uniform float alpha;
      void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.);float flow=sin(p.x*17.+p.y*23.-time*19.)*sin(p.z*19.-time*7.);
      gl_FragColor=vec4(mix(vec3(.12,.23,1.8),vec3(.7,1.4,2.2),rim),(rim*.75+pow(max(0.,flow),3.)*.4)*alpha);}`,
  }));
  const orb=new T.Mesh(new T.SphereGeometry(1,36,24),orbMaterial);root.add(orb);
  const flash=createSpellGlow('#8bbaff',1.15);root.add(flash.mesh);
  const rings=Array.from({length:3},()=>{const m=enableSpellBloom(new T.MeshBasicMaterial({color:'#ccdec6',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));
    const r=new T.Mesh(new T.TorusGeometry(1,.006,6,48),m);root.add(r);return r;});
  const position=new T.Vector3();
  return {
    sample(ability:AbilityDefinition,time:number,release:number,target:T.Vector3,origin:T.Vector3) {
      icon.visible=trap.visible=orb.visible=flash.mesh.visible=false;for(const r of rings)r.visible=false;
      const e=time-release,phase=actionPhase(ability,time),fade=Math.max(0,Math.min(1,3-e));
      if(ability.id==='hunters-mark'||ability.id==='mana-shield') {
        icon.visible=e>=0;icon.position.copy(ability.id==='hunters-mark'?target:position.set(0,0,0));
        icon.position.y=ability.id==='hunters-mark'?1.96:2.42;
        iconMaterial.uniforms.shield!.value=ability.id==='mana-shield'?1:0;
        iconMaterial.uniforms.color!.value.set(ability.id==='hunters-mark'?'#ff283c':'#71b9ff');
        iconMaterial.uniforms.alpha!.value=fade*T.MathUtils.smoothstep(e,0,.08);
      }
      if(ability.id==='snare') {
        trap.visible=phase>.14;trap.position.copy(origin);
        if(phase<.5){trap.position.lerp(position.set(-.13,.055,.48),T.MathUtils.smoothstep(phase,.22,.5));}
        else trap.position.set(-.13,.055,.48);
        trap.rotation.set(0,0,0);trap.scale.setScalar(1);
      }
      if(ability.id==='blink'||ability.id==='shadowstep') {
        sampleActionTravel(ability.id,phase,position);position.y=1.0;
        const strength=T.MathUtils.smoothstep(phase,.32,.44)*(1-T.MathUtils.smoothstep(phase,.57,.73));
        orb.visible=strength>.001;orb.position.copy(position);orb.scale.setScalar(.3+strength*.47);
        orbMaterial.uniforms.time!.value=time;orbMaterial.uniforms.alpha!.value=strength;
        flash.mesh.visible=strength>.001;flash.mesh.position.copy(position);flash.uniforms.uAlpha.value=strength*.65;flash.uniforms.uTime.value=time;
      }
      if(ability.id==='beast-call')for(let i=0;i<3;i++) {
        const p=T.MathUtils.clamp((e-i*.17)/.85,0,1),r=rings[i]!;r.visible=p>0&&p<1;
        r.position.set(0,1.7+p*.55,.3+p*.8);r.rotation.x=-Math.PI/4;r.scale.setScalar(.08+p*.55);r.material.opacity=Math.sin(p*Math.PI)*.27;
      }
    },
    dispose(){flash.dispose();disposeTree(root);},
  };
}
