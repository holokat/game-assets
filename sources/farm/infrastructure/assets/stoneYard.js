import * as THREE from 'three';
import {
  addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh,
} from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

export const STONE_YARD_PASSES = Object.freeze([
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
]);
const PASS_INDEX = new Map(STONE_YARD_PASSES.map((id, index) => [id, index]));

function material(name, color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading: true, vertexColors: true });
}
function makeMaterials() {
  return {
    earth: material('stone-yard-compacted-earth-mat', '#9a754d', 0.98),
    quarry: material('stone-yard-quarry-stone-mat', '#77766f', 0.96),
    dressed: material('stone-yard-dressed-stone-mat', '#aaa08c', 0.93),
    timber: material('stone-yard-weathered-timber-mat', '#765235', 0.9),
    iron: material('stone-yard-dark-iron-mat', '#35393a', 0.6, 0.5),
  };
}
const box = (width, height, depth) => new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
function mesh(context, parent, id, geometry, materialValue, group, minimumPass = 'blockout') {
  return registerMesh(context, parent, id, new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), materialValue), group, minimumPass);
}

function addRockPile(context, model, id, centerX, count, radius, rows) {
  const pile = addPivot(context, model, `aggregate-${id}-pile`);
  for (let index = 0; index < count; index += 1) {
    const column = index % rows;
    const row = Math.floor(index / rows);
    const layer = index >= rows * Math.ceil(count / rows) * 0.68 ? 1 : 0;
    const scaleX = radius * (0.82 + ((index * 7) % 5) * 0.07);
    const scaleY = radius * (0.7 + ((index * 5) % 4) * 0.08);
    const scaleZ = radius * (0.78 + ((index * 3) % 5) * 0.06);
    const rock = mesh(context, pile, `${id}-rock-${index + 1}`, new THREE.IcosahedronGeometry(1, 0), context.materials.quarry, 'aggregate-piles', 'form-refinement');
    rock.scale.set(scaleX, scaleY, scaleZ);
    rock.position.set(
      centerX + (column - (rows - 1) / 2) * radius * 1.45 + Math.sin(index * 2.1) * radius * 0.18,
      0.12 + scaleY + layer * radius * 1.25,
      -1.26 + row * radius * 1.25 - layer * radius * 0.45,
    );
    rock.rotation.set(index * 0.31, index * 0.57, index * 0.19);
  }
  addSocket(context, pile, `stockpile-${id}`, [centerX, 0.3, -1.25]);
  addCollider(context, pile, `${id}-stockpile`, 'box', [centerX, 0.42, -1.22], {
    width: 1.26, height: 0.84, depth: 1.15, isTrigger: false,
  });
  return pile;
}

export function createStoneYard(options = {}) {
  const passId = STONE_YARD_PASSES.includes(options.passId) ? options.passId : 'optimization-pass';
  const context = createAssetContext('stone-yard', { label: 'Stone Yard', targetHeightMetres: 1.25, passId });
  context.materials = makeMaterials();
  const { model } = context;

  addSocket(context, model, 'ground', [0, 0, 0]);
  addSocket(context, model, 'terrain', [0, 0.04, 0]);
  addSocket(context, model, 'loading', [0, 0.14, 1.95]);
  addSocket(context, model, 'service', [-1.8, 0.16, 1.1]);
  addSocket(context, model, 'dressed-stone', [1.55, 0.28, 0.95]);
  addSocket(context, model, 'tool-attachment', [-1.82, 0.72, 0.95]);
  addSocket(context, model, 'rear-attachment', [0, 0.5, -2.05]);
  addSocket(context, model, 'adjacency-left', [-2.5, 0.1, 0]);
  addSocket(context, model, 'adjacency-right', [2.5, 0.1, 0]);
  addSocket(context, model, 'adjacency-front', [0, 0.1, 2.22]);
  addSocket(context, model, 'adjacency-rear', [0, 0.1, -2.22]);

  const yardPad = addPivot(context, model, 'yard-pad');
  const pad = mesh(context, yardPad, 'compacted-earth-pad', box(4.8, 0.12, 4.0), context.materials.earth, 'yard-pad');
  pad.position.y = 0.06;
  addCollider(context, yardPad, 'yard-pad', 'box', [0, 0.06, 0], { width: 4.8, height: 0.12, depth: 4.0, isTrigger: false });

  const walls = addPivot(context, model, 'storage-bay-walls');
  for (const [id, width, depth, x, z] of [
    ['rear', 4.8, 0.18, 0, -1.91],
    ['left', 0.18, 3.82, -2.31, 0],
    ['right', 0.18, 3.82, 2.31, 0],
    ['divider-left', 0.18, 1.55, -0.78, -1.2],
    ['divider-right', 0.18, 1.55, 0.78, -1.2],
  ]) {
    const wall = mesh(context, walls, `${id}-bay-wall`, box(width, 0.78, depth), context.materials.dressed, 'storage-bay-walls', 'structural-pass');
    wall.position.set(x, 0.39, z);
  }
  for (const [id, x, z] of [
    ['front-left', -2.31, 1.82], ['front-right', 2.31, 1.82],
    ['rear-left', -2.31, -1.91], ['rear-right', 2.31, -1.91],
  ]) {
    const post = mesh(context, walls, `${id}-boundary-post`, box(0.26, 1.18, 0.26), context.materials.dressed, 'boundary-posts', 'structural-pass');
    post.position.set(x, 0.59, z);
    const connector = mesh(context, walls, `${id}-module-connector`, box(0.32, 0.18, 0.34), context.materials.iron, 'module-connectors', 'interaction-pass');
    connector.position.set(x, 0.09, z + (z > 0 ? 0.22 : -0.22));
  }
  addCollider(context, walls, 'bay-walls', 'box', [0, 0.4, -1.52], { width: 4.8, height: 0.8, depth: 0.96, isTrigger: false });

  const coarse = addRockPile(context, model, 'coarse', -1.55, 9, 0.29, 3);
  const medium = addRockPile(context, model, 'medium', 0, 16, 0.2, 4);
  const small = addRockPile(context, model, 'small', 1.55, 25, 0.125, 5);

  const blocks = addPivot(context, model, 'dressed-block-stacks');
  for (const [stackIndex, z] of [0.62, 1.25].entries()) {
    const skid = mesh(context, blocks, `stack-${stackIndex + 1}-skid`, box(1.28, 0.12, 0.52), context.materials.timber, 'timber-skids', 'structural-pass');
    skid.position.set(1.5, 0.18, z);
    for (let index = 0; index < 6; index += 1) {
      const column = index % 3;
      const layer = Math.floor(index / 3);
      const block = mesh(context, blocks, `stack-${stackIndex + 1}-block-${index + 1}`, box(0.36, 0.28, 0.42), context.materials.dressed, 'dressed-blocks', 'form-refinement');
      block.position.set(1.12 + column * 0.39, 0.38 + layer * 0.29, z);
    }
  }
  addCollider(context, blocks, 'dressed-block-stacks', 'box', [1.5, 0.48, 0.94], { width: 1.34, height: 0.76, depth: 1.25, isTrigger: false });

  const tools = addPivot(context, model, 'tool-rack');
  for (const x of [-1.98, -1.56]) {
    const post = mesh(context, tools, `tool-rack-post-${x}`, box(0.1, 0.9, 0.1), context.materials.timber, 'tool-rack', 'structural-pass');
    post.position.set(x, 0.57, 1.18);
  }
  const crossbar = mesh(context, tools, 'tool-rack-crossbar', box(0.58, 0.1, 0.12), context.materials.timber, 'tool-rack', 'structural-pass');
  crossbar.position.set(-1.77, 0.92, 1.18);
  const shovelShaft = mesh(context, tools, 'shovel-shaft', box(0.055, 0.78, 0.055), context.materials.iron, 'tool-rack', 'surface-pass');
  shovelShaft.position.set(-1.88, 0.57, 1.1);
  const shovelBlade = mesh(context, tools, 'shovel-blade', new THREE.CylinderGeometry(0.11, 0.18, 0.27, 4), context.materials.iron, 'tool-rack', 'surface-pass');
  shovelBlade.position.set(-1.88, 0.2, 1.1);
  const pryBar = mesh(context, tools, 'pry-bar', box(0.055, 0.78, 0.055), context.materials.iron, 'tool-rack', 'surface-pass');
  pryBar.position.set(-1.65, 0.58, 1.1);

  const root = finishAsset(context);
  root.userData.artDirection = {
    heightMetres: 1.18,
    note: 'Lean stylized low-poly Stone Yard reconstructed from the generated four-view concept sheet.',
    aggregateBayCount: 3,
    dressedBlockStackCount: 2,
    palette: ['compacted earth', 'quarry stone', 'dressed stone', 'weathered timber', 'dark iron'],
    motion: 'Static storage module. No crane, hoist, conveyor, dust, or material simulation is authored.',
  };
  root.userData.stoneYardRig = { yardPad, walls, coarse, medium, small, blocks, tools };
  root.userData.applyPassState = (nextPassId) => applyStoneYardPassState(root, nextPassId);
  applyStoneYardPassState(root, passId);
  return root;
}

export function applyStoneYardPassState(root, passId = 'optimization-pass') {
  const selectedPass = STONE_YARD_PASSES.includes(passId) ? passId : 'optimization-pass';
  const selectedIndex = PASS_INDEX.get(selectedPass);
  const runtime = root.userData.sculptRuntime;
  const blockoutMaterial = runtime.nodes['stone-yard-root'].userData.blockoutMaterial ??= new THREE.MeshStandardMaterial({
    name: 'stone-yard-blockout-mat', color: '#a49b8f', roughness: 0.94, flatShading: true,
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
