import * as THREE from 'three';
import { SPELL_MOTIONS } from '../../animation/spellMotion';
import { createSpellGlow, createSpellRibbon } from './createSpellGlow';
import { createSpellParticleLayer } from './createSpellParticleLayer';
import { writeHierarchicalBolt } from './lightningGeometry';
import { disposeTree, smoothRange } from './spellVfxUtils';
import type { SpellEffect, SpellEffectContext } from './types';

export const LIGHTNING_RELEASE = SPELL_MOTIONS.lightning.release[0]!;
export const LIGHTNING_END = 2.55;

const MAIN_POINTS = 33;
const BRANCH_POINTS = 9;
const PRIMARY_FORK_COUNT = 5;
const SECONDARY_FORK_COUNT = 3;
const FORK_COUNT = PRIMARY_FORK_COUNT + SECONDARY_FORK_COUNT + 1;
const PRIMARY_ATTACHMENTS = [5, 10, 16, 22, 27] as const;
const SECONDARY_PARENTS = [0, 2, 4] as const;
const GROUND_ARC_COUNT = 4;
const ION_ARC_COUNT = 2;
const ION_COUNT = 28;
const SPARK_COUNT = 48;
const SMOKE_COUNT = 10;
const STRIKE_STARTS = [0, .105, .215] as const;
const STRIKE_ENDS = [.068, .183, .271] as const;
const STRIKE_PEAKS = [1, .72, .44] as const;
const COBALT = new THREE.Color('#358cff');
const HOT_BLUE = new THREE.Color('#9eefff');
const WHITE_HOT = new THREE.Color('#ffffff');
const SMOKE = new THREE.Color('#8496ac');
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

interface Bolt {
  readonly ribbon: ReturnType<typeof createSpellRibbon>;
  readonly points: THREE.Vector3[];
}

function createBolt(
  parent: THREE.Group,
  name: string,
  pointCount: number,
  color: THREE.ColorRepresentation,
  width: number,
): Bolt {
  const ribbon = createSpellRibbon(color, pointCount, width);
  ribbon.mesh.name = name;
  ribbon.mesh.visible = false;
  parent.add(ribbon.mesh);
  return {
    ribbon,
    points: Array.from({ length: pointCount }, () => new THREE.Vector3()),
  };
}

function setBoltAppearance(bolt: Bolt, visible: boolean, alpha: number, time: number): void {
  bolt.ribbon.mesh.visible = visible;
  bolt.ribbon.uniforms.uAlpha.value = visible ? alpha : 0;
  bolt.ribbon.uniforms.uTime.value = time;
}

function setBranchTaper(bolt: Bolt): void {
  const taper = bolt.ribbon.mesh.geometry.getAttribute('aTaper') as THREE.BufferAttribute;
  for (let index = 0; index < bolt.points.length; index += 1) {
    const width = Math.pow(1 - index / (bolt.points.length - 1), .58);
    taper.setX(index * 2, width);
    taper.setX(index * 2 + 1, width);
  }
  taper.needsUpdate = true;
}

function hash01(index: number, channel: number): number {
  const value = Math.sin(index * 91.17 + channel * 37.41) * 43758.5453;
  return value - Math.floor(value);
}

export interface LightningEffect extends SpellEffect {
  reset(): void;
  samplePresentation(worldPosition: THREE.Vector3): number;
}

/**
 * A deterministic sky strike. The strike graph is rebuilt from fixed seeds for
 * each re-strike, while the released root remains frozen in cast-world space.
 */
export function createLightningVfx(context: SpellEffectContext): LightningEffect {
  const timing = SPELL_MOTIONS.lightning;
  const root = new THREE.Group();
  root.name = 'LightningVfx';
  root.visible = false;
  context.actor.add(root);

  const main = createBolt(root, 'LightningCore', MAIN_POINTS, '#f5ffff', .011);
  main.ribbon.uniforms.uColor.value.multiplyScalar(4.8);
  const mainGlow = createBolt(root, 'LightningCoreGlow', MAIN_POINTS, '#276cff', .035);
  mainGlow.ribbon.uniforms.uColor.value.multiplyScalar(2.4);
  const forks = Array.from({ length: FORK_COUNT }, (_, index) => {
    const bolt = createBolt(root, `LightningFork${index + 1}`, BRANCH_POINTS, index % 2 ? '#71c8ff' : '#e9ffff', .011);
    bolt.ribbon.uniforms.uColor.value.multiplyScalar(index % 2 ? 2.1 : 3.7);
    setBranchTaper(bolt);
    return bolt;
  });
  const groundArcs = Array.from({ length: GROUND_ARC_COUNT }, (_, index) => {
    const bolt = createBolt(root, `LightningGroundArc${index + 1}`, BRANCH_POINTS, index % 2 ? '#2774ff' : '#bdefff', .014);
    bolt.ribbon.uniforms.uColor.value.multiplyScalar(index % 2 ? 1.9 : 2.7);
    setBranchTaper(bolt);
    return bolt;
  });
  const ionArcs = Array.from({ length: ION_ARC_COUNT }, (_, index) => {
    const bolt = createBolt(root, `LightningIonArc${index + 1}`, BRANCH_POINTS, index ? '#4f8fff' : '#d9ffff', .009);
    bolt.ribbon.uniforms.uColor.value.multiplyScalar(index ? 1.8 : 2.8);
    return bolt;
  });
  const strikeBolts = [main, mainGlow, ...forks];
  const allBolts = [...strikeBolts, ...groundArcs, ...ionArcs];

  const ions = createSpellParticleLayer({ capacity: ION_COUNT, additive: true, hdr: 2.6 });
  ions.mesh.name = 'LightningIons';
  root.add(ions.mesh);
  const sparks = createSpellParticleLayer({ capacity: SPARK_COUNT, additive: true, hdr: 4.2 });
  sparks.mesh.name = 'LightningHotDebris';
  root.add(sparks.mesh);
  const smoke = createSpellParticleLayer({
    capacity: SMOKE_COUNT,
    texture: context.textures?.smoke,
    atlas: context.textures?.smoke ? { columns: 6, rows: 6, frames: 36 } : undefined,
    hdr: 1,
  });
  smoke.mesh.name = 'LightningSmoke';
  root.add(smoke.mesh);

  const impactGlow = createSpellGlow('#78bdff', .24);
  impactGlow.mesh.name = 'LightningContactFlash';
  impactGlow.mesh.material.depthTest = false;
  impactGlow.uniforms.uIntensity.value = 2.8;
  root.add(impactGlow.mesh);

  const scorchMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float spokes = 0.5 + 0.5 * sin(atan(p.y, p.x) * 11.0 + r * 19.0);
        float soot = (1.0 - smoothstep(0.16, 1.0, r)) * (0.68 + spokes * 0.22);
        gl_FragColor = vec4(0.018, 0.026, 0.042, soot * uAlpha);
      }
    `,
  });
  scorchMaterial.name = 'LightningScorchMaterial';
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(.42, 48), scorchMaterial);
  scorch.name = 'LightningScorch';
  scorch.visible = false;
  root.add(scorch);

  const light = new THREE.PointLight('#73b9ff', 0, 3.25, 2);
  light.name = 'LightningContactLight';
  root.add(light);

  const left = new THREE.Vector3();
  const right = new THREE.Vector3();
  const overhead = new THREE.Vector3();
  const target = new THREE.Vector3(0, .025, 2.25);
  const normal = new THREE.Vector3(0, 1, 0);
  const sky = new THREE.Vector3(0, 4.3, 2.25);
  const tangent = new THREE.Vector3(1, 0, 0);
  const bitangent = new THREE.Vector3(0, 0, 1);
  const point = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const worldOrigin = new THREE.Vector3();
  const worldTarget = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  const castWorld = new THREE.Matrix4();
  const inverse = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const groundQuaternion = new THREE.Quaternion();
  let released = false;
  let grounded = true;
  let previousTime = -1;
  let presentation = 0;

  function sampleHands(): void {
    context.socketPosition('Socket_HandVFX_Left', left);
    context.socketPosition('Socket_HandVFX_Right', right);
    overhead.copy(left).add(right).multiplyScalar(.5);
    overhead.x *= .28;
    overhead.y = Math.max(1.96, overhead.y + .42);
    overhead.z += .12;
  }

  function captureRelease(): void {
    sampleHands();
    context.actor.updateWorldMatrix(true, false);
    castWorld.copy(context.actor.matrixWorld);
    worldOrigin.copy(sky).applyMatrix4(castWorld);
    worldTarget.copy(target).applyMatrix4(castWorld);
    rayDirection.copy(worldTarget).sub(worldOrigin);
    const distance = rayDirection.length();
    rayDirection.multiplyScalar(1 / Math.max(distance, 1e-6));
    grounded = !context.resolveImpact
      || context.resolveImpact(worldOrigin, rayDirection, distance + .6, worldTarget, worldNormal);
    inverse.copy(castWorld).invert();
    if (context.resolveImpact && grounded) {
      target.copy(worldTarget).applyMatrix4(inverse);
      normal.copy(worldNormal).applyNormalMatrix(normalMatrix.getNormalMatrix(inverse)).normalize();
    }
    tangent.crossVectors(normal, Math.abs(normal.y) < .84 ? AXIS_X : AXIS_Z).normalize();
    bitangent.crossVectors(normal, tangent).normalize();
    sky.copy(target).addScaledVector(normal, 4.25).addScaledVector(bitangent, -.08);
    groundQuaternion.setFromUnitVectors(AXIS_Z, normal);
    smoke.setSurfaceFade(target, normal, grounded ? .12 : 0);
    released = true;
    root.matrixAutoUpdate = false;
  }

  function reset(): void {
    released = false;
    grounded = true;
    previousTime = -1;
    presentation = 0;
    target.set(0, .025, 2.25);
    normal.set(0, 1, 0);
    sky.set(0, 4.3, 2.25);
    root.matrixAutoUpdate = true;
    root.matrix.identity();
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    root.scale.setScalar(1);
    root.visible = false;
    for (let index = 0; index < allBolts.length; index += 1) {
      setBoltAppearance(allBolts[index]!, false, 0, 0);
    }
    ions.commit(0);
    sparks.commit(0);
    smoke.commit(0);
    impactGlow.mesh.visible = false;
    impactGlow.uniforms.uAlpha.value = 0;
    scorch.visible = false;
    scorchMaterial.uniforms.uAlpha!.value = 0;
    light.intensity = 0;
  }

  function updateGathering(timeSeconds: number): void {
    sampleHands();
    const gather = smoothRange(.04, timing.gather + .24, timeSeconds)
      * (1 - smoothRange(LIGHTNING_RELEASE - .07, LIGHTNING_RELEASE, timeSeconds));
    const flicker = .72 + .28 * (hash01(Math.floor(timeSeconds * 24), 3) > .38 ? 1 : .3);
    let ionCount = 0;
    for (let index = 0; index < ION_COUNT; index += 1) {
      const orbit = timeSeconds * (2.8 + index % 4 * .23) + index * 2.399963;
      const radius = .1 + hash01(index, 2) * .34;
      const progress = hash01(index, 5);
      point.copy(overhead);
      point.x += Math.cos(orbit) * radius;
      point.z += Math.sin(orbit) * radius * .58;
      point.y += (progress - .5) * .42 + Math.sin(orbit * 1.7) * .06;
      ions.setParticle(ionCount++, point, .009 + hash01(index, 7) * .018, orbit, index % 3 ? COBALT : WHITE_HOT, gather * flicker * (.36 + hash01(index, 8) * .54), 0, 2.4);
    }
    ions.commit(gather > .002 ? ionCount : 0);
    for (let index = 0; index < ionArcs.length; index += 1) {
      const ion = ionArcs[index]!;
      writeHierarchicalBolt(ion.points, index ? right : left, overhead, 101 + index * 37 + Math.floor(timeSeconds * 10), .12);
      ion.ribbon.update(ion.points);
      setBoltAppearance(ion, gather > .22 && hash01(Math.floor(timeSeconds * 18), index + 9) > .42, gather * .54, timeSeconds);
    }
    for (let index = 0; index < strikeBolts.length; index += 1) setBoltAppearance(strikeBolts[index]!, false, 0, timeSeconds);
    for (let index = 0; index < groundArcs.length; index += 1) setBoltAppearance(groundArcs[index]!, false, 0, timeSeconds);
    sparks.commit(0);
    smoke.commit(0);
    impactGlow.mesh.visible = false;
    scorch.visible = false;
    light.intensity = 0;
    presentation = gather * .22;
  }

  function updateReleased(timeSeconds: number): void {
    const age = timeSeconds - LIGHTNING_RELEASE;
    let pulse = 0;
    let pattern = 0;
    for (let index = 0; index < STRIKE_STARTS.length; index += 1) {
      const local = age - STRIKE_STARTS[index]!;
      const duration = STRIKE_ENDS[index]! - STRIKE_STARTS[index]!;
      if (local < 0 || local > duration) continue;
      pulse = STRIKE_PEAKS[index]! * smoothRange(0, .006, local) * (1 - smoothRange(.016, duration, local));
      pattern = index;
      break;
    }

    const strikeVisible = pulse > .001;
    if (strikeVisible) {
      writeHierarchicalBolt(main.points, sky, target, 17 + pattern * 26, .56 - pattern * .06, .65);
      main.ribbon.update(main.points);
      mainGlow.ribbon.update(main.points);
      setBoltAppearance(main, true, pulse, timeSeconds);
      setBoltAppearance(mainGlow, true, pulse * .46, timeSeconds);
      for (let index = 0; index < PRIMARY_FORK_COUNT; index += 1) {
        const fork = forks[index]!;
        const branchIndex = PRIMARY_ATTACHMENTS[index]!;
        point.copy(main.points[branchIndex]!);
        const length = .34 + hash01(index + pattern * 3, 30) * .5;
        const side = index % 2 ? -1 : 1;
        offset.copy(tangent).multiplyScalar(side * length)
          .addScaledVector(bitangent, (hash01(index + pattern * 7, 10) - .5) * length * .85)
          .addScaledVector(normal, -.08 - index * .035);
        point.add(offset);
        writeHierarchicalBolt(fork.points, main.points[branchIndex]!, point, 211 + pattern * 31 + index * 17, .11 + index * .012);
        fork.ribbon.update(fork.points);
        setBoltAppearance(fork, true, pulse * (.9 - index * .1), timeSeconds);
      }
      for (let index = 0; index < SECONDARY_FORK_COUNT; index += 1) {
        const parent = forks[SECONDARY_PARENTS[index]!]!;
        const fork = forks[PRIMARY_FORK_COUNT + index]!;
        const parentPoint = 4 + index;
        velocity.copy(parent.points[parentPoint]!).sub(parent.points[parentPoint - 1]!).normalize();
        point.copy(parent.points[parentPoint]!);
        const side = index % 2 ? 1 : -1;
        const length = .24 + hash01(index + pattern * 5, 32) * .22;
        point.addScaledVector(velocity, length * .24)
          .addScaledVector(tangent, side * length * .72)
          .addScaledVector(bitangent, (hash01(index, 34) - .5) * length * .7)
          .addScaledVector(normal, -.04 - index * .02);
        writeHierarchicalBolt(fork.points, parent.points[parentPoint]!, point, 521 + pattern * 43 + index * 23, .065 + index * .008);
        fork.ribbon.update(fork.points);
        setBoltAppearance(fork, true, pulse * (.58 - index * .09), timeSeconds);
      }
      const tertiaryParent = forks[PRIMARY_FORK_COUNT + 1]!;
      const tertiary = forks[FORK_COUNT - 1]!;
      velocity.copy(tertiaryParent.points[5]!).sub(tertiaryParent.points[4]!).normalize();
      point.copy(tertiaryParent.points[5]!)
        .addScaledVector(velocity, .07)
        .addScaledVector(tangent, -.19)
        .addScaledVector(bitangent, .09)
        .addScaledVector(normal, -.035);
      writeHierarchicalBolt(tertiary.points, tertiaryParent.points[5]!, point, 719 + pattern * 37, .045);
      tertiary.ribbon.update(tertiary.points);
      setBoltAppearance(tertiary, true, pulse * .34, timeSeconds);
    } else {
      for (let index = 0; index < strikeBolts.length; index += 1) setBoltAppearance(strikeBolts[index]!, false, 0, timeSeconds);
    }

    const groundStrength = smoothRange(0, .018, age) * (1 - smoothRange(.24, .58, age));
    for (let index = 0; index < groundArcs.length; index += 1) {
      const arc = groundArcs[index]!;
      const angle = index * Math.PI * .5 + .28;
      point.copy(target)
        .addScaledVector(tangent, Math.cos(angle) * (.36 + index * .12))
        .addScaledVector(bitangent, Math.sin(angle) * (.36 + index * .12));
      writeHierarchicalBolt(arc.points, target, point, 407 + index * 29, .07);
      for (let pointIndex = 0; pointIndex < arc.points.length; pointIndex += 1) {
        const arcPoint = arc.points[pointIndex]!;
        offset.copy(arcPoint).sub(target);
        arcPoint.addScaledVector(normal, .016 - offset.dot(normal));
      }
      arc.ribbon.update(arc.points);
      setBoltAppearance(arc, grounded && groundStrength > .002, groundStrength * (.72 - index * .08), timeSeconds);
    }
    for (let index = 0; index < ionArcs.length; index += 1) setBoltAppearance(ionArcs[index]!, false, 0, timeSeconds);
    ions.commit(0);

    const flash = smoothRange(0, .009, age) * (1 - smoothRange(.035, .14, age));
    impactGlow.mesh.visible = flash > .001;
    impactGlow.mesh.position.copy(target).addScaledVector(normal, .105);
    impactGlow.uniforms.uAlpha.value = flash * .42;
    impactGlow.uniforms.uTime.value = timeSeconds;
    light.position.copy(target).addScaledVector(normal, .23);
    light.intensity = Math.min(1.15, flash * 1.15 + pulse * .28);

    let sparkCount = 0;
    if (age >= 0 && age < .92) {
      for (let index = 0; index < SPARK_COUNT; index += 1) {
        const delay = hash01(index, 12) * .07;
        const flight = age - delay;
        if (flight < 0) continue;
        const angle = index * 2.399963 + hash01(index, 14) * .34;
        const speed = .72 + hash01(index, 16) * 1.5;
        velocity.copy(tangent).multiplyScalar(Math.cos(angle) * speed)
          .addScaledVector(bitangent, Math.sin(angle) * speed)
          .addScaledVector(normal, .82 + hash01(index, 18) * 1.58);
        point.copy(target).addScaledVector(normal, .035).addScaledVector(velocity, flight)
          .addScaledVector(normal, -3.7 * flight * flight);
        offset.copy(point).sub(target);
        const distanceToPlane = offset.dot(normal);
        if (distanceToPlane < .012) point.addScaledVector(normal, .012 - distanceToPlane);
        const alpha = Math.max(0, 1 - flight / .72) * (.34 + hash01(index, 20) * .48);
        sparks.setParticle(sparkCount++, point, .005 + hash01(index, 22) * .008, angle, index % 4 ? HOT_BLUE : WHITE_HOT, alpha, 0, 1.7 + speed * .35);
      }
    }
    sparks.commit(sparkCount);

    let smokeCount = 0;
    if (age > .08 && age < 1.72) {
      for (let index = 0; index < SMOKE_COUNT; index += 1) {
        const delay = .08 + index * .038;
        const smokeAge = age - delay;
        if (smokeAge < 0) continue;
        const angle = index * 2.399963;
        point.copy(target)
          .addScaledVector(tangent, Math.cos(angle) * (.035 + smokeAge * .13))
          .addScaledVector(bitangent, Math.sin(angle) * (.035 + smokeAge * .13))
          .addScaledVector(normal, .045 + smokeAge * (.23 + hash01(index, 24) * .13));
        const alpha = smoothRange(0, .12, smokeAge) * (1 - smoothRange(.65, 1.58, smokeAge)) * .32;
        smoke.setParticle(smokeCount++, point, .16 + smokeAge * .25, angle + smokeAge * .65, SMOKE, alpha, smokeAge * 18 + index * 1.7);
      }
    }
    smoke.commit(smokeCount);

    scorch.visible = grounded && age >= .035 && age < LIGHTNING_END - LIGHTNING_RELEASE;
    scorch.position.copy(target).addScaledVector(normal, .008);
    scorch.quaternion.copy(groundQuaternion);
    scorchMaterial.uniforms.uAlpha!.value = smoothRange(.04, .16, age)
      * (1 - smoothRange(1.35, LIGHTNING_END - LIGHTNING_RELEASE, age)) * .46;
    presentation = Math.max(pulse * .8, flash, groundStrength * .36, Math.max(0, 1 - age / 1.25) * .12);
  }

  reset();
  return {
    root,
    reset,
    samplePresentation(worldPosition) {
      if (!root.visible) return 0;
      point.copy(released ? target : overhead);
      root.localToWorld(worldPosition.copy(point));
      return presentation;
    },
    update(timeSeconds) {
      if (timeSeconds < previousTime - .000001) reset();
      root.visible = timeSeconds >= 0 && timeSeconds < LIGHTNING_END;
      if (!root.visible) {
        presentation = 0;
        light.intensity = 0;
        previousTime = timeSeconds;
        return;
      }
      if (timeSeconds < LIGHTNING_RELEASE) {
        updateGathering(timeSeconds);
      } else {
        if (!released) captureRelease();
        context.actor.updateWorldMatrix(true, false);
        root.matrix.copy(context.actor.matrixWorld).invert().multiply(castWorld);
        root.matrixWorldNeedsUpdate = true;
        updateReleased(timeSeconds);
      }
      previousTime = timeSeconds;
      root.updateWorldMatrix(true, true);
    },
    dispose() {
      light.dispose();
      disposeTree(root);
    },
  };
}
