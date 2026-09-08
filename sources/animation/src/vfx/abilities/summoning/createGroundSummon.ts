import * as T from 'three';
import { createSummonFigure } from './createSummonFigure';
import { createSummonChoreography, summonPortalOpening } from './summonChoreography';
import { summonKind } from '../../../abilities/summonDefinitions';
import { createSpellParticleLayer } from '../../spells/createSpellParticleLayer';
import { enableSpellBloom } from '../../spells/spellBloom';
import { smoothRange as ease } from '../../spells/spellVfxUtils';
import type { SpellTextures } from '../../spells/loadSpellTextures';

/** Ground-aligned summon aperture, physically braced emergence, and pooled surface wisps. */
export function createGroundSummon(parent: T.Group, textures: SpellTextures) {
  const root = new T.Group(); root.name = 'GroundSummoning'; root.visible = false; parent.add(root);
  const skeleton=createSummonFigure('skeleton'), imp=createSummonFigure('imp');
  const skeletonMotion=createSummonChoreography(skeleton,'skeleton'), impMotion=createSummonChoreography(imp,'imp');
  root.add(skeleton.root,imp.root); imp.root.scale.setScalar(.68);
  const aperture = new T.Group(); aperture.name='HorizontalSummonAperture'; root.add(aperture);
  const plane = new T.PlaneGeometry(2,2);
  const uniforms = { time: {value:0}, strength: {value:0}, tint: {value:new T.Color()} };
  const vertexShader=`varying vec2 p; void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}`;
  const voidMaterial=new T.ShaderMaterial({uniforms,vertexShader,depthWrite:false,
    fragmentShader:`varying vec2 p;uniform float time;uniform vec3 tint;${noise}
      void main(){float r=length(p);float edge=.79+noise(p*13.)*.025;if(r>edge)discard;
        float a=atan(p.y,p.x),swirl=noise(vec2(a*3.+time*.22,r*12.-time*.65));
        vec3 color=vec3(.003,.004,.003)+tint*pow(swirl,4.)*.075*smoothstep(.2,.8,r);
        gl_FragColor=vec4(color,1.);}`});
  const voidDisc=new T.Mesh(plane,voidMaterial); voidDisc.name='SummonVoid'; voidDisc.rotation.x=-Math.PI/2; voidDisc.position.y=.019; aperture.add(voidDisc);
  const rimMaterial=enableSpellBloom(new T.ShaderMaterial({uniforms,vertexShader,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    fragmentShader:`varying vec2 p;uniform float time;uniform float strength;uniform vec3 tint;${noise}
      void main(){float r=length(p),a=atan(p.y,p.x);float n=noise(vec2(a*8.,time*.8))*2.-1.;
        float edge=.80+n*.022;float rim=exp(-abs(r-edge)*135.);
        float tendrils=pow(noise(vec2(a*22.+time*.7,r*28.-time*3.)),3.)*exp(-abs(r-edge)*18.);
        float runes=pow(max(0.,sin(a*24.)),12.)*exp(-abs(r-.94)*120.);
        float alpha=(rim*.86+tendrils*.6+runes*.34)*strength;
        gl_FragColor=vec4(tint*(1.4+rim*1.1),alpha);}` }));
  const rim=new T.Mesh(plane,rimMaterial); rim.name='GroundPortalRim'; rim.rotation.x=-Math.PI/2; rim.position.y=.023; aperture.add(rim);
  const smoke=createSpellParticleLayer({capacity:36,texture:textures.smoke,atlas:{columns:6,rows:6,frames:36},additive:false});
  const embers=createSpellParticleLayer({capacity:40,additive:true,hdr:2.2});
  root.add(smoke.mesh,embers.mesh);
  const ground=new T.Vector3(0,.02,0),up=new T.Vector3(0,1,0);
  smoke.setSurfaceFade(ground,up,.10); embers.setSurfaceFade(ground,up,.06);
  const dirt=new T.InstancedMesh(new T.IcosahedronGeometry(.027,0),new T.MeshStandardMaterial({color:'#443b2b',roughness:1}),24);
  dirt.name='DisplacedGraveEarth'; dirt.instanceMatrix.setUsage(T.DynamicDrawUsage); dirt.frustumCulled=false; root.add(dirt);
  const glow=new T.PointLight('#b2d67c',0,3,2);glow.position.y=.23;root.add(glow);
  const position=new T.Vector3(), tint=new T.Color(), smokeTint=new T.Color(), gray=new T.Color('#8d9387'), dummy=new T.Object3D();

  return {
    root,
    sample(id: string, time: number, release: number, target: T.Vector3) {
      const kind=summonKind(id), age=time-release;
      root.visible=kind!==null&&age>=0;
      if(!kind) return false;
      root.position.set(target.x,0,target.z);
      skeleton.root.visible=kind==='skeleton'; imp.root.visible=kind==='imp';
      const opening=summonPortalOpening(age), size=kind==='imp'?.68:1;
      aperture.visible=opening>.001; aperture.scale.set(.79*size*opening,1,.91*size*opening);
      // The surface normal is always +Y. Only planar size changes, never its pitch.
      tint.set(kind==='imp'?'#f88442':'#b2d67c'); smokeTint.copy(tint).lerp(gray,.77);
      uniforms.time.value=age;uniforms.strength.value=opening;uniforms.tint.value.copy(tint);
      glow.color.copy(tint);glow.intensity=opening*(1.9+.25*Math.sin(age*9));glow.distance=3*size;
      (kind==='skeleton'?skeletonMotion:impMotion).sample(age);
      // Wisps cling to the rim and rise around the emerging body, without covering its silhouette.
      for(let i=0;i<36;i++) {
        const life=((Math.max(0,age)*.60+i*.071)%1),a=i*2.39996+life*.32;
        position.set(Math.cos(a)*(.59+life*.18)*size,(.04+life*.39)*size,Math.sin(a)*(.69+life*.18)*size);
        smoke.setParticle(i,position,(.18+life*.36)*size,a,smokeTint,Math.sin(life*Math.PI)*opening*.31,Math.floor(life*35));
      }
      smoke.commit(root.visible?36:0);
      for(let i=0;i<40;i++) {
        const life=(Math.max(0,age)*.8+i*.037)%1,a=i*2.39996;
        position.set(Math.cos(a)*(.57+life*.11)*size,(.025+life*(kind==='imp'?.74:.25))*size,Math.sin(a)*(.67+life*.14)*size);
        embers.setParticle(i,position,(kind==='imp'?.013:.009)*size,a,tint,Math.sin(life*Math.PI)*opening,.0,kind==='imp'?2.2:1.4);
      }
      embers.commit(root.visible?40:0);
      dirt.visible=kind==='skeleton'&&age>.35&&age<2.6;
      for(let i=0;i<24;i++) {
        const a=i*2.39996,t=Math.max(0,age-.35-(i%3)*.36),speed=.3+(i%5)*.05;
        const flight=Math.min(t,.48),radius=.64+flight*.36;
        dummy.position.set(Math.cos(a)*radius,.026+Math.max(0,flight*speed-flight*flight*.9),Math.sin(a)*radius*1.12);
        dummy.rotation.set(flight*5+i,flight*3,i); dummy.scale.setScalar((.6+(i%3)*.3)*(1-ease(1.7,2.6,age)));
        dummy.updateMatrix();dirt.setMatrixAt(i,dummy.matrix);
      }
      dirt.instanceMatrix.needsUpdate=true;
      return true;
    },
    reset() { root.visible=false;smoke.commit(0);embers.commit(0); },
    dispose() {
      skeleton.dispose();imp.dispose();smoke.dispose();embers.dispose();
      plane.dispose();voidMaterial.dispose();rimMaterial.dispose();dirt.geometry.dispose();dirt.material.dispose();dirt.dispose();glow.dispose();parent.remove(root);
    },
  };
}
