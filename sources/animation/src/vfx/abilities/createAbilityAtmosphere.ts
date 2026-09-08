import * as T from 'three';
import type { AbilityDefinition } from '../../abilities/types';
import { createSpellParticleLayer } from '../spells/createSpellParticleLayer';
import type { SpellTextures } from '../spells/loadSpellTextures';
import { enableSpellBloom } from '../spells/spellBloom';

const clamp = (n: number) => T.MathUtils.clamp(n, 0, 1);

/** Flipbook smoke, cold mist, combustion and dissolving floor residues. */
export function createAbilityAtmosphere(root: T.Group, textures: SpellTextures) {
  const atlas = { columns: 6, rows: 6, frames: 36 };
  const smoke = createSpellParticleLayer({ capacity: 28, texture: textures.smoke, atlas, additive: false });
  const energy = createSpellParticleLayer({ capacity: 18, texture: textures.fire, atlas, additive: true, hdr: 2.5 });
  root.add(smoke.mesh, energy.mesh);
  const ground = new T.Vector3(0, .02, 0), up = new T.Vector3(0, 1, 0);
  smoke.setSurfaceFade(ground, up, .14); energy.setSurfaceFade(ground, up, .12);
  const position = new T.Vector3(), tint = new T.Color(), mistTint = new T.Color(), gray = new T.Color('#85958d');
  const residueMaterial = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: { tint: { value: new T.Color() }, opacity: { value: 0 }, time: { value: 0 }, mode: { value: 0 } },
    vertexShader: `varying vec2 uvp; void main(){uvp=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 uvp; uniform vec3 tint; uniform float opacity; uniform float time; uniform float mode;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){float r=length(uvp), a=atan(uvp.y,uvp.x);float grain=noise(uvp*12.)*.5+noise(uvp*39.)*.3+noise(uvp*83.)*.2;
        float edge=1.-smoothstep(.6,.98,r+(grain-.5)*.2);float cracks=pow(max(0.,1.-abs(sin(a*17.+sin(r*21.)*.7))),22.);
        float frost=(.38+grain*.7+cracks*.22)*edge;
        float voidCore=(1.-smoothstep(.12,.78,r))*(.65+grain*.35);
        float alpha=mix(frost,voidCore,step(1.5,mode))*opacity;
        gl_FragColor=vec4(tint*(.7+grain*.5),alpha);}`,
  });
  const residue = new T.Mesh(new T.PlaneGeometry(2, 2), residueMaterial); residue.rotation.x = -Math.PI / 2; root.add(residue);
  const coronaMaterial = enableSpellBloom(new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    uniforms: { tint: { value: new T.Color() }, time: { value: 0 }, opacity: { value: 0 } },
    vertexShader: `varying vec2 u;void main(){u=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 u;uniform vec3 tint;uniform float time;uniform float opacity;
      void main(){float a=atan(u.y,u.x), r=length(u);float edge=.67+sin(a*9.+time*2.)*.035+sin(a*23.-time)*.014;
        float rim=exp(-pow((r-edge)/.018,2.));float filaments=pow(.5+.5*sin(a*42.+r*19.-time*3.),6.);
        float corona=exp(-abs(r-edge)*19.)*filaments;
        gl_FragColor=vec4(tint*2.,(rim*.8+corona*.3)*opacity);}`,
  }));
  const corona = new T.Mesh(new T.PlaneGeometry(2, 2), coronaMaterial); root.add(corona);
  return {
    sample(ability: AbilityDefinition, time: number, release: number, origin: T.Vector3, target: T.Vector3) {
      const v = ability.visual, family = v.family, elapsed = time - release, s = v.scale;
      tint.set(v.color); mistTint.copy(tint).lerp(gray, .6);
      residue.visible = false; corona.visible = false;
      if (elapsed < 0) { smoke.commit(0); energy.commit(0); return; }
      const age = elapsed - (['projectile','meteor','volley'].includes(family) ? .42 : 0);
      const sustained = ['portal','stealth','heal','aura','shield'].includes(family);
      const cold = family === 'nova' && v.style === 'shards';
      const hot = v.style === 'embers';
      const impact = ['impact','meteor','nova','projectile','volley','stealth','portal','heal','aura','shield'].includes(family);
      const fade = clamp(2.7 - Math.max(0, age));
      let smokeCount = 0, energyCount = 0;
      if (impact && age >= 0) {
        for (let i = 0; i < 28; i++) {
          const a = i * 2.39996;
          const t = sustained ? (age * .7 + i / 28) % 1.5 : age - i * .012;
          if (t < 0) continue;
          const radius = (sustained ? .45 + Math.sin(t * 2) * .15 : t * (1 + (i % 5) * .18)) * s;
          const centered = ['stealth','heal','aura','shield'].includes(family);
          position.set((centered ? 0 : target.x) + Math.cos(a) * radius,
            cold ? .12 + t * .12 : .12 + t * (.45 + (i % 4) * .12),
            (centered ? 0 : target.z) + Math.sin(a) * radius);
          smoke.setParticle(smokeCount++, position, (.36 + t * .7) * s, a + t * .2,
            cold ? tint : mistTint, Math.sin(clamp(t / 1.6) * Math.PI) * fade * (cold ? .35 : .22), Math.min(35, t * 22));
          if (i < 18 && hot) {
            energy.setParticle(energyCount++, position, (.25 + t * .7) * s, a, tint, clamp(1 - t / 1.1) * fade * .48, Math.min(35, t * 32));
          }
        }
      }
      // A readable hot projectile with a textured wake, independent of a bow or wand.
      if (['projectile','meteor'].includes(family) && elapsed < .6 && hot) {
        energyCount = 0;
        for (let i = 0; i < 12; i++) {
          const p = clamp((elapsed - i * .012) / .42);
          if (p <= 0 || p >= 1) continue;
          position.lerpVectors(origin, target, p);
          if (family === 'meteor') position.y += (1 - p) * 5;
          energy.setParticle(energyCount++, position, (.32 - i * .015) * s, i * .8, tint, .8 - i * .045, Math.min(35, elapsed * 35 + i));
        }
      }
      smoke.commit(smokeCount); energy.commit(energyCount);
      if ((cold || hot || family === 'impact' || family === 'portal' || family === 'trap') && age >= 0) {
        residue.visible = true; residue.position.copy(target); residue.position.y = .023;
        residue.scale.setScalar((.35 + Math.min(1, age * 3) * .7) * s);
        residueMaterial.uniforms.tint!.value.set(cold ? '#b5e1e8' : hot ? '#100b08' : family === 'portal' ? '#09030f' : '#152018');
        residueMaterial.uniforms.opacity!.value = clamp(age * 8) * fade * (cold ? .85 : .72);
        residueMaterial.uniforms.time!.value = time; residueMaterial.uniforms.mode!.value = family === 'portal' ? 2 : 0;
      }
      if (family === 'portal' || family === 'nova' || family === 'heal' || family === 'meteor') {
        corona.visible = age >= 0;
        coronaMaterial.uniforms.tint!.value.copy(tint); coronaMaterial.uniforms.opacity!.value = clamp(age * 8) * fade;
        coronaMaterial.uniforms.time!.value = time;
        corona.position.copy(target); corona.rotation.set(-Math.PI / 2, 0, 0); corona.position.y = .04;
        corona.scale.setScalar(s * (1 + Math.min(1, age) * .5));
        if (family === 'portal') { corona.position.y = s * .78; corona.rotation.set(0,0,0); corona.scale.set(s * 1.12, s * 1.4, 1); }
        if (family === 'heal') { corona.position.set(0, .04, 0); }
      }
    },
    dispose() { root.remove(smoke.mesh, energy.mesh, residue, corona); smoke.dispose(); energy.dispose(); residue.geometry.dispose(); residueMaterial.dispose(); corona.geometry.dispose(); coronaMaterial.dispose(); },
  };
}
