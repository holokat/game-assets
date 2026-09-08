import * as T from 'three';
import { createFireVolume } from '../spells/createFireVolume';
import { createFireballImpact } from '../spells/createFireballImpact';
import { createSpellParticleLayer } from '../spells/createSpellParticleLayer';
import { createSpellGlow } from '../spells/createSpellGlow';
import type { SpellTextures } from '../spells/loadSpellTextures';
import { disposeTree } from '../spells/spellVfxUtils';

const FLIGHT=.94;
const ENTRY=new T.Vector3(-1.4,5.6,-1.3);
export function sampleMeteorPath(age:number,target:T.Vector3,out:T.Vector3) {
  const p=T.MathUtils.clamp(age/FLIGHT,0,1);
  return out.copy(target).addScaledVector(ENTRY,1-p*p);
}

export function createMeteorEffect(parent:T.Group,textures:SpellTextures) {
  const root=new T.Group();root.name='VolumetricMeteor';parent.add(root);
  const meteor=new T.Group();root.add(meteor);
  // The translucent fire must cover the molten core, not fail its depth test at the core's front face.
  const rock=new T.Mesh(new T.IcosahedronGeometry(.38,2),new T.MeshStandardMaterial({color:'#170b06',roughness:.85,emissive:'#9d2404',emissiveIntensity:.35,depthWrite:false}));
  const volume=createFireVolume();volume.mesh.scale.setScalar(4.2);meteor.add(rock,volume.mesh);
  const glow=createSpellGlow('#ff731c',.86);glow.uniforms.uIntensity.value=2.6;meteor.add(glow.mesh);
  const atlas={columns:6,rows:6,frames:36};
  const flame=createSpellParticleLayer({capacity:48,texture:textures.fire,atlas,additive:true,hdr:2.2});
  const smoke=createSpellParticleLayer({capacity:48,texture:textures.smoke,atlas,additive:false});
  const sparks=createSpellParticleLayer({capacity:96,additive:true,hdr:3});root.add(flame.mesh,smoke.mesh,sparks.mesh);
  const impactRoot=new T.Group();impactRoot.scale.setScalar(1.7);root.add(impactRoot);
  const impact=createFireballImpact(impactRoot,textures);
  const debris=new T.InstancedMesh(new T.IcosahedronGeometry(.045,0),new T.MeshStandardMaterial({color:'#382018',emissive:'#f4560a',emissiveIntensity:.8,roughness:.9}),24);
  debris.frustumCulled=false;root.add(debris);const dummy=new T.Object3D();
  const light=new T.PointLight('#ff711c',0,7,2);root.add(light);
  const p=new T.Vector3(),zero=new T.Vector3(0,.018,0),up=new T.Vector3(0,1,0);
  const hot=new T.Color('#ffdd9f'),soot=new T.Color('#615953'),ember=new T.Color('#ffc57b');
  return {
    sample(active:boolean,time:number,release:number,target:T.Vector3) {
      root.visible=active;if(!active)return;
      const e=time-release,age=e-FLIGHT;
      meteor.visible=e>=0&&age<0;
      sampleMeteorPath(e,target,meteor.position);meteor.rotation.set(e*1.5,e*2,e*.7);
      volume.material.uniforms.uTime!.value=time*2;volume.material.uniforms.uOpacity!.value=1;
      glow.uniforms.uTime.value=time;glow.uniforms.uAlpha.value=.38;
      let fc=0,sc=0,ec=0;
      for(let i=0;i<48;i++) {
        const delay=i*.018,emitted=e-delay;
        if(emitted<0||emitted>FLIGHT||delay<Math.max(0,age))continue;
        sampleMeteorPath(emitted,target,p);
        p.x+=Math.sin(i*8.3)*(.12+delay*.21);p.z+=Math.cos(i*4.1)*(.12+delay*.21);
        flame.setParticle(fc++,p,.80+delay*1.15,i*1.8,hot,Math.max(0,.72-delay*.9),delay*34+i%6);
        p.y+=delay*.45;
        smoke.setParticle(sc++,p,.60+delay*1.7,i*.7,soot,.24*Math.sin(Math.min(1,delay/.85)*Math.PI),delay*25);
      }
      for(let i=0;i<96;i++) {
        const delay=(i%24)*.027,emitted=e-delay;if(emitted<0||emitted>FLIGHT)continue;
        sampleMeteorPath(emitted,target,p);const a=i*2.399;
        p.x+=Math.cos(a)*(.36+delay*.65);p.z+=Math.sin(a)*(.36+delay*.65);p.y-=delay*delay*2;
        sparks.setParticle(ec++,p,.012+i%3*.004,a,ember,Math.max(0,1-delay/.9),0,2.5);
      }
      flame.commit(fc);smoke.commit(sc);sparks.commit(ec);
      impactRoot.position.copy(target);impact.update(age,zero,up,true);
      debris.visible=age>=0&&age<1.6;
      if(debris.visible)for(let i=0;i<24;i++) {
        const angle=i*2.399,speed=.8+(i%5)*.43;
        dummy.position.copy(target);dummy.position.x+=Math.cos(angle)*speed*age;dummy.position.z+=Math.sin(angle)*speed*age;
        dummy.position.y=Math.max(.035,age*(1.4+(i%4)*.55)-4.9*age*age);
        dummy.rotation.set(age*(i%5+2),angle,age*3);dummy.scale.setScalar((1+i%3*.35)*(1-T.MathUtils.smoothstep(age,1.2,1.6)));dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);
      }
      debris.instanceMatrix.needsUpdate=true;light.position.copy(meteor.position);light.intensity=meteor.visible?2.2:0;
    },
    dispose(){impact.dispose();flame.dispose();smoke.dispose();sparks.dispose();glow.dispose();light.dispose();debris.dispose();disposeTree(root);},
  };
}
