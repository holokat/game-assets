import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  addCollider,
  addPivot,
  addSocket,
  createAssetContext,
  finishAsset,
  registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const IRRIGATION_DITCH_PASSES = Object.freeze([
  'blockout',
  'structural-pass',
  'form-refinement',
  'material-pass',
  'surface-pass',
  'lighting-pass',
  'interaction-pass',
  'optimization-pass',
]);
const PASS_INDEX = new Map(IRRIGATION_DITCH_PASSES.map((id, index) => [id, index]));

function materials() {
  const make = (name, color, roughness) => new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    flatShading: true,
    vertexColors: true,
  });
  return {
    earth: make('irrigation-ditch-earth-mat', '#956a38', 0.9),
    channel: make('irrigation-ditch-channel-mat', '#80592f', 0.94),
    stone: make('irrigation-ditch-stone-mat', '#777263', 0.86),
  };
}

function mesh(context, parent, id, geometry, material, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), material), group, minimumPass);
}

function bankGeometry(side, length) {
  const shape = new THREE.Shape();
  if (side === 'left') {
    shape.moveTo(-0.82, 0);
    shape.lineTo(-0.32, 0);
    shape.lineTo(-0.32, 0.08);
    shape.lineTo(-0.82, 0.4);
  } else {
    shape.moveTo(0.32, 0);
    shape.lineTo(0.82, 0);
    shape.lineTo(0.82, 0.4);
    shape.lineTo(0.32, 0.08);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, steps: 1, bevelEnabled: false });
  geometry.translate(0, 0, -length / 2);
  return geometry;
}

export function createIrrigationDitch(options = {}) {
  const passId = IRRIGATION_DITCH_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('irrigation-ditch', { label: 'Irrigation Ditch', targetLengthMetres: 3.2, passId });
  context.materials = materials();
  const { model } = context;
  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'flow-input', [0, 0.1, -1.62]);
  addSocket(context, model, 'flow-output', [0, 0.1, 1.62]);
  addSocket(context, model, 'left-terrain-seam', [-0.82, 0.02, 0]);
  addSocket(context, model, 'right-terrain-seam', [0.82, 0.02, 0]);

  const earthworks = addPivot(context, model, 'earthworks', [0, 0, 0]);
  mesh(context, earthworks, 'left-bank', bankGeometry('left', 3.2), context.materials.earth, 'earthworks');
  mesh(context, earthworks, 'right-bank', bankGeometry('right', 3.2), context.materials.earth, 'earthworks');
  const floor = mesh(context, earthworks, 'channel-floor', new RoundedBoxGeometry(0.68, 0.06, 3.2, 1, 0.02), context.materials.channel, 'channel-floor');
  floor.position.y = 0.03;
  addCollider(context, earthworks, 'left-bank', 'trapezoid-prism', [-0.57, 0.2, 0], { width: 0.5, height: 0.4, depth: 3.2, isTrigger: false });
  addCollider(context, earthworks, 'right-bank', 'trapezoid-prism', [0.57, 0.2, 0], { width: 0.5, height: 0.4, depth: 3.2, isTrigger: false });
  addCollider(context, earthworks, 'channel-floor', 'box', [0, 0.03, 0], { width: 0.68, height: 0.06, depth: 3.2, isTrigger: false });

  const masonry = addPivot(context, model, 'masonry-edge', [0, 0, 0]);
  const blockCount = 12;
  for (const [side, x] of [['left', -0.84], ['right', 0.84]]) {
    for (let index = 0; index < blockCount; index += 1) {
      const z = -1.42 + index * (2.84 / (blockCount - 1));
      const block = mesh(context, masonry, `${side}-edge-block-${index + 1}`, new RoundedBoxGeometry(0.2, 0.18, 0.24, 1, 0.025), context.materials.stone, 'masonry-edge', 'structural-pass');
      block.position.set(x, 0.09, z);
    }
  }
  for (const [end, z] of [['input', -1.54], ['output', 1.54]]) {
    for (const [side, x] of [['left', -0.82], ['right', 0.82]]) {
      const pillar = mesh(context, masonry, `${end}-${side}-corner`, new RoundedBoxGeometry(0.25, 0.5, 0.25, 1, 0.035), context.materials.stone, 'masonry-edge', 'form-refinement');
      pillar.position.set(x, 0.25, z);
    }
  }

  const root = finishAsset(context);
  root.userData.artDirection = {
    note: 'Static modular terrain prop inferred from the supplied four-view concept sheet.',
    palette: ['warm earth', 'compacted channel floor', 'weathered edge stone'],
    animationPolicy: 'No action channel. The concept shows no moving mechanism; flow direction is expressed by named sockets.',
  };
  root.userData.applyPassState = (nextPassId) => applyIrrigationDitchPassState(root, nextPassId);
  applyIrrigationDitchPassState(root, passId);
  return root;
}

export function applyIrrigationDitchPassState(root, passId = 'optimization-pass') {
  const selectedPass = IRRIGATION_DITCH_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['irrigation-ditch-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'irrigation-ditch-blockout-mat',
    color: '#b6aaa0',
    roughness: 0.9,
    flatShading: true,
  });
  root.userData.passId = selectedPass;
  root.traverse((node) => {
    if (!node.isMesh) return;
    const minimumPass = node.userData.minimumPass ?? 'blockout';
    node.visible = selectedIndex >= (PASS_INDEX.get(minimumPass) ?? 0);
    node.userData.authoredMaterial ??= node.material;
    node.material = selectedIndex < PASS_INDEX.get('material-pass') ? blockoutMaterial : node.userData.authoredMaterial;
  });
  return root;
}
