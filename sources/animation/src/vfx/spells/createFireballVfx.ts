import * as THREE from 'three';
import { SPELL_MOTIONS } from '../../animation/spellMotion';
import { createSpellGlow, createSpellRibbon } from './createSpellGlow';
import { createFireVolume } from './createFireVolume';
import { createFireballImpact } from './createFireballImpact';
import { createSpellParticleLayer } from './createSpellParticleLayer';
import { disposeTree, smoothRange } from './spellVfxUtils';
import type { SpellEffect, SpellEffectContext } from './types';

export const FIREBALL_RELEASE = SPELL_MOTIONS.fireball.release[0]!;
export const FIREBALL_IMPACT = FIREBALL_RELEASE + .29;
export const FIREBALL_END = FIREBALL_IMPACT + 2.5;
const TRAIL_POINTS = 32;
const FIRE_COLOR = new THREE.Color('#ffbc5c');

export interface FireballEffect extends SpellEffect {
  reset(): void;
  samplePresentation(worldPosition: THREE.Vector3): number;
}

export function createFireballVfx(context: SpellEffectContext): FireballEffect {
  const root = new THREE.Group();
  root.name = 'FireballVfx';
  root.visible = false;
  context.actor.add(root);
  const orb = new THREE.Group();
  orb.name = 'FireballProjectile';
  root.add(orb);
  const { mesh: volume, material: volumeMaterial } = createFireVolume();
  volume.name = 'FireballEnvelope';
  const halo = createSpellGlow('#ff6a16', .34);
  halo.mesh.name = 'FireballHalo';
  halo.uniforms.uIntensity.value = 2.6;
  const light = new THREE.PointLight('#ff842e', 0, 3.1, 2);
  orb.add(halo.mesh, volume, light);
  const tendrils = Array.from({ length: 3 }, (_, index) => {
    const ribbon = createSpellRibbon(index === 0 ? '#ffe29b' : '#ff6919', 24, index === 0 ? .011 : .017);
    ribbon.uniforms.uColor.value.multiplyScalar(index === 0 ? 3.3 : 2.2);
    ribbon.mesh.name = `FireballGatherRibbon${index}`;
    root.add(ribbon.mesh);
    return { ribbon, points: Array.from({ length: 24 }, () => new THREE.Vector3()) };
  });
  const outerTrail = createSpellRibbon('#ff5515', TRAIL_POINTS, .12);
  outerTrail.mesh.name = 'FireballPlasmaTrail';
  outerTrail.uniforms.uColor.value.multiplyScalar(2.4);
  const hotTrail = createSpellRibbon('#ffe09b', TRAIL_POINTS, .038);
  hotTrail.mesh.name = 'FireballHotTrail';
  hotTrail.uniforms.uColor.value.multiplyScalar(3.1);
  root.add(outerTrail.mesh, hotTrail.mesh);
  const trails = [outerTrail, hotTrail];
  const embers = createSpellParticleLayer({ capacity: 52, additive: true, hdr: 3.2 });
  embers.mesh.name = 'FireballEmbers';
  root.add(embers.mesh);
  const impact = createFireballImpact(root, context.textures);
  const left = new THREE.Vector3();
  const right = new THREE.Vector3();
  const launch = new THREE.Vector3(0, 1.285, .90);
  const target = new THREE.Vector3(0, .035, 3.1);
  const normal = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const position = new THREE.Vector3();
  const worldOrigin = new THREE.Vector3();
  const worldTarget = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const castWorld = new THREE.Matrix4();
  const inverse = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const trailPoints = Array.from({ length: TRAIL_POINTS }, () => new THREE.Vector3());
  let released = false;
  let previousTime = -1;
  let grounded = true;
  let presentation = 0;

  function reset() {
    released = false;
    previousTime = -1;
    root.matrixAutoUpdate = true;
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    root.scale.setScalar(1);
    launch.set(0, 1.285, .90);
    target.set(0, .035, 3.1);
    normal.set(0, 1, 0);
    presentation = 0;
    root.visible = false;
  }

  function release() {
    context.actor.updateWorldMatrix(true, false);
    castWorld.copy(context.actor.matrixWorld);
    if (previousTime >= 0) {
      context.socketPosition('Socket_HandVFX_Left', left);
      context.socketPosition('Socket_HandVFX_Right', right);
      launch.copy(left).add(right).multiplyScalar(.5);
      launch.z += .1;
    }
    worldOrigin.copy(launch).applyMatrix4(castWorld);
    worldTarget.copy(target).applyMatrix4(castWorld);
    const distance = worldTarget.distanceTo(worldOrigin);
    direction.copy(worldTarget).sub(worldOrigin).normalize();
    grounded = !context.resolveImpact || context.resolveImpact(worldOrigin, direction, distance + .35, worldTarget, worldNormal);
    if (context.resolveImpact && grounded) {
      inverse.copy(castWorld).invert();
      target.copy(worldTarget).applyMatrix4(inverse);
      normal.copy(worldNormal).applyNormalMatrix(normalMatrix.getNormalMatrix(inverse));
    }
    released = true;
    root.matrixAutoUpdate = false;
  }

  return {
    root,
    reset,
    samplePresentation(worldPosition) {
      if (!root.visible) return 0;
      position.copy(previousTime < FIREBALL_IMPACT ? orb.position : target);
      root.localToWorld(worldPosition.copy(position));
      return presentation;
    },
    update(timeSeconds) {
      if (timeSeconds < previousTime - .000001) reset();
      root.visible = timeSeconds >= 0 && timeSeconds < FIREBALL_END;
      if (!root.visible) { presentation = 0; light.intensity = 0; return; }
      const gathering = timeSeconds < FIREBALL_RELEASE;
      if (!gathering && !released) release();
      if (released) {
        context.actor.updateWorldMatrix(true, false);
        root.matrix.copy(context.actor.matrixWorld).invert().multiply(castWorld);
      }
      root.updateWorldMatrix(true, true);
      const charge = smoothRange(.025, .48, timeSeconds);
      const flight = THREE.MathUtils.clamp((timeSeconds - FIREBALL_RELEASE) / (FIREBALL_IMPACT - FIREBALL_RELEASE), 0, 1);
      const impactAge = timeSeconds - FIREBALL_IMPACT;
      if (gathering) {
        context.socketPosition('Socket_HandVFX_Left', left);
        context.socketPosition('Socket_HandVFX_Right', right);
        orb.position.copy(left).add(right).multiplyScalar(.5);
        orb.position.y += .035;
        orb.position.z += .04;
      } else {
        orb.position.copy(launch).lerp(target, flight);
        orb.position.y += Math.sin(flight * Math.PI) * .12;
      }
      orb.visible = impactAge < .025;
      const size = gathering ? .3 + charge * .78 : 1.16 - flight * .12;
      orb.scale.setScalar(size);
      volumeMaterial.uniforms.uTime!.value = timeSeconds * 1.5;
      volumeMaterial.uniforms.uOpacity!.value = gathering ? charge : 1;
      halo.uniforms.uAlpha.value = charge * .52;
      halo.uniforms.uTime.value = timeSeconds;
      // Emissive VFX provide the hot core; close-range spill should retain skin detail.
      light.intensity = impactAge < 0 ? charge * (gathering ? .35 : 1.2) : 0;
      for (let j = 0; j < tendrils.length; j++) {
        const { ribbon, points } = tendrils[j]!;
        ribbon.mesh.visible = gathering && charge > .01;
        for (let i = 0; i < points.length; i++) {
          const p = i / (points.length - 1);
          const angle = timeSeconds * (7 + j) + p * Math.PI * 2.2 + j * 2.09;
          const radius = (.33 * (1 - p) + .06) * charge;
          points[i]!.copy(orb.position);
          points[i]!.x += Math.cos(angle) * radius;
          points[i]!.y += Math.sin(angle) * radius * .62;
          points[i]!.z += Math.sin(angle + j) * radius * .5;
        }
        ribbon.update(points);
        ribbon.uniforms.uAlpha.value = charge * .68;
        ribbon.uniforms.uTime.value = timeSeconds;
      }
      const trailFade = 1 - smoothRange(0, .14, impactAge);
      const trailVisible = !gathering && trailFade > .001;
      const trailStart = Math.max(0, flight - .6);
      direction.copy(target).sub(launch);
      for (let i = 0; i < TRAIL_POINTS; i++) {
        const p = i / (TRAIL_POINTS - 1);
        const sample = THREE.MathUtils.lerp(trailStart, flight, p);
        trailPoints[i]!.copy(launch).addScaledVector(direction, sample);
        trailPoints[i]!.y += Math.sin(sample * Math.PI) * .12 + Math.sin(timeSeconds * 22 + p * 13) * .026 * (1 - p);
        trailPoints[i]!.x += Math.sin(timeSeconds * 27 - p * 17) * .035 * (1 - p);
      }
      for (const trail of trails) {
        trail.update(trailPoints);
        trail.mesh.visible = trailVisible;
        trail.uniforms.uAlpha.value = trailFade * .76;
        trail.uniforms.uTime.value = timeSeconds;
      }
      let count = 0;
      if (impactAge < .16) for (let i = 0; i < 52; i++) {
        const angle = i * 2.399963 + timeSeconds * 1.4;
        const radius = .12 + (i % 9) * .018;
        position.copy(orb.position);
        if (!gathering) position.addScaledVector(direction, -(i % 13) * .028);
        position.x += Math.cos(angle) * radius;
        position.y += Math.sin(angle) * radius;
        position.z += Math.sin(angle * 1.7) * radius * .5;
        embers.setParticle(count++, position, .012 + (i % 4) * .003, angle, FIRE_COLOR, charge * trailFade * .65, 0, 1.8);
      }
      embers.commit(count);
      impact.update(impactAge, target, normal, grounded);
      presentation = impactAge < 0 ? charge * (gathering ? .16 : .36) : Math.exp(-impactAge * 5) * .75;
      previousTime = timeSeconds;
      root.updateWorldMatrix(true, true);
    },
    dispose() {
      impact.dispose();
      light.dispose();
      disposeTree(root);
    },
  };
}
