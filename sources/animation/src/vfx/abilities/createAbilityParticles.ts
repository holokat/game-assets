import * as T from 'three';
import type { AbilityVisual } from '../../abilities/types';
import { enableSpellBloom } from '../spells/spellBloom';

const COUNT = 560;
const fract = (x: number) => x - Math.floor(x);
const random = (i: number, seed: number) => fract(Math.sin(i * 127.1 + seed * 311.7) * 43758.5453);

/** A fixed GPU buffer with deterministic samples, including reverse timeline scrubbing. */
export function createAbilityParticles(parent: T.Group) {
  const positions = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const alphas = new Float32Array(COUNT);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('size', new T.BufferAttribute(sizes, 1).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('alpha', new T.BufferAttribute(alphas, 1).setUsage(T.DynamicDrawUsage));
  const material = enableSpellBloom(new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { tint: { value: new T.Color() }, accent: { value: new T.Color() }, time: { value: 0 } },
    vertexShader: `attribute float size; attribute float alpha; varying float a; varying float phase;
      void main(){a=alpha; phase=size*41.; vec4 p=modelViewMatrix*vec4(position,1.);
      gl_PointSize=clamp(size*650./max(.1,-p.z),1.,110.); gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 tint; uniform vec3 accent; uniform float time;
      varying float a; varying float phase;
      void main(){vec2 p=gl_PointCoord-.5; float r=length(p)*2.;
        float grain=.84+.16*sin(p.x*31.+phase)*sin(p.y*29.-time*3.);
        float core=exp(-r*r*30.); float halo=pow(max(0.,1.-r),2.5)*grain;
        gl_FragColor=vec4(mix(tint,accent,core)*1.5,(halo*.6+core*.5)*a);}`,
  }));
  const points = new T.Points(geometry, material);
  const centerOrigin = new T.Vector3();
  points.frustumCulled = false;
  parent.add(points);
  return {
    update(v: AbilityVisual, time: number, release: number, origin: T.Vector3, target: T.Vector3, seed: number) {
      const family = v.family;
      const elapsed = time - release;
      if(elapsed<0 && ['slash','impact'].includes(family)) {
        alphas.fill(0);positions.fill(0);sizes.fill(0);geometry.getAttribute('alpha').needsUpdate=true;return;
      }
      const sustain = ['aura', 'shield', 'heal', 'portal', 'song', 'stealth', 'drain', 'mark', 'trap'].includes(family);
      material.uniforms.tint!.value.set(v.color);
      material.uniforms.accent!.value.set(v.accent);
      material.uniforms.time!.value = time;
      for (let i = 0; i < COUNT; i++) {
        const r = random(i + 1, seed), s = random(i + 17, seed), q = random(i + 61, seed);
        const theta = r * Math.PI * 2;
        let x = 0, y = 0, z = 0, alpha = 0, size = .015 + s * .045;
        if (elapsed < 0) {
          const phase = fract(time * .9 + s);
          const radius = (1 - phase) * (.4 + q * .65) * Math.min(1, time * 3);
          x = origin.x + Math.cos(theta + phase * 5) * radius;
          y = origin.y + Math.sin(theta * 2) * radius;
          z = origin.z + Math.sin(theta + phase * 5) * radius;
          alpha = Math.sin(phase * Math.PI) * Math.min(1, time * 2) * .75;
        } else if (sustain) {
          const phase = fract(elapsed * (.35 + r * .18) + s);
          const fade = Math.min(1, elapsed * 8) * T.MathUtils.clamp(3.2 - elapsed, 0, 1);
          const radius = (.48 + q * .55) * v.scale;
          const angle = theta + elapsed * (family === 'portal' ? 2 : .65) + phase * 3;
          const center = ['portal','mark','trap'].includes(family) ? target : centerOrigin;
          x = center.x + Math.cos(angle) * radius; z = center.z + Math.sin(angle) * radius;
          y = family === 'trap' ? .05 + phase * .25 : phase * 2.5;
          alpha = Math.sin(phase * Math.PI) * fade;
          if (family === 'drain') {
            const f = fract(elapsed * .7 + s);
            x = T.MathUtils.lerp(target.x, origin.x, f) + Math.cos(theta + f * 16) * .12;
            y = T.MathUtils.lerp(target.y, origin.y, f) + Math.sin(f * Math.PI) * .6;
            z = T.MathUtils.lerp(target.z, origin.z, f);
          }
          if (v.style === 'wisps') size *= 3;
        } else {
          const age = elapsed - q * .2 - (['projectile','volley','meteor'].includes(family) ? .42 : 0);
          const life = .5 + s * 1.2;
          const speed = (.6 + q * 2.8) * v.scale;
          const vertical = family === 'nova' ? .12 + s * .6 : .5 + s * 2.6;
          x = target.x + Math.cos(theta) * speed * age;
          z = target.z + Math.sin(theta) * speed * age;
          y = Math.max(.025, target.y + vertical * age - age * age * 1.8);
          alpha = age > 0 ? Math.pow(Math.max(0, 1 - age / life), 1.5) : 0;
          if (v.style === 'embers') size *= 1.6;
          if (v.style === 'wisps') size *= 3;
        }
        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
        sizes[i] = size; alphas[i] = alpha;
      }
      for (const attr of Object.values(geometry.attributes)) attr.needsUpdate = true;
    },
    dispose() { parent.remove(points); geometry.dispose(); material.dispose(); },
  };
}
