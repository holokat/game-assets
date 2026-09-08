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
import { faceted } from '../core/geometryLibrary.js';

export const GRANARY_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);

const PASS_INDEX = new Map(GRANARY_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness,
    flatShading: true,
    vertexColors: true,
  });
}

function makeMaterials() {
  return {
    timber: material('granary-weathered-timber-mat', '#725034', 0.88),
    metal: material('granary-galvanized-roof-mat', '#788388', 0.7, 0.42),
    stone: material('granary-warm-stone-pier-mat', '#847b6b', 0.94),
    iron: material('granary-dark-iron-mat', '#34383a', 0.62, 0.5),
    trim: material('granary-cream-hatch-trim-mat', '#b8a47e', 0.88),
  };
}

function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(
    context,
    parent,
    id,
    new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue),
    group,
    minimumPass,
  );
}

function box(width, height, depth) {
  return new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
}

function addBoxBeam(context, parent, id, start, end, width, depth, materialValue, group, minimumPass = 'structural-pass') {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const beam = mesh(context, parent, id, box(width, a.distanceTo(b), depth), materialValue, group, minimumPass);
  beam.position.copy(a.clone().add(b).multiplyScalar(0.5));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return beam;
}

function addGable(context, parent, id, z) {
  const shape = new THREE.Shape();
  shape.moveTo(-1.18, 0);
  shape.lineTo(0, 0.52);
  shape.lineTo(1.18, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, steps: 1 });
  const gable = mesh(context, parent, `${id}-gable`, geometry, context.materials.timber, 'building-body', 'structural-pass');
  gable.position.set(0, 2.25, z - 0.04);
  return gable;
}

export function createGranary(options = {}) {
  const passId = GRANARY_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('granary', {
    label: 'Granary',
    targetHeightMetres: 2.92,
    passId,
  });
  context.materials = makeMaterials();
  const { model } = context;
  model.position.y = 0.020750276;

  addSocket(context, context.root, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'loading', [0, 1.35, 1.15]);
  addSocket(context, model, 'grain-output', [1.72, 1.12, 0.16]);
  addSocket(context, model, 'service', [0, 0.72, 1.54]);
  addSocket(context, model, 'roof-attachment', [0, 2.92, 0]);
  addSocket(context, model, 'rear-attachment', [0, 1.55, -1.02]);
  addSocket(context, model, 'adjacency-left', [-1.42, 0.12, 0]);
  addSocket(context, model, 'adjacency-right', [1.92, 0.12, 0]);

  const supports = addPivot(context, model, 'support-piers');
  for (const [rowId, z] of [['front', 0.68], ['rear', -0.68]]) {
    for (const [columnId, x] of [['left', -0.92], ['center', 0], ['right', 0.92]]) {
      const id = `${rowId}-${columnId}`;
      const pier = mesh(context, supports, `${id}-stone-pier`, new THREE.CylinderGeometry(0.22, 0.33, 0.54, 6), context.materials.stone, 'stone-piers');
      pier.position.set(x, 0.27, z);
      const guard = mesh(context, supports, `${id}-rodent-guard`, new THREE.CylinderGeometry(0.38, 0.3, 0.09, 4), context.materials.iron, 'rodent-guards', 'structural-pass');
      guard.position.set(x, 0.585, z);
      guard.rotation.y = Math.PI / 4;
    }
  }

  const body = addPivot(context, model, 'building-body');
  const floor = mesh(context, body, 'granary-floor', box(2.5, 0.16, 1.75), context.materials.iron, 'building-body');
  floor.position.y = 0.72;
  const shell = mesh(context, body, 'granary-shell', box(2.35, 1.48, 1.62), context.materials.timber, 'building-body');
  shell.position.y = 1.52;
  for (const [id, x, z] of [
    ['front-left', -1.1, 0.76],
    ['front-right', 1.1, 0.76],
    ['rear-left', -1.1, -0.76],
    ['rear-right', 1.1, -0.76],
  ]) {
    const post = mesh(context, body, `${id}-corner-post`, box(0.14, 1.58, 0.14), context.materials.iron, 'iron-straps', 'structural-pass');
    post.position.set(x, 1.49, z);
  }
  for (const y of [0.84, 2.18]) {
    const band = mesh(context, body, `body-band-${y}`, box(2.48, 0.08, 1.72), context.materials.iron, 'iron-straps', 'surface-pass');
    band.position.y = y;
  }
  addGable(context, body, 'front', 0.85);
  addGable(context, body, 'rear', -0.85);
  addCollider(context, body, 'building-body', 'box', [0, 1.56, 0], {
    width: 2.55,
    height: 1.85,
    depth: 1.78,
    isTrigger: false,
  });

  const roof = addPivot(context, model, 'pitched-roof');
  for (const [id, x, rotationZ] of [['left', -0.67, 0.4], ['right', 0.67, -0.4]]) {
    const panel = mesh(context, roof, `${id}-roof-panel`, box(1.52, 0.09, 2.0), context.materials.metal, 'pitched-roof');
    panel.position.set(x, 2.54, 0);
    panel.rotation.z = rotationZ;
  }
  const ridge = mesh(context, roof, 'roof-ridge', box(0.14, 0.12, 2.06), context.materials.iron, 'pitched-roof', 'surface-pass');
  ridge.position.y = 2.9;
  addCollider(context, roof, 'pitched-roof', 'box', [0, 2.57, 0], {
    width: 2.76,
    height: 0.68,
    depth: 2.04,
    isTrigger: false,
  });

  const hatch = addPivot(context, model, 'front-hatch', [-0.46, 1.14, 0.86]);
  const hatchLeaf = mesh(context, hatch, 'hatch-leaf', box(0.92, 0.96, 0.09), context.materials.timber, 'front-hatch', 'form-refinement');
  hatchLeaf.position.x = 0.46;
  for (const [id, width, height, x, y] of [
    ['left', 0.08, 1.04, 0.03, 0],
    ['right', 0.08, 1.04, 0.89, 0],
    ['top', 0.94, 0.08, 0.46, 0.48],
    ['bottom', 0.94, 0.08, 0.46, -0.48],
  ]) {
    const trim = mesh(context, hatch, `hatch-${id}-trim`, box(width, height, 0.07), context.materials.trim, 'front-hatch', 'surface-pass');
    trim.position.set(x, y, 0.07);
  }
  const latch = mesh(context, hatch, 'hatch-latch', box(0.09, 0.24, 0.08), context.materials.iron, 'front-hatch', 'surface-pass');
  latch.position.set(0.78, 0, 0.08);
  addSocket(context, hatch, 'hatch-control', [0.78, 0, 0.12]);

  const ladder = addPivot(context, model, 'access-ladder');
  addBoxBeam(context, ladder, 'ladder-left-rail', [-0.35, 0, 1.52], [-0.35, 1.14, 1.0], 0.1, 0.1, context.materials.timber, 'access-ladder');
  addBoxBeam(context, ladder, 'ladder-right-rail', [0.35, 0, 1.52], [0.35, 1.14, 1.0], 0.1, 0.1, context.materials.timber, 'access-ladder');
  for (let index = 0; index < 4; index += 1) {
    const rung = mesh(context, ladder, `ladder-rung-${index + 1}`, box(0.62, 0.08, 0.09), context.materials.timber, 'access-ladder', 'structural-pass');
    const t = 0.2 + index * 0.23;
    rung.position.set(0, t * 1.14, 1.52 + t * (1.0 - 1.52));
    rung.rotation.x = -0.43;
  }

  const vents = addPivot(context, model, 'side-vents');
  for (const [index, z] of [-0.32, 0.32].entries()) {
    const vent = mesh(context, vents, `side-vent-${index + 1}`, box(0.06, 0.14, 0.48), context.materials.iron, 'side-vents', 'form-refinement');
    vent.position.set(-1.205, 1.76, z);
  }

  const chute = addPivot(context, model, 'grain-chute', [1.16, 1.3, 0.18]);
  const chuteBody = mesh(context, chute, 'chute-body', box(0.82, 0.34, 0.5), context.materials.timber, 'grain-chute', 'form-refinement');
  chuteBody.position.set(0.34, -0.12, 0);
  chuteBody.rotation.z = -0.22;
  const chuteMouth = mesh(context, chute, 'chute-mouth', box(0.16, 0.4, 0.56), context.materials.iron, 'grain-chute', 'surface-pass');
  chuteMouth.position.set(0.76, -0.22, 0);
  const lever = addPivot(context, chute, 'chute-lever', [0.48, 0.24, 0.28]);
  const leverArm = mesh(context, lever, 'chute-lever-arm', box(0.08, 0.62, 0.08), context.materials.iron, 'grain-chute', 'interaction-pass');
  leverArm.position.y = 0.27;
  leverArm.rotation.z = -0.48;
  const leverKnob = mesh(context, lever, 'chute-lever-knob', new THREE.SphereGeometry(0.1, 6, 4), context.materials.iron, 'grain-chute', 'interaction-pass');
  leverKnob.position.set(0.14, 0.56, 0);
  addChannel(context, lever, 'rotation', 'z', 0.58, 0.8, 0);
  addSocket(context, lever, 'chute-control', [0.14, 0.56, 0]);
  addCollider(context, chute, 'grain-chute', 'box', [0.42, 0.02, 0], {
    width: 1.02,
    height: 0.78,
    depth: 0.64,
    isTrigger: false,
  });

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 2.92,
    note: 'Lean stylized low-poly Granary reconstructed from the generated four-view concept sheet.',
    pierCount: 6,
    rodentGuardCount: 6,
    ventilationSlitCount: 2,
    palette: ['weathered timber', 'galvanized roof', 'warm stone', 'dark iron', 'cream hatch trim'],
    motion: 'Only the exposed grain-chute control lever rotates.',
  };
  root.userData.granaryRig = { supports, body, roof, hatch, ladder, vents, chute, lever };
  root.userData.applyPassState = (nextPassId) => applyGranaryPassState(root, nextPassId);
  applyGranaryPassState(root, passId);
  return root;
}

export function applyGranaryPassState(root, passId = 'optimization-pass') {
  const selectedPass = GRANARY_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['granary-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'granary-blockout-mat',
    color: '#a49b8f',
    roughness: 0.93,
    flatShading: true,
  });
  root.userData.passId = selectedPass;
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = selectedIndex >= (PASS_INDEX.get(node.userData.minimumPass ?? 'blockout') ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}

export function animateGranary(root, timeSeconds, intensity = 1) {
  const lever = root?.userData?.granaryRig?.lever;
  if (!lever) return root;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  lever.rotation.z = Math.sin(time * 0.8) * 0.58 * Math.max(0, intensity);
  return root;
}
