import * as THREE from 'three';
import { MOVE_CATALOG } from './moveCatalog';
import { AIRBORNE_RECIPES } from './recipes/airborneRecipes';
import { DEATH_RECIPE } from './recipes/deathRecipe';
import { JUMP_ARC_RECIPE } from './recipes/jumpArcRecipe';
import { BASE_POSES } from './recipes/basePoses';
import { COMBAT_RECIPES } from './recipes/combatRecipes';
import { LOCOMOTION_RECIPES } from './recipes/locomotionRecipes';
import { STANCE_RECIPES } from './recipes/stanceRecipes';
import { SWIMMING_RECIPES } from './recipes/swimmingRecipes';
import { TWO_HANDED_WEAPON_RECIPES } from './recipes/twoHandedWeaponRecipes';
import { ELEMENTAL_SPELL_RECIPES } from './recipes/spellVariants';
import type { ClipRecipe, PoseFrame, Vec3 } from './recipes/types';
import type { MoveId } from './types';
import { createMotionCurve, motionSampleTimes } from './sampleMotionCurve';
import { withGaitPosture } from './recipes/gaitPosture';
import { widenRelaxedIdleArms } from './correctRelaxedIdlePosture';
import { RELAXED_STANCE_MOVES } from './relaxedStance';

const RECIPES: readonly ClipRecipe[] = [
  ...STANCE_RECIPES,
  ...LOCOMOTION_RECIPES,
  ...AIRBORNE_RECIPES,
  ...SWIMMING_RECIPES,
  ...COMBAT_RECIPES,
  ...TWO_HANDED_WEAPON_RECIPES,
  ...ELEMENTAL_SPELL_RECIPES,
  JUMP_ARC_RECIPE,
  DEATH_RECIPE,
];

function requireObject(root: THREE.Object3D, name: string): THREE.Object3D {
  const object = root.getObjectByName(name);
  if (!object) throw new Error(`The rig is missing bone “${name}”.`);
  return object;
}

function requireFiniteVector(value: Vec3, context: string): void {
  if (value.length !== 3 || value.some((component) => !Number.isFinite(component))) {
    throw new Error(`${context} must contain three finite values.`);
  }
}

function validateFrame(frame: PoseFrame, previousTime: number, recipe: ClipRecipe): void {
  if (!Number.isFinite(frame.time) || frame.time < 0 || frame.time <= previousTime) {
    throw new Error(`${recipe.id} has a non-increasing frame time at ${frame.time}.`);
  }
  for (const [name, value] of Object.entries(frame.rotations ?? {})) {
    requireFiniteVector(value, `${recipe.id}.${name}.rotation`);
  }
  for (const [name, value] of Object.entries(frame.positions ?? {})) {
    requireFiniteVector(value, `${recipe.id}.${name}.position`);
  }
}

function validateRecipes(): void {
  const ids = new Set<MoveId>();
  for (const recipe of RECIPES) {
    if (ids.has(recipe.id)) throw new Error(`Duplicate animation recipe for ${recipe.id}.`);
    ids.add(recipe.id);
    const move = MOVE_CATALOG.find((candidate) => candidate.id === recipe.id);
    if (!move) throw new Error(`Animation recipe ${recipe.id} has no catalog entry.`);
    if (recipe.frames.length < 2 || recipe.frames[0]?.time !== 0) {
      throw new Error(`${recipe.id} must start at zero and contain at least two frames.`);
    }
    let previousTime = -1;
    for (const frame of recipe.frames) {
      validateFrame(frame, previousTime, recipe);
      previousTime = frame.time;
    }
    const lastTime = recipe.frames.at(-1)?.time;
    if (Math.abs((lastTime ?? 0) - move.duration) > 0.0001) {
      throw new Error(`${recipe.id} ends at ${lastTime}, but its catalog duration is ${move.duration}.`);
    }
  }
  for (const move of MOVE_CATALOG) {
    if (!ids.has(move.id)) throw new Error(`Missing animation recipe for ${move.id}.`);
  }
}

function createClip(root: THREE.Object3D, recipe: ClipRecipe): THREE.AnimationClip {
  const move = MOVE_CATALOG.find((candidate) => candidate.id === recipe.id);
  if (!move) throw new Error(`Missing move definition for ${recipe.id}.`);
  const basePose = BASE_POSES[recipe.basePose ?? 'relaxed'];
  const rotationNames = new Set([
    ...Object.keys(basePose.rotations),
    ...recipe.frames.flatMap((frame) => Object.keys(frame.rotations ?? {})),
  ]);
  const positionNames = new Set([
    ...Object.keys(basePose.positions),
    ...recipe.frames.flatMap((frame) => Object.keys(frame.positions ?? {})),
  ]);
  const keyTimes = recipe.frames.map((frame) => frame.time);
  const times = motionSampleTimes(keyTimes, recipe.sampleRate ?? 60);
  const tracks: THREE.KeyframeTrack[] = [];

  for (const name of rotationNames) {
    const object = requireObject(root, name);
    const values: number[] = [];
    const curves = [0, 1, 2].map((axis) => createMotionCurve(keyTimes, recipe.frames.map((frame) =>
      (frame.rotations?.[name] ?? basePose.rotations[name] ?? [0, 0, 0])[axis]!), move.loop));
    for (const time of times) {
      const [x, y, z] = curves.map((curve) => curve(time));
      const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
      const result = object.quaternion.clone().multiply(delta).normalize();
      values.push(result.x, result.y, result.z, result.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values));
  }

  for (const name of positionNames) {
    const object = requireObject(root, name);
    const values: number[] = [];
    const curves = [0, 1, 2].map((axis) => createMotionCurve(keyTimes, recipe.frames.map((frame) =>
      (frame.positions?.[name] ?? basePose.positions[name] ?? [0, 0, 0])[axis]!), move.loop));
    for (const time of times) {
      const [x = 0, y = 0, z = 0] = curves.map((curve) => curve(time));
      values.push(object.position.x + x, object.position.y + y, object.position.z + z);
    }
    const track = new THREE.VectorKeyframeTrack(`${name}.position`, times, values);
    tracks.push(track);
  }

  const clip = new THREE.AnimationClip(move.id, move.duration, tracks).optimize();
  return RELAXED_STANCE_MOVES.includes(move.id) ? widenRelaxedIdleArms(clip) : clip;
}

export function createProceduralClips(root: THREE.Object3D): ReadonlyMap<MoveId, THREE.AnimationClip> {
  validateRecipes();
  return new Map(RECIPES.map((recipe) => [recipe.id, createClip(root, withGaitPosture(recipe))]));
}
