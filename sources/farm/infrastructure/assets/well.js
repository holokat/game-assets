import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  addChannel,
  addCollider,
  addPivot,
  addSocket,
  createAssetContext,
  finishAsset,
  registerMesh,
} from '../core/assetContext.js';
import { beamBetween, faceted, tubeThrough } from '../core/geometryLibrary.js';
import { createWellMaterials } from '../core/materialLibrary.js';

export const WELL_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(WELL_PASSES.map((id, index) => [id, index]));
const DRUM_RADIUS = 0.115;
const BASE_ROPE_LENGTH = 0.44;
const MIN_ROPE_LENGTH = 0.28;
const MAX_ROPE_LENGTH = 0.76;

function atLeast(passId, minimumPass) {
  return (PASS_INDEX.get(passId) ?? 7) >= (PASS_INDEX.get(minimumPass) ?? 0);
}

function visible(mesh, passId, minimumPass) {
  mesh.visible = atLeast(passId, minimumPass);
  return mesh;
}

function mesh(context, parent, id, geometry, material, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group, minimumPass);
}

function horizontalCylinder(radius, length, segments = 8) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function passAwareBox(width, height, depth, passId, radius) {
  return atLeast(passId, 'form-refinement')
    ? new RoundedBoxGeometry(width, height, depth, 1, radius)
    : new THREE.BoxGeometry(width, height, depth);
}

function wedgeBlockGeometry(outerWidth, innerWidth, height, depth) {
  const outerHalf = outerWidth * 0.5;
  const innerHalf = innerWidth * 0.5;
  const heightHalf = height * 0.5;
  const depthHalf = depth * 0.5;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -outerHalf, -heightHalf, depthHalf,
    outerHalf, -heightHalf, depthHalf,
    outerHalf, heightHalf, depthHalf,
    -outerHalf, heightHalf, depthHalf,
    -innerHalf, -heightHalf, -depthHalf,
    innerHalf, -heightHalf, -depthHalf,
    innerHalf, heightHalf, -depthHalf,
    -innerHalf, heightHalf, -depthHalf,
  ], 3));
  geometry.setIndex([
    0, 1, 2, 0, 2, 3,
    5, 4, 7, 5, 7, 6,
    4, 0, 3, 4, 3, 7,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    4, 5, 1, 4, 1, 0,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function addStoneCourse(context, parent, id, y, outerRadius, innerRadius, height, angleOffset, passId) {
  const course = addPivot(context, parent, id, [0, y, 0]);
  const count = 14;
  const halfAngle = Math.PI / count;
  const outerWidth = 2 * outerRadius * Math.tan(halfAngle) * 0.9;
  const innerWidth = 2 * innerRadius * Math.tan(halfAngle) * 0.9;
  for (let index = 0; index < count; index += 1) {
    const angle = angleOffset + (index / count) * Math.PI * 2;
    const block = mesh(context, course, `${id}-block-${index + 1}`, wedgeBlockGeometry(outerWidth, innerWidth, height, outerRadius - innerRadius), context.materials.stone, id, 'blockout');
    block.position.set(Math.sin(angle) * ((outerRadius + innerRadius) * 0.5), 0, Math.cos(angle) * ((outerRadius + innerRadius) * 0.5));
    block.rotation.y = angle;
    visible(block, passId, 'blockout');
  }
  addSocket(context, course, `${id}-center`, [0, 0, 0]);
  addCollider(context, course, id, 'cylinder-ring', [0, 0, 0], { outerRadius, innerRadius, height, isTrigger: false });
  return course;
}

function addRopeWrap(context, parent, index, passId) {
  const points = [];
  const turns = 1;
  const xCenter = -0.12 + index * 0.04;
  for (let step = 0; step <= 10; step += 1) {
    const theta = (step / 10) * Math.PI * 2 * turns;
    points.push([xCenter, Math.cos(theta) * 0.145, Math.sin(theta) * 0.145]);
  }
  const wrap = mesh(context, parent, `rope-wrap-${index + 1}`, tubeThrough(points, 0.018, 6), context.materials.rope, 'rope-drum', 'structural-pass');
  visible(wrap, passId, 'structural-pass');
  return wrap;
}

function addBucket(context, parent, passId) {
  const assembly = addPivot(context, parent, 'bucket-assembly', [0, 0, 0]);
  addSocket(context, assembly, 'bucket-hook-output', [0, 0, 0]);
  const blockout = mesh(context, assembly, 'bucket-blockout', new THREE.CylinderGeometry(0.2, 0.17, 0.38, 8, 1, false), context.materials.bucketWood, 'bucket-shell', 'blockout');
  blockout.position.y = -0.35;
  blockout.userData.maximumPass = 'blockout';
  const shell = addPivot(context, assembly, 'bucket-shell', [0, -0.35, 0]);
  const staveCount = 10;
  for (let index = 0; index < staveCount; index += 1) {
    const angle = (index / staveCount) * Math.PI * 2;
    const stave = mesh(context, shell, `bucket-stave-${index + 1}`, passAwareBox(0.12, 0.38, 0.065, passId, 0.012), context.materials.bucketWood, 'bucket-shell', 'structural-pass');
    stave.position.set(Math.sin(angle) * 0.188, 0, Math.cos(angle) * 0.188);
    stave.rotation.y = angle;
    visible(stave, passId, 'structural-pass');
  }
  const interior = visible(mesh(context, shell, 'bucket-interior', new THREE.CylinderGeometry(0.17, 0.15, 0.34, 10, 1, true), context.materials.stoneDark, 'bucket-shell', 'structural-pass'), passId, 'structural-pass');
  interior.position.y = 0.005;
  for (const [index, y] of [-0.12, 0.11].entries()) {
    const hoop = visible(mesh(context, shell, `bucket-hoop-${index + 1}`, new THREE.TorusGeometry(0.225, 0.018, 5, 10), context.materials.iron, 'bucket-shell', 'structural-pass'), passId, 'structural-pass');
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
  }
  const rim = visible(mesh(context, shell, 'bucket-top-rim', new THREE.TorusGeometry(0.205, 0.014, 5, 10), context.materials.bucketWood, 'bucket-shell', 'form-refinement'), passId, 'form-refinement');
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.195;
  const bail = addPivot(context, assembly, 'bucket-bail', [0, 0, 0]);
  const bailPoints = [[-0.19, -0.24, 0], [-0.18, -0.1, 0], [0, -0.03, 0], [0.18, -0.1, 0], [0.19, -0.24, 0]];
  const bailMesh = visible(mesh(context, bail, 'bucket-bail', tubeThrough(bailPoints, 0.017, 6), context.materials.iron, 'bucket-bail', 'blockout'), passId, 'blockout');
  addSocket(context, bail, 'left-bail-lug', [-0.19, -0.24, 0]);
  addSocket(context, bail, 'right-bail-lug', [0.19, -0.24, 0]);
  addSocket(context, bail, 'bail-apex', [0, -0.03, 0]);
  for (const [id, x] of [['left', -0.19], ['right', 0.19]]) {
    const lug = visible(mesh(context, shell, `bucket-${id}-lug`, horizontalCylinder(0.034, 0.055, 6), context.materials.iron, 'bucket-bail', 'structural-pass'), passId, 'structural-pass');
    lug.position.set(x, 0.11, 0);
  }
  addCollider(context, assembly, 'bucket', 'cylinder', [0, -0.35, 0], { radius: 0.23, height: 0.48, isTrigger: false });
  context.destructionGroups['bucket-assembly'] = Object.values(context.nodes).filter((node) => node.userData?.destructionGroup === 'bucket-shell' || node.userData?.destructionGroup === 'bucket-bail').map((node) => node.name);
  return { assembly, bail, bailMesh };
}

export function createWell(options = {}) {
  const passId = WELL_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('well', {
    label: 'Well',
    targetHeightMetres: 2.2,
    scaleNote: 'Art-direction approximation from the supplied four-view concept sheet, not a measured construction drawing.',
    passId,
  });
  context.materials = createWellMaterials();
  const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'frame-seat', [0, 0, 0]);

  const curb = addPivot(context, model, 'masonry-curb', [0, 0, 0]);
  addSocket(context, curb, 'shaft-center', [0, 0.35, 0]);
  addSocket(context, curb, 'top-course-seat', [0, 0.555, 0]);
  addStoneCourse(context, curb, 'stone-course-lower', 0.11, 0.78, 0.52, 0.22, 0, passId);
  addStoneCourse(context, curb, 'stone-course-middle', 0.335, 0.75, 0.51, 0.23, Math.PI / 14, passId);
  addStoneCourse(context, curb, 'stone-course-top', 0.575, 0.78, 0.49, 0.25, 0, passId);
  const cavity = visible(mesh(context, curb, 'shaft-cavity', new THREE.CylinderGeometry(0.49, 0.43, 0.56, 14, 1, true), context.materials.stoneDark, 'shaft-cavity', 'structural-pass'), passId, 'structural-pass');
  cavity.position.y = 0.34;
  addCollider(context, curb, 'shaft-cavity', 'cylinder', [0, 0.35, 0], { radius: 0.49, height: 0.58, isTrigger: true });

  const frame = addPivot(context, model, 'timber-frame', [0, 0, 0]);
  addSocket(context, frame, 'left-post-seat', [-0.74, 0.12, 0]);
  addSocket(context, frame, 'right-post-seat', [0.74, 0.12, 0]);
  addSocket(context, frame, 'windlass-bearing-axis', [0, 1.82, 0]);
  for (const [side, x] of [['left', -0.74], ['right', 0.74]]) {
    const footing = visible(mesh(context, frame, `${side}-footing`, passAwareBox(0.34, 0.24, 0.36, passId, 0.035), context.materials.stone, `${side}-footing`, 'blockout'), passId, 'blockout');
    footing.position.set(x, 0.12, 0);
    const post = visible(mesh(context, frame, `${side}-post`, passAwareBox(0.18, 1.98, 0.18, passId, 0.022), context.materials.timber, `${side}-post`, 'blockout'), passId, 'blockout');
    post.position.set(x, 1.09, 0);
    addCollider(context, frame, `${side}-post`, 'box', [x, 1.09, 0], { width: 0.18, height: 1.98, depth: 0.18, isTrigger: false });
    const plate = visible(mesh(context, frame, `${side}-bearing-plate`, passAwareBox(0.23, 0.23, 0.025, passId, 0.018), context.materials.iron, 'hardware', 'structural-pass'), passId, 'structural-pass');
    plate.position.set(x, 1.82, 0.1);
    const bolt = visible(mesh(context, frame, `${side}-bearing-bolt`, new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6), context.materials.iron, 'hardware', 'surface-pass'), passId, 'surface-pass');
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(x, 1.82, 0.12);
    const strap = visible(mesh(context, frame, `${side}-lower-strap`, passAwareBox(0.23, 0.13, 0.03, passId, 0.014), context.materials.iron, 'hardware', 'structural-pass'), passId, 'structural-pass');
    strap.position.set(x, 0.71, 0.1);
    const strapBolt = visible(mesh(context, frame, `${side}-lower-strap-bolt`, new THREE.CylinderGeometry(0.026, 0.026, 0.035, 6), context.materials.iron, 'hardware', 'surface-pass'), passId, 'surface-pass');
    strapBolt.rotation.x = Math.PI / 2;
    strapBolt.position.set(x, 0.71, 0.122);
  }
  const leftBrace = visible(mesh(context, frame, 'left-brace', beamBetween([-0.67, 1.24, 0], [-0.31, 1.76, 0], 0.072, 4), context.materials.timber, 'left-brace', 'blockout'), passId, 'blockout');
  const rightBrace = visible(mesh(context, frame, 'right-brace', beamBetween([0.67, 1.24, 0], [0.31, 1.76, 0], 0.072, 4), context.materials.timber, 'right-brace', 'blockout'), passId, 'blockout');
  addSocket(context, frame, 'left-brace-root', [-0.67, 1.24, 0]);
  addSocket(context, frame, 'right-brace-root', [0.67, 1.24, 0]);
  addCollider(context, frame, 'frame', 'compound-boxes', [0, 1.05, 0], { width: 1.82, height: 2.1, depth: 0.36, isTrigger: false });

  const windlass = addPivot(context, frame, 'windlass-system', [0, 1.82, 0]);
  addSocket(context, windlass, 'axle-axis', [0, 0, 0]);
  addSocket(context, windlass, 'bucket-travel-root', [0, -0.145, 0]);
  const axle = addPivot(context, windlass, 'windlass-axle', [0, 0, 0]);
  const axleMesh = visible(mesh(context, axle, 'windlass-axle', horizontalCylinder(0.085, 1.8, 8), context.materials.timber, 'windlass-axle', 'blockout'), passId, 'blockout');
  addSocket(context, axle, 'crank-control', [0.93, 0, 0]);
  const drum = addPivot(context, axle, 'rope-drum', [0, 0, 0]);
  const drumCore = visible(mesh(context, drum, 'rope-drum-core', horizontalCylinder(0.11, 0.3, 8), context.materials.rope, 'rope-drum', 'structural-pass'), passId, 'structural-pass');
  for (let index = 0; index < 7; index += 1) addRopeWrap(context, drum, index, passId);
  addCollider(context, axle, 'windlass-axle', 'cylinder', [0, 0, 0], { radius: 0.1, height: 1.8, axis: 'x', isTrigger: false });

  const ropeRig = addPivot(context, windlass, 'hanging-rope', [0, -0.145, 0]);
  const ropeBlockout = mesh(context, ropeRig, 'hanging-rope-blockout', new THREE.CylinderGeometry(0.026, 0.026, BASE_ROPE_LENGTH, 6), context.materials.rope, 'hanging-rope', 'blockout');
  ropeBlockout.position.y = -BASE_ROPE_LENGTH * 0.5;
  ropeBlockout.userData.maximumPass = 'blockout';
  const rope = visible(mesh(context, ropeRig, 'hanging-rope', new THREE.CylinderGeometry(0.018, 0.018, BASE_ROPE_LENGTH, 6), context.materials.rope, 'hanging-rope', 'structural-pass'), passId, 'structural-pass');
  rope.position.y = -BASE_ROPE_LENGTH * 0.5;
  const hook = addPivot(context, ropeRig, 'hook-knot', [0, -BASE_ROPE_LENGTH, 0]);
  const knot = visible(mesh(context, hook, 'hook-knot', new THREE.IcosahedronGeometry(0.038, 1), context.materials.rope, 'hook-knot', 'blockout'), passId, 'blockout');
  const hookMesh = visible(mesh(context, hook, 'bucket-hook', tubeThrough([[0, -0.02, 0], [0, -0.07, 0], [0.035, -0.09, 0]], 0.012, 5), context.materials.iron, 'hook-knot', 'structural-pass'), passId, 'structural-pass');
  addSocket(context, hook, 'hook-seat', [0, -0.09, 0]);
  const bucket = addBucket(context, hook, passId);
  addChannel(context, axle, 'rotation', 'x', Math.PI * 1.1, 0.62, 0);
  addChannel(context, bucket.bail, 'rotation', 'x', 0.1, 0.62, Math.PI / 2);

  context.destructionGroups['timber-frame'] = [leftBrace.name, rightBrace.name, axleMesh.name];
  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.2,
    note: 'Plausible game-prop scale inferred from the supplied concept sheet. This is not a measured construction drawing.',
    palette: ['warm stone masonry', 'structural timber', 'bucket wood', 'dark rope', 'dark iron'],
  };
  root.userData.applyPassState = (nextPassId) => applyWellPassState(root, nextPassId);
  root.userData.wellRig = { axle, ropeRig, hook, bucket: bucket.assembly, bail: bucket.bail, baseRopeLength: BASE_ROPE_LENGTH, drumRadius: DRUM_RADIUS };
  applyWellPassState(root, passId);
  return root;
}

export function applyWellPassState(root, passId = 'optimization-pass') {
  const selectedPass = WELL_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  root.userData.passId = selectedPass;
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['well-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({ name: 'well-blockout-mat', color: '#b6aaa0', roughness: 0.9, flatShading: true });
  root.traverse((node) => {
    if (!node.isMesh) return;
    const minimumPass = node.userData.minimumPass ?? 'blockout';
    const maximumPass = node.userData.maximumPass;
    node.visible = atLeast(selectedPass, minimumPass) && (!maximumPass || selectedIndex <= (PASS_INDEX.get(maximumPass) ?? selectedIndex));
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < (PASS_INDEX.get('material-pass')) ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateWell(root, timeSeconds, intensity = 1) {
  const rig = root?.userData?.wellRig;
  if (!rig) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const strength = Math.max(0, intensity);
  const angle = Math.sin(time * 0.62) * Math.PI * 1.1 * strength;
  rig.axle.rotation.x = angle;
  rig.bail.rotation.x = Math.sin(time * 0.62 + Math.PI / 2) * 0.1 * strength;
  const ropeLength = THREE.MathUtils.clamp(BASE_ROPE_LENGTH - angle * DRUM_RADIUS, MIN_ROPE_LENGTH, MAX_ROPE_LENGTH);
  rig.ropeRig.scale.y = ropeLength / BASE_ROPE_LENGTH;
  rig.hook.position.y = -ropeLength / rig.ropeRig.scale.y;
  return root;
}
