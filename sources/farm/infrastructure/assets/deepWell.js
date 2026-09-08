import * as THREE from 'three';
import {
  addChannel,
  addCollider,
  addPivot,
  addSocket,
  createAssetContext,
  finishAsset,
  registerMesh,
} from '../core/assetContext.js';
import { beamBetween } from '../core/geometryLibrary.js';

export const DEEP_WELL_PASSES = Object.freeze(['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass']);

const PASS_INDEX = new Map(DEEP_WELL_PASSES.map((id, index) => [id, index]));
const passAtLeast = (pass, minimum) => (PASS_INDEX.get(pass) ?? 7) >= (PASS_INDEX.get(minimum) ?? 0);

export function createDeepWellMaterials() {
  const material = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: false });
  return {
    stone: material('deep-well-warm-masonry-mat', '#8b8375', 0.82),
    timber: material('deep-well-structural-timber-mat', '#534333', 0.74),
    iron: material('deep-well-matte-dark-iron-mat', '#354145', 0.6, 0.48),
  };
}

function mesh(context, parent, id, geometry, material, group, minimumPass = 'blockout') {
  const item = registerMesh(context, parent, id, new THREE.Mesh(geometry, material), group, minimumPass);
  item.geometry.computeVertexNormals();
  return item;
}

function cylinderX(radius, length, segments = 8) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function tintedGeometry(geometry, color) {
  return geometry;
}

function wedgeBlock(outerRadius, innerRadius, height, angle, material, context, parent, id, group) {
  const width = 2 * outerRadius * Math.tan(Math.PI / 14) * 0.9;
  const depth = outerRadius - innerRadius;
  const block = mesh(context, parent, id, tintedGeometry(new THREE.BoxGeometry(width, height, depth), '#ffffff'), material, group);
  const radius = (outerRadius + innerRadius) * 0.5;
  block.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
  block.rotation.y = angle;
  return block;
}

function addCourse(context, curb, id, y, outerRadius, innerRadius, height, offset) {
  const course = addPivot(context, curb, id, [0, y, 0]);
  for (let index = 0; index < 14; index += 1) {
    wedgeBlock(outerRadius, innerRadius, height, offset + (index / 14) * Math.PI * 2, context.materials.stone, context, course, `${id}-block-${index + 1}`, id);
  }
  addCollider(context, course, id, 'annular-compound', [0, 0, 0], { outerRadius, innerRadius, height, isTrigger: false });
  return course;
}

function addWheel(context, parent, id, x, radius, rimRadius) {
  const wheel = addPivot(context, parent, id, [x, 0, 0]);
  const rim = mesh(context, wheel, `${id}-rim`, new THREE.TorusGeometry(radius - rimRadius, rimRadius, 6, 12), context.materials.iron, id, 'structural-pass');
  rim.rotation.y = Math.PI / 2;
  const hub = mesh(context, wheel, `${id}-hub`, cylinderX(0.105, 0.12, 8), context.materials.iron, id, 'structural-pass');
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const start = new THREE.Vector3(0, Math.cos(angle) * 0.09, Math.sin(angle) * 0.09);
    const end = new THREE.Vector3(0, Math.cos(angle) * (radius - rimRadius * 1.1), Math.sin(angle) * (radius - rimRadius * 1.1));
    mesh(context, wheel, `${id}-spoke-${index + 1}`, beamBetween(start.toArray(), end.toArray(), 0.035, 6), context.materials.iron, id, 'structural-pass');
  }
  addSocket(context, wheel, `${id}-hub`, [0, 0, 0]);
  addCollider(context, wheel, id, 'cylinder', [0, 0, 0], { axis: 'x', radius, length: 0.12, isTrigger: false });
  return wheel;
}

function setVisibilityForPass(root, passId) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = passAtLeast(passId, node.userData.minimumPass ?? 'blockout');
  });
}

export function createDeepWell(options = {}) {
  const passId = DEEP_WELL_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('deep-well', { label: 'Deep Well', targetHeightMetres: 2.55, passId });
  context.materials = createDeepWellMaterials();
  const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'curb-seat', [0, 0, 0]);
  addSocket(context, model, 'frame-seat', [0, 0.78, 0]);
  addSocket(context, model, 'pump-seat', [0, 0.68, 0]);

  const curb = addPivot(context, model, 'masonry-curb');
  addSocket(context, curb, 'shaft-centre', [0, 0.48, 0]);
  addCourse(context, curb, 'stone-course-lower', 0.145, 1.00, 0.63, 0.29, 0);
  addCourse(context, curb, 'stone-course-middle', 0.435, 0.98, 0.62, 0.30, Math.PI / 14);
  addCourse(context, curb, 'stone-course-top', 0.745, 1.02, 0.58, 0.32, 0);
  const cavity = addPivot(context, curb, 'shaft-cavity', [0, 0.44, 0]);
  const voidMesh = mesh(context, cavity, 'shaft-cavity', new THREE.CylinderGeometry(0.585, 0.585, 0.72, 14, 1, true), context.materials.iron, 'shaft-cavity', 'structural-pass');
  voidMesh.material.side = THREE.BackSide;
  addSocket(context, cavity, 'pump-column-seat', [0, 0.08, 0]);
  addCollider(context, cavity, 'shaft-cavity', 'cylinder', [0, 0, 0], { radius: 0.585, height: 0.72, isTrigger: true });
  const buttresses = addPivot(context, curb, 'perimeter-buttresses');
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const buttress = mesh(context, buttresses, `buttress-${index + 1}`, tintedGeometry(new THREE.CylinderGeometry(0.17, 0.25, 0.62, 4), '#ffffff'), context.materials.stone, 'perimeter-buttresses', 'structural-pass');
    buttress.position.set(Math.sin(angle) * 1.04, 0.31, Math.cos(angle) * 1.04);
    buttress.rotation.y = angle + Math.PI / 4;
  }
  addCollider(context, buttresses, 'perimeter-buttresses', 'compound-box-ring', [0, 0.31, 0], { count: 10, isTrigger: false });

  const frame = addPivot(context, model, 'timber-frame');
  addSocket(context, frame, 'top-beam-seat', [0, 2.39, 0]);
  for (const [side, x] of [['left', -0.75], ['right', 0.75]]) {
    const post = addPivot(context, frame, `${side}-post`, [x, 1.60, 0]);
    mesh(context, post, `${side}-post`, tintedGeometry(new THREE.CylinderGeometry(0.13, 0.17, 1.64, 4), '#ffffff'), context.materials.timber, `${side}-post`);
    addSocket(context, post, `${side}-brace-contact`, [0, 0.08, 0]);
    addCollider(context, post, `${side}-post`, 'box', [0, 0, 0], { width: 0.34, height: 1.64, depth: 0.28, isTrigger: false });
  }
  const beam = addPivot(context, frame, 'top-beam', [0, 2.39, 0]);
  mesh(context, beam, 'top-beam', tintedGeometry(new THREE.BoxGeometry(1.94, 0.23, 0.30), '#ffffff'), context.materials.timber, 'top-beam');
  addSocket(context, beam, 'central-hanger-seat', [0, -0.13, 0]);
  for (const [id, start, end] of [
    ['left-brace', [-0.72, 1.44, 0], [-0.43, 2.28, 0]],
    ['right-brace', [0.72, 1.44, 0], [0.43, 2.28, 0]],
  ]) {
    const brace = addPivot(context, frame, id);
    mesh(context, brace, id, beamBetween(start, end, 0.085, 4), context.materials.timber, id);
    addCollider(context, brace, id, 'box', [0, 0, 0], { isTrigger: false });
  }
  const hardware = addPivot(context, frame, 'frame-hardware-system');
  for (const [index, [x, y]] of [[-0.75, 2.32], [0.75, 2.32], [0, 2.25], [-0.75, 1.35], [0.75, 1.35]].entries()) {
    const plate = mesh(context, hardware, `hardware-plate-${index + 1}`, new THREE.BoxGeometry(0.27, 0.17, 0.04), context.materials.iron, 'frame-hardware-system', 'structural-pass');
    plate.position.set(x, y, 0.16);
    const bolt = mesh(context, hardware, `hardware-bolt-${index + 1}`, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6), context.materials.iron, 'frame-hardware-system', 'surface-pass');
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(x, y, 0.19);
  }
  addCollider(context, frame, 'timber-frame', 'compound-boxes', [0, 1.6, 0], { isTrigger: false });

  const pump = addPivot(context, model, 'pump-assembly');
  const lower = addPivot(context, pump, 'lower-pump-column', [0, 1.08, 0]);
  mesh(context, lower, 'lower-pump-column', new THREE.CylinderGeometry(0.26, 0.31, 0.68, 8), context.materials.iron, 'lower-pump-column');
  addSocket(context, lower, 'front-outlet-seat', [0, 0, 0.23]);
  const chamber = addPivot(context, pump, 'main-pump-chamber', [0, 1.55, 0]);
  mesh(context, chamber, 'main-pump-chamber', new THREE.CylinderGeometry(0.36, 0.31, 0.40, 8), context.materials.iron, 'main-pump-chamber');
  const lowerFlange = addPivot(context, pump, 'pump-lower-flange', [0, 1.29, 0]);
  mesh(context, lowerFlange, 'pump-lower-flange', new THREE.CylinderGeometry(0.39, 0.39, 0.10, 8), context.materials.iron, 'pump-lower-flange', 'structural-pass');
  const upperFlange = addPivot(context, pump, 'pump-upper-flange', [0, 1.80, 0]);
  mesh(context, upperFlange, 'pump-upper-flange', new THREE.CylinderGeometry(0.42, 0.42, 0.16, 8), context.materials.iron, 'pump-upper-flange', 'structural-pass');
  const cap = addPivot(context, pump, 'pump-cap', [0, 2.00, 0]);
  mesh(context, cap, 'pump-cap', new THREE.CylinderGeometry(0.26, 0.31, 0.22, 8), context.materials.iron, 'pump-cap', 'structural-pass');
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const stud = mesh(context, cap, `pump-cap-stud-${index + 1}`, new THREE.CylinderGeometry(0.028, 0.035, 0.05, 6), context.materials.iron, 'pump-cap', 'surface-pass');
    stud.position.set(Math.sin(angle) * 0.26, 0.14, Math.cos(angle) * 0.26);
  }
  const spindle = addPivot(context, pump, 'vertical-spindle', [0, 2.22, 0]);
  mesh(context, spindle, 'vertical-spindle', new THREE.CylinderGeometry(0.085, 0.09, 0.31, 8), context.materials.iron, 'vertical-spindle', 'structural-pass');
  const hanger = addPivot(context, beam, 'top-hanger-bracket', [0, -0.23, 0]);
  mesh(context, hanger, 'top-hanger-bracket', new THREE.BoxGeometry(0.26, 0.25, 0.32), context.materials.iron, 'top-hanger-bracket', 'structural-pass');
  const outlet = addPivot(context, lower, 'lower-front-outlet', [0, -0.10, 0.28]);
  const outletMesh = mesh(context, outlet, 'lower-front-outlet', cylinderX(0.13, 0.32, 8), context.materials.iron, 'lower-front-outlet', 'structural-pass');
  outletMesh.rotation.y = Math.PI / 2;
  outlet.rotation.x = -0.18;
  const boss = addPivot(context, chamber, 'side-drive-boss', [0.39, 0.02, 0]);
  mesh(context, boss, 'side-drive-boss', cylinderX(0.17, 0.24, 8), context.materials.iron, 'side-drive-boss', 'structural-pass');
  mesh(context, boss, 'side-drive-boss-step', cylinderX(0.125, 0.14, 8), context.materials.iron, 'side-drive-boss', 'surface-pass').position.x = 0.19;
  addSocket(context, boss, 'drive-shaft-receiver', [0.22, 0, 0]);
  addCollider(context, pump, 'pump-assembly', 'compound-cylinders', [0, 1.55, 0], { isTrigger: false });

  const drive = addPivot(context, pump, 'handwheel-drive', [0.59, 1.57, 0]);
  addSocket(context, drive, 'drive-shaft-axis', [0, 0, 0]);
  const shaft = addPivot(context, drive, 'drive-shaft');
  mesh(context, shaft, 'drive-shaft', cylinderX(0.085, 1.33, 8), context.materials.iron, 'drive-shaft', 'structural-pass').position.x = 0.28;
  addSocket(context, shaft, 'large-hub-seat', [0.43, 0, 0]);
  const large = addWheel(context, drive, 'large-inner-wheel', 0.50, 0.47, 0.055);
  const small = addWheel(context, drive, 'small-outer-wheel', 0.66, 0.37, 0.048);
  const crank = addPivot(context, small, 'crank-pin', [0.10, -0.23, 0.24]);
  mesh(context, crank, 'crank-pin', cylinderX(0.055, 0.18, 6), context.materials.iron, 'crank-pin', 'structural-pass').position.x = 0.09;
  addSocket(context, crank, 'grip-seat', [0.18, 0, 0]);
  const grip = addPivot(context, crank, 'crank-grip', [0.36, 0, 0]);
  mesh(context, grip, 'crank-grip', cylinderX(0.065, 0.34, 8), context.materials.timber, 'crank-grip', 'structural-pass');
  addSocket(context, grip, 'hand-grip-centre', [0, 0, 0]);
  addCollider(context, drive, 'handwheel-drive', 'compound-cylinders', [0.5, 0, 0], { axis: 'x', isTrigger: false });
  addCollider(context, grip, 'crank-grip', 'capsule', [0, 0, 0], { axis: 'x', isTrigger: false });
  addChannel(context, drive, 'rotation', 'x', Math.PI * 1.15, 0.56, 0);
  addChannel(context, grip, 'rotation', 'x', Math.PI * 2.1, 0.93, 0.42);

  const root = finishAsset(context);
  root.userData.artDirection = { heightMetres: 2.55, palette: ['warm gray masonry', 'weathered timber', 'matte dark iron'], note: 'Low-poly game prop approximated from the supplied concept sheet.' };
  root.userData.deepWellRig = { drive, shaft, large, small, crank, grip };
  root.userData.applyPassState = (nextPass) => { setVisibilityForPass(root, nextPass); root.userData.passId = nextPass; return root; };
  setVisibilityForPass(root, passId);
  return root;
}

export function animateDeepWell(root, elapsedSeconds, intensity = 1) {
  const rig = root.userData.deepWellRig;
  if (!rig) return root;
  const driveAngle = Math.sin(elapsedSeconds * 0.56 * Math.PI * 2) * Math.PI * 1.15 * intensity;
  rig.drive.rotation.x = driveAngle;
  rig.grip.rotation.x = Math.sin(elapsedSeconds * 0.93 * Math.PI * 2 + 0.42) * Math.PI * 2.1 * intensity;
  return root;
}
