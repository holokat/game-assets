import * as THREE from 'three';
import { createSpellParticleLayer } from './createSpellParticleLayer';
import { createSpellGlow } from './createSpellGlow';
import { smoothRange } from './spellVfxUtils';
import type { SpellTextures } from './loadSpellTextures';
import { enableSpellBloom } from './spellBloom';

const ATLAS = { columns: 6, rows: 6, frames: 36 };
const HOT = new THREE.Color('#ffbc6a');
const SOOT = new THREE.Color('#a79888');
const EMBER = new THREE.Color('#ff9b28');

export function createFireballImpact(parent: THREE.Group, textures?: SpellTextures) {
  const root = new THREE.Group();
  root.name = 'FireballImpact';
  parent.add(root);
  const flames = createSpellParticleLayer({ capacity: 7, texture: textures?.fire, atlas: ATLAS, additive: true, hdr: 2.6 });
  flames.mesh.name = 'FireballExplosion';
  const smoke = createSpellParticleLayer({ capacity: 12, texture: textures?.smoke, atlas: ATLAS, additive: false });
  smoke.mesh.name = 'FireballSmoke';
  const sparks = createSpellParticleLayer({ capacity: 72, additive: true, hdr: 4 });
  sparks.mesh.name = 'FireballImpactSparks';
  root.add(flames.mesh, smoke.mesh, sparks.mesh);
  const flash = createSpellGlow('#ffc565', 1.6);
  flash.mesh.name = 'FireballImpactFlash';
  // A brief optical flare surrounds the contact point without a hard floor slice.
  flash.mesh.material.depthTest = false;
  flash.uniforms.uIntensity.value = 2.5;
  root.add(flash.mesh);
  const light = new THREE.PointLight('#ff7c2f', 0, 4.5, 2);
  root.add(light);

  const shockMaterial = enableSpellBloom(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uTime;uniform float uAlpha;
      void main(){vec2 p=vUv*2.-1.;float r=length(p);float a=atan(p.y,p.x);
        float edge=.72+sin(a*7.+uTime*3.)*.012+sin(a*13.-uTime*2.)*.007;
        float ridge=exp(-pow((r-edge)/.022,2.));
        float breakup=.87+.13*sin(a*11.+sin(a*5.)+uTime*8.);
        float alpha=ridge*breakup*uAlpha;
        gl_FragColor=vec4(2.1,.72,.12,alpha);}`,
  }));
  const shock = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shockMaterial);
  shock.name = 'FireballShockwave';
  root.add(shock);
  const scorchMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uAlpha;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      void main(){vec2 p=vUv*2.-1.;float r=length(p);
        float grain=noise(p*5.+3.)*.65+noise(p*13.)*.35;
        float soot=(1.-smoothstep(.3,.95,r+(grain-.5)*.32))*(.7+.3*grain);
        gl_FragColor=vec4(.027,.017,.012,soot*uAlpha);}`,
  });
  const scorch = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), scorchMaterial);
  scorch.name = 'FireballScorch';
  root.add(scorch);
  const position = new THREE.Vector3();
  const surfaceUp = new THREE.Vector3(0, 0, 1);
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const axis = new THREE.Vector3(1, 0, 0);

  return {
    root,
    update(age: number, point: THREE.Vector3, normal: THREE.Vector3, grounded: boolean) {
      root.visible = age >= 0 && age < 2.5;
      if (!root.visible) { light.intensity = 0; return; }
      flames.setSurfaceFade(point, normal, grounded ? .11 : 0);
      smoke.setSurfaceFade(point, normal, grounded ? .16 : 0);
      const fade = 1 - smoothRange(1.55, 2.5, age);
      orientation.setFromUnitVectors(surfaceUp, normal);
      tangent.crossVectors(normal, Math.abs(normal.x) < .9 ? axis : surfaceUp).normalize();
      bitangent.crossVectors(normal, tangent);
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const localAge = age - i * .025;
        if (localAge < 0 || localAge > 1.05) continue;
        const a = i * 2.399963;
        const expansion = 1 - Math.exp(-localAge * 9);
        position.copy(point).addScaledVector(normal, .15 + localAge * (.42 + (i % 3) * .1))
          .addScaledVector(tangent, Math.cos(a) * expansion * .36)
          .addScaledVector(bitangent, Math.sin(a) * expansion * .3);
        flames.setParticle(count++, position, (.42 + expansion * 1.12) * (i === 0 ? 1.15 : .7),
          a * .18, HOT, (1 - smoothRange(.52, 1.05, localAge)) * (i === 0 ? .94 : .5), localAge * 30);
      }
      flames.commit(count);
      count = 0;
      for (let i = 0; i < 12; i++) {
        const localAge = age - .09 - i * .035;
        if (localAge < 0) continue;
        const a = i * 2.399963;
        const radius = .08 + localAge * .22;
        position.copy(point).addScaledVector(normal, .18 + localAge * (.38 + (i % 4) * .045))
          .addScaledVector(tangent, Math.cos(a) * radius)
          .addScaledVector(bitangent, Math.sin(a) * radius);
        smoke.setParticle(count++, position, .45 + localAge * .58, a + localAge * .12, SOOT,
          smoothRange(0, .18, localAge) * fade * .22, Math.min(35, localAge * 24));
      }
      smoke.commit(count);
      count = 0;
      for (let i = 0; i < 72; i++) {
        const life = .42 + (i % 11) * .052;
        if (age > life) continue;
        const a = i * 2.399963;
        const speed = .65 + (i % 9) * .17;
        const lift = .75 + (i % 7) * .28;
        const height = Math.max(.012, .06 + lift * age - 2.8 * age * age);
        position.copy(point).addScaledVector(normal, height)
          .addScaledVector(tangent, Math.cos(a) * speed * age)
          .addScaledVector(bitangent, Math.sin(a) * speed * age);
        sparks.setParticle(count++, position, .010 + (i % 3) * .003, a, EMBER,
          (1 - age / life) ** .7, 0, 2.6 + speed);
      }
      sparks.commit(count);
      flash.mesh.position.copy(point).addScaledVector(normal, .12);
      flash.mesh.scale.setScalar(.35 + Math.min(age, .2) * 3);
      flash.uniforms.uAlpha.value = Math.exp(-age * 16) * .85;
      flash.uniforms.uTime.value = age;
      light.position.copy(point).addScaledVector(normal, .3);
      light.intensity = Math.exp(-age * 6) * 8;
      shock.visible = grounded && age < .48;
      shock.position.copy(point).addScaledVector(normal, .018);
      shock.quaternion.copy(orientation);
      shock.scale.setScalar(.25 + (1 - Math.exp(-age * 9)) * 1.55);
      shockMaterial.uniforms.uAlpha!.value = (1 - smoothRange(.035, .4, age)) * .42;
      shockMaterial.uniforms.uTime!.value = age;
      scorch.visible = grounded;
      scorch.position.copy(point).addScaledVector(normal, .012);
      scorch.quaternion.copy(orientation);
      scorchMaterial.uniforms.uAlpha!.value = smoothRange(0, .12, age) * fade * .65;
    },
    // Geometries and materials are released once by the parent tree disposer.
    dispose() { light.dispose(); },
  };
}
