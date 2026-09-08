import * as THREE from 'three';
import type { TrainingShield } from '../character/createTrainingShield';
import type { TrainingSword } from '../character/createTrainingSword';
import { calibrateWeaponGripContact } from './calibrateWeaponGripContact';
import { createCompactGuardPosture } from './createCompactGuardPosture';
import { createHandGripPose } from './createHandGripPose';
import { createOneHandedSwordPose } from './createOneHandedSwordPose';
import { createTwoHandedGripConstraint } from './createTwoHandedGripConstraint';
import { createWhirlwindSwordPose } from './createWhirlwindSwordPose';
import type { EquipmentMode } from './equipment';
import { createSwordShieldCarryPose } from './createSwordShieldCarryPose';
import { createGreatswordCarryPose } from './createGreatswordCarryPose';
import { createMotionCurve } from './sampleMotionCurve';
import { setBladeCutOrientation } from './setBladeCutOrientation';
import type { MoveId } from './types';
import { RELAXED_STANCE_MOVES } from './relaxedStance';

interface SwordPose {
  readonly time: number;
  readonly position: readonly [number, number, number];
  readonly bladeAngleDegrees: number;
  readonly lateralDegrees?: number;
}

interface TwoHandedWeaponControllerOptions {
  readonly sword: TrainingSword;
  readonly leftArm: THREE.Object3D;
  readonly leftForearm: THREE.Object3D;
  readonly leftHand: THREE.Object3D;
  readonly rightArm: THREE.Object3D;
  readonly rightForearm: THREE.Object3D;
  readonly rightHand: THREE.Object3D;
  readonly shield?: TrainingShield;
}

export interface TwoHandedWeaponController {
  setEquipment(mode: EquipmentMode): void;
  getEquipment(): EquipmentMode;
  update(move: MoveId, normalizedTime: number, deltaSeconds?: number, authoredClip?: boolean, preserveEquipment?: boolean): void;
}

export const TWO_HANDED_STRIKE_DURATION = 1.62;

const SWORD_POSES: readonly SwordPose[] = [
  { time: 0, position: [-0.04, 1.04, 0.12], bladeAngleDegrees: -31, lateralDegrees: -6 },
  { time: 0.14, position: [-0.06, 1.11, 0.11], bladeAngleDegrees: 108, lateralDegrees: -6 },
  { time: 0.3, position: [-0.02, 1.35, 0.02], bladeAngleDegrees: 122, lateralDegrees: -3 },
  { time: 0.49, position: [0, 1.54, 0.02], bladeAngleDegrees: 135 },
  { time: 0.64, position: [0, 1.47, 0.08], bladeAngleDegrees: 104 },
  { time: 0.75, position: [0, 1.27, 0.18], bladeAngleDegrees: 44 },
  { time: 0.82, position: [0, 1.08, 0.28], bladeAngleDegrees: -12 },
  { time: 1.02, position: [0.015, 1.0, 0.25], bladeAngleDegrees: -35, lateralDegrees: 2 },
  { time: 1.31, position: [-0.035, 1.01, 0.2], bladeAngleDegrees: 38, lateralDegrees: -4 },
  { time: 1.62, position: [-0.04, 1.04, 0.12], bladeAngleDegrees: -31, lateralDegrees: -6 },
];

const swordTimes = SWORD_POSES.map((pose) => pose.time);
const swordPositionCurves = [0, 1, 2].map((axis) => createMotionCurve(
  swordTimes,
  SWORD_POSES.map((pose) => pose.position[axis]!),
));
const swordAngleCurve = createMotionCurve(swordTimes, SWORD_POSES.map((pose) => pose.bladeAngleDegrees));
const swordLateralCurve = createMotionCurve(swordTimes, SWORD_POSES.map((pose) => pose.lateralDegrees ?? 0));

const poseDirection = new THREE.Vector3();
const overheadCutNormal = new THREE.Vector3(1, 0, 0);
const RUNNING_MOVES: ReadonlySet<MoveId> = new Set(['run-start', 'run', 'run-stop', 'running-leap']);
const RELAXED_HAND_MOVES: ReadonlySet<MoveId> = new Set(['idle', 'walk-start', 'walk', 'walk-stop', 'walk-backward']);
const CARRY_MOVES: ReadonlySet<MoveId> = new Set([
  ...RELAXED_HAND_MOVES, 'run-start', 'run', 'run-stop', 'turn-left', 'turn-right',
]);

function poseQuaternion(angleDegrees: number, lateralDegrees: number, target: THREE.Quaternion): THREE.Quaternion {
  const angle = THREE.MathUtils.degToRad(angleDegrees);
  const lateral = THREE.MathUtils.degToRad(lateralDegrees);
  poseDirection.set(Math.sin(lateral), Math.sin(angle) * Math.cos(lateral), Math.cos(angle) * Math.cos(lateral));
  return setBladeCutOrientation(poseDirection, overheadCutNormal, target);
}

export function applyTwoHandedSwordPose(root: THREE.Object3D, timeSeconds: number): void {
  const time = THREE.MathUtils.clamp(timeSeconds, 0, TWO_HANDED_STRIKE_DURATION);
  root.position.set(
    swordPositionCurves[0]!(time),
    swordPositionCurves[1]!(time),
    swordPositionCurves[2]!(time),
  );
  poseQuaternion(swordAngleCurve(time), swordLateralCurve(time), root.quaternion);
  root.updateWorldMatrix(true, true);
}

function createShieldAttachment(
  shield: TrainingShield,
  forearm: THREE.Object3D,
  hand: THREE.Object3D,
): (standOff?: number) => void {
  const elbowPosition = new THREE.Vector3();
  const wristPosition = new THREE.Vector3();
  const localElbow = new THREE.Vector3();
  const localWrist = new THREE.Vector3();
  const longitudinal = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const lateral = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  return (standOff = 0.07) => {
    const parent = shield.root.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    forearm.getWorldPosition(elbowPosition);
    hand.getWorldPosition(wristPosition);
    localElbow.copy(elbowPosition);
    localWrist.copy(wristPosition);
    parent.worldToLocal(localElbow);
    parent.worldToLocal(localWrist);
    longitudinal.copy(localWrist).sub(localElbow);
    longitudinal.z = 0;
    if (longitudinal.lengthSq() < 0.000001) longitudinal.set(0, 1, 0);
    else longitudinal.normalize();
    normal.set(0, 0, 1);
    lateral.crossVectors(longitudinal, normal).normalize();
    normal.crossVectors(lateral, longitudinal).normalize();
    shield.root.position.copy(localElbow).lerp(localWrist, 0.58).addScaledVector(normal, standOff);
    shield.root.quaternion.setFromRotationMatrix(basis.makeBasis(lateral, longitudinal, normal));
    shield.root.updateWorldMatrix(true, true);
  };
}

export function createTwoHandedWeaponController(
  options: TwoHandedWeaponControllerOptions,
): TwoHandedWeaponController {
  const rightPalmContact = calibrateWeaponGripContact(options.rightHand, 'Right');
  const leftPalmContact = calibrateWeaponGripContact(options.leftHand, 'Left');
  const rightGrip = createTwoHandedGripConstraint(
    options.rightArm,
    options.rightForearm,
    options.rightHand,
    rightPalmContact,
    options.sword.lowerHandSocket,
  );
  const leftGrip = createTwoHandedGripConstraint(
    options.leftArm,
    options.leftForearm,
    options.leftHand,
    leftPalmContact,
    options.sword.offHandSocket,
  );
  const rightHandGrip = createHandGripPose(options.rightHand);
  const leftHandGrip = createHandGripPose(options.leftHand);
  const oneHandedSwordPose = createOneHandedSwordPose(options.sword.root, rightPalmContact);
  let animatedRoot: THREE.Object3D | null = options.rightArm;
  while (animatedRoot && animatedRoot.name !== 'Root') animatedRoot = animatedRoot.parent;
  if (!animatedRoot) throw new Error('The sword controller requires the animated Root bone.');
  const hips = animatedRoot.getObjectByName('Hips');
  if (!hips) throw new Error('Greatsword carry requires the hips.');
  const carryPose = createGreatswordCarryPose(options.sword, hips);
  const compactGuard = createCompactGuardPosture(
    animatedRoot,
    options.leftArm,
    options.leftForearm,
    options.rightArm,
    options.rightForearm,
  );
  let equipment: EquipmentMode = 'unarmed';
  const swordShieldCarry = createSwordShieldCarryPose(options.sword, hips, options.leftArm,
    options.leftForearm, options.leftHand, leftPalmContact);
  let wasCarrying = false;
  let enteringStrikeFromCarry = false;
  const strikeEntryPosition = new THREE.Vector3();
  const strikeEntryQuaternion = new THREE.Quaternion();
  const carryPalmPosition = new THREE.Vector3();
  const palmWorldQuaternion = new THREE.Quaternion();
  const swordParentWorldQuaternion = new THREE.Quaternion();
  const swordWorldQuaternion = new THREE.Quaternion();
  const inverseLowerGripQuaternion = options.sword.lowerHandSocket.quaternion.clone().invert();
  const whirlwindSwordPose = createWhirlwindSwordPose(options.sword.root, rightPalmContact, animatedRoot);
  const guardTarget = new THREE.Object3D();
  const guardLocalPosition = new THREE.Vector3();
  const guardLocalOffset = new THREE.Vector3(0.04, -0.14, 0.48);
  const guardParentWorldQuaternion = new THREE.Quaternion();
  const guardConstraint = createTwoHandedGripConstraint(
    options.leftArm,
    options.leftForearm,
    options.leftHand,
    leftPalmContact,
    guardTarget,
  );
  const attachShield = options.shield
    ? createShieldAttachment(options.shield, options.leftForearm, options.leftHand)
    : undefined;

  function attachSwordToAuthoredPalm(): void {
    const parent = options.sword.root.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    rightPalmContact.updateWorldMatrix(true, false);
    rightPalmContact.getWorldPosition(carryPalmPosition);
    rightPalmContact.getWorldQuaternion(palmWorldQuaternion);
    options.sword.root.position.copy(carryPalmPosition);
    parent.worldToLocal(options.sword.root.position);
    swordWorldQuaternion.copy(palmWorldQuaternion).multiply(inverseLowerGripQuaternion).normalize();
    parent.getWorldQuaternion(swordParentWorldQuaternion);
    options.sword.root.quaternion.copy(swordParentWorldQuaternion.invert()).multiply(swordWorldQuaternion).normalize();
    options.sword.root.updateWorldMatrix(true, true);
  }

  return {
    setEquipment(mode) { equipment = mode; carryPose.reset(); swordShieldCarry.reset(); },
    getEquipment: () => equipment,
    update(move, normalizedTime, deltaSeconds, authoredClip = false, preserveEquipment = false) {
      if (preserveEquipment) {
        options.sword.setVisible(equipment !== 'unarmed');
        options.shield?.setVisible(equipment === 'sword-shield');
        options.sword.setOneHanded(equipment === 'sword-shield');
        if (equipment !== 'unarmed') attachSwordToAuthoredPalm();
        if (equipment === 'sword-shield') attachShield?.();
        rightHandGrip.update(equipment === 'unarmed' ? .1 : 1);
        leftHandGrip.update(equipment === 'sword-shield' ? .45 : .1);
        if (equipment === 'greatsword' && move === 'two-handed-strike') {
          applyTwoHandedSwordPose(options.sword.root, normalizedTime * TWO_HANDED_STRIKE_DURATION);
          rightGrip.update(true,.75);leftGrip.update(true,.75);leftHandGrip.update(1);
        } else if (equipment !== 'unarmed' && move === 'whirlwind') {
          whirlwindSwordPose.update();rightGrip.update(true,.9,false);whirlwindSwordPose.update();
        }
        return;
      }
      const twoHanded = move === 'two-handed-strike';
      const whirlwind = move === 'whirlwind';
      const oneHandedAttack = move === 'light-attack' || move === 'heavy-attack';
      const oneHandedGuard = oneHandedAttack || move === 'combat-idle';
      if (twoHanded) equipment = 'greatsword';
      else if (oneHandedGuard) equipment = 'sword-shield';
      const carrying = equipment === 'greatsword' && CARRY_MOVES.has(move);
      const carryingShield = equipment === 'sword-shield' && CARRY_MOVES.has(move);
      options.sword.setOneHanded((authoredClip && oneHandedGuard) || carryingShield);
      if (twoHanded && wasCarrying) {
        enteringStrikeFromCarry = true;
        strikeEntryPosition.copy(options.sword.root.position);
        strikeEntryQuaternion.copy(options.sword.root.quaternion);
      } else if (!twoHanded) enteringStrikeFromCarry = false;
      options.sword.setVisible(twoHanded || oneHandedGuard || whirlwind || carrying || carryingShield);
      options.shield?.setVisible(oneHandedGuard || carryingShield);
      if (!carryingShield) swordShieldCarry.reset();
      if (!carrying) carryPose.reset();
      const relaxedHands = RELAXED_HAND_MOVES.has(move)
        || (equipment === 'unarmed' && RELAXED_STANCE_MOVES.includes(move));
      const ambientGrip = RUNNING_MOVES.has(move) ? 0.24 : relaxedHands ? 0.1 : 0;
      compactGuard.update(authoredClip && move === 'combat-idle');
      if (oneHandedGuard) {
        if (authoredClip) {
          // The authored clip owns the arm and wrist. Derive the prop transform
          // from its calibrated palm socket without feeding IK back into it.
          attachSwordToAuthoredPalm();
        } else {
          const oneHandedMove = oneHandedAttack ? move : 'light-attack';
          const swordTime = oneHandedAttack ? normalizedTime : 0;
          oneHandedSwordPose.update(oneHandedMove, swordTime);
          rightGrip.update(true, 0.9, false);
          // The orientation solve shifts the palm around its wrist. Re-anchor the
          // handle to that solved palm while preserving the authored blade line.
          oneHandedSwordPose.update(oneHandedMove, swordTime);
        }
        const parent = options.sword.root.parent;
        if (parent && !authoredClip) {
          parent.updateWorldMatrix(true, false);
          options.leftArm.getWorldPosition(guardLocalPosition);
          parent.worldToLocal(guardLocalPosition);
          guardLocalPosition.add(guardLocalOffset).applyMatrix4(parent.matrixWorld);
          guardTarget.position.copy(guardLocalPosition);
          parent.getWorldQuaternion(guardParentWorldQuaternion);
          guardTarget.quaternion.copy(guardParentWorldQuaternion);
          guardTarget.updateWorldMatrix(true, true);
          // Procedural attacks need a constrained coverage target. Authored
          // clips keep their original shield-arm animation intact.
          guardConstraint.update(true, 0);
        }
        attachShield?.();
      } else if (twoHanded) {
        applyTwoHandedSwordPose(options.sword.root, normalizedTime * TWO_HANDED_STRIKE_DURATION);
        if (enteringStrikeFromCarry && normalizedTime < 0.09) {
          const progress = normalizedTime / 0.09;
          const blend = progress * progress * (3 - 2 * progress);
          options.sword.root.position.lerpVectors(strikeEntryPosition, options.sword.root.position, blend);
          options.sword.root.quaternion.slerpQuaternions(strikeEntryQuaternion, options.sword.root.quaternion, blend);
          options.sword.root.updateWorldMatrix(true, true);
        }
        rightGrip.update(true, 0.75);
        leftGrip.update(true, 0.75);
      } else if (carrying) {
        carryPose.update(deltaSeconds);
        rightGrip.update(true, 0.9);
        rightPalmContact.getWorldPosition(carryPalmPosition);
        options.sword.root.parent?.worldToLocal(carryPalmPosition);
        options.sword.root.position.copy(carryPalmPosition);
        options.sword.root.updateWorldMatrix(true, true);
      } else if (carryingShield) {
        swordShieldCarry.update(normalizedTime, RUNNING_MOVES.has(move), move !== 'idle', deltaSeconds);
        rightGrip.update(true, 0.9);
        rightPalmContact.getWorldPosition(carryPalmPosition);
        options.sword.root.parent?.worldToLocal(carryPalmPosition);
        options.sword.root.position.copy(carryPalmPosition);
        options.sword.root.updateWorldMatrix(true, true);
        // The running hand has open source-animation fingers. Keep the shield
        // face in front of their skinned surface while leaving combat guards on
        // the established forearm attachment.
        attachShield?.(0.26);
      } else if (whirlwind) {
        whirlwindSwordPose.update();
        rightGrip.update(true, 0.9, false);
        whirlwindSwordPose.update();
      }
      rightHandGrip.update(twoHanded || oneHandedGuard || whirlwind || carrying || carryingShield ? 1 : ambientGrip);
      leftHandGrip.update(twoHanded ? 1 : (oneHandedGuard || carryingShield) ? 0.45 : ambientGrip);
      wasCarrying = carrying;
    },
  };
}
