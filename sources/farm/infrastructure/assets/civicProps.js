import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const mat = (name, color, roughness = 0.7) => new THREE.MeshStandardMaterial({
  name, color, roughness, flatShading: true, vertexColors: true,
});
const mesh = (c, p, id, geometry, surface, group) => registerMesh(c, p, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), surface), group, 'structural-pass');
const box = (c, p, id, size, pos, surface, group, rotation = [0, 0, 0]) => {
  const n = mesh(c, p, id, new THREE.BoxGeometry(...size), surface, group);
  n.position.set(...pos); n.rotation.set(...rotation); return n;
};
const cyl = (c, p, id, radii, height, pos, surface, group, rotation = [0, 0, 0], segments = 8) => {
  const n = mesh(c, p, id, new THREE.CylinderGeometry(radii[0], radii[1], height, segments), surface, group);
  n.position.set(...pos); n.rotation.set(...rotation); return n;
};
const semantic = (c, p, sockets, colliders) => {
  sockets.forEach(([id, pos]) => addSocket(c, p, id, pos));
  colliders.forEach(([id, pos, size, trigger = false]) => addCollider(c, p, id, 'box', pos, {
    width: size[0], height: size[1], depth: size[2], isTrigger: trigger,
  }));
};
const finish = (c, identity, camera, motion = 'Static asset. No animation channels are authored.') => {
  const root = finishAsset(c);
  root.userData.artDirection = {
    concept: `references/concepts/${c.id}.png`, prompt: `references/prompts/${c.id}.md`, identity, motion, correctionPasses: 0,
  };
  root.userData.qualityContract = { suitability: 'pass', triangleBudget: 5000, optimizedDrawRange: [4, 5], criticalFeatures: identity, reviewCamera: camera };
  return root;
};

export function createGates() {
  const c = createAssetContext('gates', { label: 'Gates' });
  const { model } = c;
  const s = {
    stone: mat('gates-pale-stone-feet', '#a9a294'), timber: mat('gates-warm-timber-leaves', '#815a39'),
    iron: mat('gates-charcoal-hinges-rails', '#343a3a', 0.48), teal: mat('gates-muted-teal-latch', '#426c69', 0.46),
    cream: mat('gates-cream-post-caps', '#cec5af'),
  };
  const frame = addPivot(c, model, 'paired-gateway-frame');
  for (const x of [-1.8, 1.8]) {
    box(c, frame, `stone-foot-${x}`, [0.5, 0.28, 0.58], [x, 0.14, 0], s.stone, 'foundation');
    box(c, frame, `slim-timber-post-${x}`, [0.24, 2.0, 0.24], [x, 1.22, 0], s.timber, 'posts');
    cyl(c, frame, `cream-post-cap-${x}`, [0, 0.25], 0.28, [x, 2.36, 0], s.cream, 'caps', [0, Math.PI / 4, 0], 4);
  }
  const left = addPivot(c, frame, 'left-hinged-leaf', [-1.66, 0, 0]);
  const right = addPivot(c, frame, 'right-hinged-leaf', [1.66, 0, 0]);
  for (const [leaf, direction, name] of [[left, 1, 'left'], [right, -1, 'right']]) {
    for (const y of [0.55, 1.15, 1.72]) box(c, leaf, `${name}-horizontal-rail-${y}`, [1.52, 0.13, 0.14], [direction * 0.76, y, 0], s.timber, 'gate-leaves');
    for (const offset of [0.16, 0.52, 0.88, 1.24, 1.4]) box(c, leaf, `${name}-vertical-slat-${offset}`, [0.18, 1.38, 0.1], [direction * offset, 1.14, 0], s.timber, 'gate-leaves');
    const brace = box(c, leaf, `${name}-diagonal-brace`, [1.48, 0.1, 0.12], [direction * 0.76, 1.14, 0.02], s.timber, 'gate-leaves');
    brace.rotation.z = direction * 0.66;
    for (const y of [0.63, 1.57]) box(c, leaf, `${name}-strap-hinge-${y}`, [0.66, 0.09, 0.18], [direction * 0.3, y, 0.09], s.iron, 'hardware');
  }
  box(c, left, 'centre-latch-bar', [0.65, 0.09, 0.14], [1.48, 1.08, 0.14], s.teal, 'latch');
  box(c, right, 'centre-latch-keeper', [0.16, 0.34, 0.16], [-1.48, 1.08, 0.14], s.teal, 'latch');
  addChannel(c, left, 'rotation', 'y', 0.88, 0.42, 0);
  addChannel(c, right, 'rotation', 'y', -0.88, 0.42, 0);
  semantic(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['passage', [0, 0.2, 0]], ['hinge-left', [-1.66, 1.1, 0]],
    ['hinge-right', [1.66, 1.1, 0]], ['latch', [0, 1.08, 0.2]], ['approach-front', [0, 0.1, 1.2]],
    ['approach-rear', [0, 0.1, -1.2]], ['adjacency-left', [-2.15, 0.2, 0]], ['adjacency-right', [2.15, 0.2, 0]],
  ], [
    ['post-left', [-1.8, 1.2, 0], [0.55, 2.4, 0.65]], ['post-right', [1.8, 1.2, 0], [0.55, 2.4, 0.65]],
    ['left-leaf', [-0.9, 1.15, 0], [1.6, 1.55, 0.28]], ['right-leaf', [0.9, 1.15, 0], [1.6, 1.55, 0.28]],
    ['passage', [0, 1.0, 0], [3.15, 2.0, 1.2], true],
  ]);
  return finish(c, ['paired human-scale swing gates', 'two slim timber posts on stone feet', 'two independently hinged slatted leaves', 'charcoal strap hinges', 'muted teal centre latch'], [-5.5, 3.4, 5.5], 'Both timber leaves swing from visible side hinges. Posts and latch keeper remain fixed.');
}

function lanternHead(c, parent, id, position, scale, s) {
  const head = addPivot(c, parent, `${id}-housing`, position);
  cyl(c, head, `${id}-lower-ring`, [0.28 * scale, 0.28 * scale], 0.1 * scale, [0, 0, 0], s.iron, 'housings', [0, 0, 0], 6);
  cyl(c, head, `${id}-glass`, [0.23 * scale, 0.2 * scale], 0.45 * scale, [0, 0.27 * scale, 0], s.glass, 'glazing', [0, 0, 0], 6);
  cyl(c, head, `${id}-upper-ring`, [0.28 * scale, 0.28 * scale], 0.09 * scale, [0, 0.52 * scale, 0], s.iron, 'housings', [0, 0, 0], 6);
  cyl(c, head, `${id}-brass-roof`, [0.05 * scale, 0.35 * scale], 0.25 * scale, [0, 0.69 * scale, 0], s.brass, 'caps', [0, 0, 0], 6);
  cyl(c, head, `${id}-finial`, [0, 0.08 * scale], 0.18 * scale, [0, 0.91 * scale, 0], s.brass, 'caps', [0, 0, 0], 4);
  return head;
}

export function createLanterns() {
  const c = createAssetContext('lanterns', { label: 'Lanterns' });
  const { model } = c;
  const s = {
    iron: mat('lanterns-charcoal-iron-frames', '#343a3c', 0.44), glass: mat('lanterns-muted-teal-glass', '#648f8c', 0.38),
    brass: mat('lanterns-warm-brass-caps', '#a77e3d', 0.42), stone: mat('lanterns-pale-stone-bases', '#aaa398'),
  };
  const family = addPivot(c, model, 'matching-lantern-family');
  cyl(c, family, 'tall-stone-base', [0.38, 0.46], 0.22, [-1.45, 0.11, 0], s.stone, 'bases', [0, Math.PI / 8, 0], 8);
  cyl(c, family, 'tall-tapered-post', [0.09, 0.18], 1.55, [-1.45, 0.97, 0], s.iron, 'posts', [0, 0, 0], 6);
  lanternHead(c, family, 'tall-lantern', [-1.45, 1.73, 0], 0.92, s);
  cyl(c, family, 'bollard-stone-base', [0.32, 0.39], 0.2, [0.15, 0.1, 0], s.stone, 'bases', [0, Math.PI / 8, 0], 8);
  cyl(c, family, 'bollard-post', [0.08, 0.14], 0.62, [0.15, 0.49, 0], s.iron, 'posts', [0, 0, 0], 6);
  lanternHead(c, family, 'bollard-lantern', [0.15, 0.78, 0], 0.72, s);
  box(c, family, 'wall-mounting-plate', [0.18, 0.62, 0.5], [1.75, 1.14, 0], s.iron, 'wall-fixture');
  box(c, family, 'wall-hook-horizontal', [0.7, 0.1, 0.1], [2.02, 1.42, 0], s.iron, 'wall-fixture');
  box(c, family, 'wall-hook-drop', [0.1, 0.42, 0.1], [2.33, 1.23, 0], s.iron, 'wall-fixture');
  lanternHead(c, family, 'wall-lantern', [2.33, 0.72, 0], 0.72, s);
  semantic(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['tall-light', [-1.45, 2.2, 0]], ['bollard-light', [0.15, 1.15, 0]],
    ['wall-light', [2.33, 1.05, 0]], ['wall-mount', [1.85, 1.15, 0]], ['power-tall', [-1.45, 0.2, 0]],
    ['power-bollard', [0.15, 0.2, 0]], ['power-wall', [1.75, 1.0, 0]], ['set-centre', [0.25, 0.2, 0]],
  ], [
    ['tall-fixture', [-1.45, 1.2, 0], [0.9, 2.4, 0.9]], ['bollard-fixture', [0.15, 0.65, 0], [0.8, 1.3, 0.8]],
    ['wall-fixture', [2.05, 1.05, 0], [1.0, 1.25, 0.75]], ['tall-light-zone', [-1.45, 2.2, 0], [2.5, 1.2, 2.5], true],
    ['bollard-light-zone', [0.15, 1.2, 0], [1.8, 0.8, 1.8], true],
  ]);
  return finish(c, ['three matching lantern fixtures', 'tall path lantern', 'short bollard lantern', 'compact wall-mounted lantern', 'repeated hexagonal teal-glass housings with brass caps'], [-5.2, 3.8, 5.2]);
}

function bench(c, parent, id, origin, width, back, s) {
  const unit = addPivot(c, parent, id, origin);
  for (const z of [-0.23, 0, 0.23]) box(c, unit, `${id}-seat-slat-${z}`, [width, 0.09, 0.18], [0, 0.5, z], s.timber, 'slats');
  for (const x of [-width * 0.39, width * 0.39]) {
    box(c, unit, `${id}-stone-foot-${x}`, [0.28, 0.12, 0.32], [x, 0.06, 0], s.stone, 'feet');
    const leg = box(c, unit, `${id}-iron-leg-${x}`, [0.12, 0.48, 0.12], [x, 0.3, 0], s.iron, 'supports');
    leg.rotation.z = x < 0 ? -0.16 : 0.16;
  }
  for (const x of [-width / 2 - 0.05, width / 2 + 0.05]) box(c, unit, `${id}-teal-end-${x}`, [0.12, 0.22, 0.68], [x, 0.54, 0], s.teal, 'ends');
  if (back) {
    for (const y of [0.78, 1.01, 1.24]) box(c, unit, `${id}-back-slat-${y}`, [width, 0.14, 0.08], [0, y, -0.31], s.timber, 'slats');
    for (const x of [-width / 2 - 0.05, width / 2 + 0.05]) box(c, unit, `${id}-back-end-${x}`, [0.12, 0.9, 0.12], [x, 0.92, -0.31], s.teal, 'ends');
  }
  for (const x of [-width * 0.42, width * 0.42]) cyl(c, unit, `${id}-cream-fastener-${x}`, [0.035, 0.035], 0.04, [x, 0.6, 0.35], s.cream, 'fasteners', [Math.PI / 2, 0, 0], 6);
  return unit;
}

export function createBenches() {
  const c = createAssetContext('benches', { label: 'Benches' });
  const { model } = c;
  const s = {
    timber: mat('benches-warm-timber-slats', '#a67342'), iron: mat('benches-charcoal-supports', '#353d3f', 0.48),
    stone: mat('benches-pale-stone-feet', '#aaa398'), teal: mat('benches-muted-teal-end-plates', '#527b78', 0.46),
    cream: mat('benches-cream-fastener-caps', '#d0c7b2'),
  };
  const family = addPivot(c, model, 'matching-bench-family');
  bench(c, family, 'standard-backrest-bench', [-1.45, 0, -0.65], 2.6, true, s);
  bench(c, family, 'long-backless-bench', [1.25, 0, 0.7], 2.4, false, s);
  bench(c, family, 'short-two-seat-bench', [-1.15, 0, 1.15], 1.45, true, s);
  semantic(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['seat-standard', [-1.45, 0.58, -0.65]], ['seat-backless', [1.25, 0.58, 0.7]],
    ['seat-short', [-1.15, 0.58, 1.15]], ['approach-standard', [-1.45, 0.1, 0]], ['approach-backless', [1.25, 0.1, 1.35]],
    ['approach-short', [-1.15, 0.1, 1.75]], ['set-centre', [0, 0.1, 0.3]], ['path-edge', [0, 0.1, -1.4]],
  ], [
    ['standard-bench', [-1.45, 0.67, -0.65], [2.95, 1.35, 0.85]], ['backless-bench', [1.25, 0.35, 0.7], [2.75, 0.7, 0.85]],
    ['short-bench', [-1.15, 0.67, 1.15], [1.8, 1.35, 0.85]], ['standard-seat-zone', [-1.45, 0.95, -0.35], [2.5, 1.0, 1.0], true],
    ['backless-seat-zone', [1.25, 0.85, 0.7], [2.4, 0.85, 1.2], true],
  ]);
  return finish(c, ['family of three public benches', 'standard bench with backrest', 'long backless bench', 'short two-seat bench', 'lean timber slats on charcoal supports and stone feet'], [-6, 3.4, 6]);
}

function flower(c, parent, id, pos, bloom, s) {
  cyl(c, parent, `${id}-stem`, [0.035, 0.045], 0.34, [pos[0], pos[1] + 0.17, pos[2]], s.foliage, 'plants', [0, 0, 0], 5);
  for (const angle of [-0.7, 0.7]) {
    const leaf = cyl(c, parent, `${id}-leaf-${angle}`, [0, 0.12], 0.3, [pos[0] + Math.sin(angle) * 0.1, pos[1] + 0.2, pos[2]], s.foliage, 'plants', [0, 0, angle], 4);
    leaf.scale.z = 0.45;
  }
  const head = mesh(c, parent, `${id}-bloom`, new THREE.OctahedronGeometry(0.14, 0), bloom, 'blooms');
  head.position.set(pos[0], pos[1] + 0.43, pos[2]);
}

export function createFlowerBeds() {
  const c = createAssetContext('flower-beds', { label: 'Flower beds' });
  const { model } = c;
  const s = {
    stone: mat('flower-beds-pale-stone-edging', '#b4aa97'), soil: mat('flower-beds-dark-soil', '#514234'),
    foliage: mat('flower-beds-muted-green-foliage', '#526b49'), cream: mat('flower-beds-cream-blooms', '#d5c9a9'),
    coral: mat('flower-beds-muted-coral-blooms', '#bb6c57'),
  };
  const family = addPivot(c, model, 'modular-raised-bed-family');
  box(c, family, 'long-bed-soil', [4.0, 0.2, 0.9], [0, 0.28, -1.15], s.soil, 'soil');
  for (const z of [-1.68, -0.62]) box(c, family, `long-bed-side-${z}`, [4.35, 0.45, 0.18], [0, 0.23, z], s.stone, 'edging');
  for (const x of [-2.08, 2.08]) box(c, family, `long-bed-end-${x}`, [0.18, 0.45, 1.25], [x, 0.23, -1.15], s.stone, 'edging');
  box(c, family, 'square-bed-soil', [1.45, 0.2, 1.45], [-1.3, 0.28, 1.15], s.soil, 'soil');
  for (const z of [0.32, 1.98]) box(c, family, `square-bed-side-${z}`, [1.82, 0.45, 0.18], [-1.3, 0.23, z], s.stone, 'edging');
  for (const x of [-2.13, -0.47]) box(c, family, `square-bed-end-${x}`, [0.18, 0.45, 1.82], [x, 0.23, 1.15], s.stone, 'edging');
  cyl(c, family, 'round-bed-stone-wall', [1.0, 1.0], 0.42, [1.45, 0.21, 1.15], s.stone, 'edging', [0, Math.PI / 8, 0], 12);
  cyl(c, family, 'round-bed-soil', [0.78, 0.78], 0.08, [1.45, 0.46, 1.15], s.soil, 'soil', [0, 0, 0], 12);
  const flowers = [
    [-1.65, 0.38, -1.15], [-1.1, 0.38, -1.15], [-0.55, 0.38, -1.15], [0, 0.38, -1.15], [0.55, 0.38, -1.15], [1.1, 0.38, -1.15], [1.65, 0.38, -1.15],
    [-1.65, 0.38, 0.82], [-0.95, 0.38, 0.82], [-1.3, 0.38, 1.48], [1.18, 0.5, 1.0], [1.72, 0.5, 1.0], [1.45, 0.5, 1.48],
  ];
  flowers.forEach((pos, index) => flower(c, family, `flower-${index + 1}`, pos, index % 3 === 0 ? s.coral : s.cream, s));
  semantic(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['long-bed', [0, 0.35, -1.15]], ['square-bed', [-1.3, 0.35, 1.15]],
    ['round-bed', [1.45, 0.35, 1.15]], ['water-long', [0, 0.72, -1.15]], ['water-square', [-1.3, 0.72, 1.15]],
    ['water-round', [1.45, 0.72, 1.15]], ['path-front', [0, 0.1, -2]], ['set-centre', [0, 0.1, 0]],
  ], [
    ['long-bed', [0, 0.35, -1.15], [4.4, 0.7, 1.3]], ['square-bed', [-1.3, 0.35, 1.15], [1.9, 0.7, 1.9]],
    ['round-bed', [1.45, 0.35, 1.15], [2.1, 0.7, 2.1]], ['long-plant-zone', [0, 0.8, -1.15], [4.0, 1.1, 0.9], true],
    ['civic-plant-zone', [0.2, 0.8, 1.15], [3.8, 1.1, 1.8], true],
  ]);
  return finish(c, ['three modular raised flower beds', 'long rectangular bed', 'square corner bed', 'round civic planter', 'pale stone edging with sparse cream and coral flowers'], [-6, 3.8, 6]);
}

export function createFountain() {
  const c = createAssetContext('fountain', { label: 'Fountain' });
  const { model } = c;
  const s = {
    stone: mat('fountain-pale-stone-basin-pedestal', '#ada89b'), cream: mat('fountain-cream-trim', '#d0c7b2'),
    water: mat('fountain-solid-blue-green-water', '#527f7c', 0.32), iron: mat('fountain-charcoal-pipe-valve', '#343b3c', 0.44),
    teal: mat('fountain-muted-teal-spout-accents', '#426d6a', 0.42),
  };
  const fountain = addPivot(c, model, 'octagonal-civic-fountain');
  cyl(c, fountain, 'octagonal-basin-base', [1.72, 1.82], 0.36, [0, 0.18, 0], s.stone, 'basin', [0, Math.PI / 8, 0], 8);
  cyl(c, fountain, 'octagonal-basin-upper', [1.68, 1.55], 0.32, [0, 0.43, 0], s.stone, 'basin', [0, Math.PI / 8, 0], 8);
  const rim = mesh(c, fountain, 'cream-basin-rim', new THREE.TorusGeometry(1.62, 0.11, 4, 8), s.cream, 'trim');
  rim.position.y = 0.62; rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI / 8;
  cyl(c, fountain, 'solid-water-surface', [1.47, 1.47], 0.06, [0, 0.58, 0], s.water, 'water', [0, 0, 0], 8);
  cyl(c, fountain, 'pedestal-lower-step', [0.72, 0.82], 0.28, [0, 0.73, 0], s.stone, 'pedestal', [0, Math.PI / 8, 0], 8);
  cyl(c, fountain, 'central-pedestal', [0.46, 0.54], 1.18, [0, 1.43, 0], s.stone, 'pedestal', [0, Math.PI / 8, 0], 8);
  cyl(c, fountain, 'pedestal-cream-collar', [0.58, 0.58], 0.14, [0, 2.05, 0], s.cream, 'trim', [0, Math.PI / 8, 0], 8);
  cyl(c, fountain, 'pedestal-cap', [0, 0.48], 0.3, [0, 2.27, 0], s.stone, 'pedestal', [0, Math.PI / 8, 0], 8);
  const spouts = [[0, 0, 1, 0], [0, 0, -1, Math.PI], [1, 0, 0, Math.PI / 2], [-1, 0, 0, -Math.PI / 2]];
  spouts.forEach(([dx, , dz, angle], index) => {
    cyl(c, fountain, `spout-hub-${index + 1}`, [0.16, 0.16], 0.18, [dx * 0.5, 1.6, dz * 0.5], s.iron, 'spouts', [Math.PI / 2, 0, angle], 8);
    const pipe = box(c, fountain, `short-fixed-spout-${index + 1}`, [0.16, 0.16, 0.52], [dx * 0.72, 1.55, dz * 0.72], s.teal, 'spouts');
    pipe.rotation.y = angle;
    pipe.rotation.x = 0.22;
  });
  const valve = addPivot(c, fountain, 'rear-service-valve', [0, 1.27, -0.58]);
  const wheel = mesh(c, valve, 'charcoal-valve-wheel', new THREE.TorusGeometry(0.24, 0.035, 5, 10), s.iron, 'valve');
  wheel.rotation.y = Math.PI / 2;
  for (const a of [0, Math.PI / 2]) {
    const spoke = box(c, valve, `valve-spoke-${a}`, [0.05, 0.46, 0.05], [0, 0, 0], s.iron, 'valve');
    spoke.rotation.z = a;
  }
  addChannel(c, valve, 'rotation', 'z', 1.25, 0.55, 0);
  semantic(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['water', [0, 0.62, 0]], ['pedestal', [0, 1.45, 0]],
    ['spout-front', [0, 1.55, 0.85]], ['spout-rear', [0, 1.55, -0.85]], ['spout-left', [-0.85, 1.55, 0]],
    ['spout-right', [0.85, 1.55, 0]], ['service-valve', [0, 1.27, -0.82]], ['drain', [0, 0.45, -1.55]],
  ], [
    ['basin', [0, 0.35, 0], [3.65, 0.7, 3.65]], ['pedestal', [0, 1.45, 0], [1.1, 2.3, 1.1]],
    ['valve', [0, 1.27, -0.7], [0.65, 0.65, 0.5]], ['water-surface', [0, 0.65, 0], [3.0, 0.3, 3.0], true],
    ['service-zone', [0, 1.0, -1.25], [1.3, 1.5, 1.2], true],
  ]);
  return finish(c, ['compact octagonal civic fountain', 'shallow pale stone basin with solid blue-green water', 'central stepped pedestal', 'four short fixed spouts', 'exposed rear service valve'], [-5.3, 3.7, 5.3], 'Only the exposed rear service valve rotates. Basin, water surface, pedestal, and spouts remain fixed.');
}

export function animateGates(root, time = 0) {
  const channels = root?.userData?.sculptRuntime?.animationChannels ?? [];
  channels.forEach((channel) => { channel.node[channel.property][channel.axis] = Math.sin(time * channel.frequency + channel.phase) * channel.amplitude; });
  return root;
}

export function animateFountain(root, time = 0) {
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (channel) channel.node.rotation.z = Math.sin(time * channel.frequency + channel.phase) * channel.amplitude;
  return root;
}
