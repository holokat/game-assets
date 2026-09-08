import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.7) => new THREE.MeshStandardMaterial({
  name,
  color,
  roughness,
  flatShading: true,
  vertexColors: true,
});

const mesh = (context, parent, id, geometry, surface, group) => registerMesh(
  context,
  parent,
  id,
  new THREE.Mesh(faceted(geometry, `${context.id}:${id}`), surface),
  group,
  'structural-pass',
);

const box = (context, parent, id, size, position, surface, group, rotation = [0, 0, 0]) => {
  const node = mesh(context, parent, id, new THREE.BoxGeometry(...size), surface, group);
  node.position.set(...position);
  node.rotation.set(...rotation);
  return node;
};

const semantics = (context, parent, sockets, colliders) => {
  sockets.forEach(([name, position]) => addSocket(context, parent, name, position));
  colliders.forEach(([name, position, size, isTrigger = false]) => addCollider(context, parent, name, 'box', position, {
    width: size[0],
    height: size[1],
    depth: size[2],
    isTrigger,
  }));
};

const finish = (context, identity, camera) => {
  const root = finishAsset(context);
  root.userData.artDirection = {
    concept: `references/concepts/${context.id}.png`,
    prompt: `references/prompts/${context.id}.md`,
    identity,
    motion: 'Static asset. No animation channels are authored.',
    correctionPasses: 0,
  };
  root.userData.qualityContract = {
    suitability: 'pass',
    triangleBudget: 5000,
    optimizedDrawRange: [4, 5],
    criticalFeatures: identity,
    reviewCamera: camera,
  };
  return root;
};

export function createResearchGreenhouse() {
  const context = createAssetContext('research-greenhouse', { label: 'Research greenhouse' });
  const { model } = context;
  const surfaces = {
    stone: material('research-greenhouse-pale-stone-curb', '#aaa79b'),
    frame: material('research-greenhouse-charcoal-frame', '#343d3d', 0.5),
    glazing: material('research-greenhouse-blue-green-glazing', '#6f9290', 0.42),
    cream: material('research-greenhouse-cream-airlock-benches', '#c9c1ad'),
    teal: material('research-greenhouse-muted-teal-equipment', '#3f6966', 0.48),
  };
  const facility = addPivot(context, model, 'greenhouse-structure');
  const airlock = addPivot(context, facility, 'service-airlock');

  box(context, facility, 'continuous-curb-foundation', [7.2, 0.28, 4.0], [0, 0.14, 0], surfaces.stone, 'foundation');
  for (const x of [-3.45, -2.3, -1.15, 0, 1.15, 2.3, 3.45]) {
    box(context, facility, `slim-frame-post-${x}`, [0.11, 2.45, 0.11], [x, 1.5, -1.93], surfaces.frame, 'frame');
    box(context, facility, `slim-frame-post-rear-${x}`, [0.11, 2.45, 0.11], [x, 1.5, 1.93], surfaces.frame, 'frame');
  }
  for (const z of [-1.93, 1.93]) {
    box(context, facility, `long-eave-rail-${z}`, [7.15, 0.11, 0.11], [0, 2.72, z], surfaces.frame, 'frame');
    box(context, facility, `lower-side-glazing-${z}`, [6.85, 2.15, 0.08], [0, 1.55, z], surfaces.glazing, 'glazing');
  }
  for (const x of [-3.45, 3.45]) box(context, facility, `end-glazing-${x}`, [0.08, 2.35, 3.65], [x, 1.58, 0], surfaces.glazing, 'glazing');
  for (const z of [-1.04, 1.04]) box(context, facility, `pitched-roof-panel-${z}`, [7.2, 0.11, 2.25], [0, 3.09, z], surfaces.glazing, 'glazing', [z < 0 ? -0.34 : 0.34, 0, 0]);
  box(context, facility, 'ridge-beam', [7.25, 0.13, 0.13], [0, 3.47, 0], surfaces.frame, 'frame');
  for (const x of [-1.75, 1.75]) {
    box(context, facility, `raised-research-bench-${x}`, [2.45, 0.18, 0.9], [x, 0.95, 0], surfaces.cream, 'benches');
    for (const dx of [-0.95, 0.95]) box(context, facility, `bench-leg-${x}-${dx}`, [0.12, 0.75, 0.12], [x + dx, 0.5, 0], surfaces.cream, 'benches');
  }
  for (const x of [-1.8, 1.8]) {
    box(context, facility, `roof-vent-box-${x}`, [0.78, 0.3, 0.58], [x, 3.57, 0], surfaces.frame, 'ventilation');
    box(context, facility, `roof-vent-cap-${x}`, [0.92, 0.08, 0.7], [x, 3.76, 0], surfaces.cream, 'ventilation');
  }
  box(context, airlock, 'cream-service-airlock-shell', [1.15, 2.25, 1.45], [-4.03, 1.27, 0], surfaces.cream, 'airlock');
  box(context, airlock, 'teal-airlock-door', [0.08, 1.72, 0.72], [-4.62, 1.16, 0], surfaces.teal, 'airlock');
  box(context, facility, 'teal-equipment-cabinet', [0.62, 1.45, 0.55], [2.75, 1.02, -1.58], surfaces.teal, 'equipment');

  semantics(context, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['entrance', [-4.75, 0.2, 0]],
    ['airlock', [-4.05, 1.2, 0]], ['bench-left', [-1.75, 1.05, 0]], ['bench-right', [1.75, 1.05, 0]],
    ['equipment', [2.75, 1.05, -1.6]], ['vent-left', [-1.8, 3.65, 0]], ['vent-right', [1.8, 3.65, 0]],
    ['service-rear', [0, 0.25, -2.25]],
  ], [
    ['foundation', [0, 0.14, 0], [7.2, 0.28, 4.0]], ['greenhouse', [0, 1.9, 0], [7.2, 3.8, 4.1]],
    ['airlock', [-4.03, 1.28, 0], [1.3, 2.55, 1.6]], ['equipment', [2.75, 1.0, -1.58], [0.8, 1.7, 0.8]],
    ['interior-work-zone', [0, 1.1, 0], [5.8, 2.0, 2.8], true],
  ]);
  return finish(context, [
    'long narrow modular research greenhouse', 'pale continuous curb foundation', 'slim charcoal frame and blue-green glazing',
    'cream end airlock and two fixed research benches', 'two roof vents and teal equipment cabinet',
  ], [-10, 6.5, 10]);
}

export function createGeneticsLaboratory() {
  const context = createAssetContext('genetics-laboratory', { label: 'Genetics laboratory' });
  const { model } = context;
  const surfaces = {
    wall: material('genetics-laboratory-pale-concrete-walls', '#b9b5a9'),
    charcoal: material('genetics-laboratory-charcoal-roof-hvac', '#343a3b', 0.48),
    glass: material('genetics-laboratory-dark-high-windows', '#415557', 0.38),
    teal: material('genetics-laboratory-muted-teal-controlled-access', '#426b68', 0.46),
    timber: material('genetics-laboratory-warm-emergency-cabinet', '#875d38'),
  };
  const facility = addPivot(context, model, 'secure-laboratory-shell');
  const transfer = addPivot(context, facility, 'sample-transfer-hatch');

  box(context, facility, 'clean-foundation-apron', [6.3, 0.24, 4.45], [0, 0.12, 0.08], surfaces.wall, 'foundation');
  box(context, facility, 'secure-wall-shell', [5.8, 2.65, 3.8], [0, 1.5, 0], surfaces.wall, 'shell');
  box(context, facility, 'shallow-charcoal-roof', [6.15, 0.22, 4.15], [0, 2.93, 0], surfaces.charcoal, 'roof');
  box(context, facility, 'roof-parapet-front', [6.2, 0.22, 0.14], [0, 3.05, 2.02], surfaces.charcoal, 'roof');
  box(context, facility, 'roof-parapet-rear', [6.2, 0.22, 0.14], [0, 3.05, -2.02], surfaces.charcoal, 'roof');
  for (const x of [-1.75, 0, 1.75]) {
    box(context, facility, `front-high-window-${x}`, [0.92, 0.34, 0.08], [x, 2.18, 1.94], surfaces.glass, 'windows');
  }
  for (const x of [-1.6, 1.6]) box(context, facility, `rear-high-window-${x}`, [0.9, 0.32, 0.08], [x, 2.16, -1.94], surfaces.glass, 'windows');
  box(context, facility, 'controlled-entry-door', [0.9, 1.9, 0.1], [-1.05, 1.15, 1.96], surfaces.teal, 'access');
  box(context, facility, 'entry-canopy', [1.35, 0.14, 0.72], [-1.05, 2.25, 2.22], surfaces.charcoal, 'access');
  box(context, transfer, 'teal-sample-transfer-hatch', [0.86, 0.66, 0.1], [1.25, 1.18, 1.96], surfaces.teal, 'transfer');
  box(context, transfer, 'transfer-hatch-shelf', [1.05, 0.1, 0.42], [1.25, 0.78, 2.14], surfaces.charcoal, 'transfer');
  box(context, facility, 'rear-service-alcove', [1.15, 2.0, 1.05], [2.95, 1.2, -0.75], surfaces.wall, 'service');
  box(context, facility, 'rear-service-door', [0.1, 1.62, 0.68], [3.54, 1.08, -0.75], surfaces.teal, 'service');
  box(context, facility, 'large-hvac-box', [1.05, 0.65, 0.95], [0.55, 3.37, -0.35], surfaces.charcoal, 'hvac');
  box(context, facility, 'small-hvac-box', [0.68, 0.42, 0.62], [-1.05, 3.25, -0.5], surfaces.charcoal, 'hvac');
  box(context, facility, 'external-emergency-cabinet', [0.48, 0.72, 0.22], [-2.35, 1.24, 2.06], surfaces.timber, 'emergency');

  semantics(context, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['controlled-entry', [-1.05, 0.2, 2.35]],
    ['sample-transfer', [1.25, 1.15, 2.18]], ['emergency-cabinet', [-2.35, 1.25, 2.2]], ['rear-service', [3.65, 0.2, -0.75]],
    ['hvac-large', [0.55, 3.45, -0.35]], ['hvac-small', [-1.05, 3.35, -0.5]], ['utility-left', [-2.7, 0.3, -1.8]],
    ['utility-right', [2.7, 0.3, -1.8]],
  ], [
    ['foundation', [0, 0.12, 0.08], [6.3, 0.24, 4.45]], ['laboratory', [0, 1.55, 0], [6.0, 3.1, 4.05]],
    ['service-alcove', [2.95, 1.2, -0.75], [1.25, 2.4, 1.2]], ['entry', [-1.05, 1.15, 2.0], [1.25, 2.3, 0.8]],
    ['transfer-zone', [1.25, 1.15, 2.35], [1.5, 1.6, 0.8], true],
  ]);
  return finish(context, [
    'compact secure genetics laboratory', 'pale concrete wall shell and shallow charcoal roof', 'narrow high windows',
    'teal controlled-entry door and sample-transfer hatch', 'roof HVAC, rear service alcove, and emergency cabinet',
  ], [-9, 6.2, 9]);
}

export function createSeedBreedingCenter() {
  const context = createAssetContext('seed-breeding-center', { label: 'Seed breeding center' });
  const { model } = context;
  const surfaces = {
    wall: material('seed-breeding-center-pale-masonry', '#b8b2a4'),
    roof: material('seed-breeding-center-charcoal-roof', '#343a3a', 0.48),
    teal: material('seed-breeding-center-muted-teal-secure-bays', '#426b68', 0.46),
    timber: material('seed-breeding-center-warm-fixed-counters', '#825a38'),
    cream: material('seed-breeding-center-cream-foundation-vents', '#cdc4ad'),
  };
  const facility = addPivot(context, model, 'seed-room-and-processing-canopy');
  const bays = addPivot(context, facility, 'sample-bay-bank');

  box(context, facility, 'continuous-foundation', [8.2, 0.26, 5.0], [0, 0.13, 0], surfaces.cream, 'foundation');
  box(context, facility, 'secure-seed-room', [3.05, 2.75, 4.45], [-2.35, 1.5, 0], surfaces.wall, 'seed-room');
  for (const x of [-2.35, 0.8, 3.55]) box(context, facility, `canopy-post-${x}`, [0.16, 2.55, 0.16], [x, 1.45, 2.22], surfaces.timber, 'canopy');
  for (const x of [0.8, 3.55]) box(context, facility, `rear-canopy-post-${x}`, [0.16, 2.55, 0.16], [x, 1.45, -2.22], surfaces.timber, 'canopy');
  box(context, facility, 'long-canopy-front-beam', [5.95, 0.16, 0.16], [1.05, 2.66, 2.22], surfaces.timber, 'canopy');
  box(context, facility, 'long-canopy-rear-beam', [5.95, 0.16, 0.16], [1.05, 2.66, -2.22], surfaces.timber, 'canopy');
  for (const z of [-1.22, 1.22]) box(context, facility, `shallow-gable-roof-${z}`, [8.25, 0.15, 2.7], [0, 3.08, z], surfaces.roof, 'roof', [z < 0 ? -0.22 : 0.22, 0, 0]);
  box(context, facility, 'roof-ridge', [8.35, 0.14, 0.14], [0, 3.36, 0], surfaces.roof, 'roof');
  box(context, facility, 'secure-seed-room-door', [0.92, 1.9, 0.1], [-3.15, 1.15, 2.24], surfaces.teal, 'access');
  for (const [index, x] of [-0.35, 1.15, 2.65].entries()) {
    box(context, bays, `sample-bay-shutter-${index + 1}`, [1.05, 0.82, 0.1], [x, 1.55, 2.24], surfaces.teal, 'sample-bays');
    box(context, bays, `fixed-sorting-counter-${index + 1}`, [1.25, 0.16, 0.72], [x, 0.92, 1.8], surfaces.timber, 'counters');
    for (const dx of [-0.48, 0.48]) box(context, bays, `counter-leg-${index + 1}-${dx}`, [0.12, 0.76, 0.12], [x + dx, 0.5, 1.8], surfaces.timber, 'counters');
  }
  box(context, facility, 'cream-front-vent', [0.62, 0.5, 0.18], [-2.05, 2.18, 2.28], surfaces.cream, 'ventilation');
  box(context, facility, 'cream-rear-vent-housing', [0.78, 0.68, 0.42], [-2.8, 1.25, -2.35], surfaces.cream, 'ventilation');

  semantics(context, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['seed-room-entry', [-3.15, 0.2, 2.45]],
    ['sample-bay-1', [-0.35, 1.3, 2.35]], ['sample-bay-2', [1.15, 1.3, 2.35]], ['sample-bay-3', [2.65, 1.3, 2.35]],
    ['sorting-counter', [1.15, 1.0, 1.75]], ['rear-vent', [-2.8, 1.25, -2.45]], ['canopy-center', [1.2, 2.5, 0]],
    ['service-rear', [1.2, 0.2, -2.55]],
  ], [
    ['foundation', [0, 0.13, 0], [8.2, 0.26, 5.0]], ['seed-room', [-2.35, 1.55, 0], [3.2, 3.1, 4.6]],
    ['processing-canopy', [1.25, 1.65, 0], [5.6, 3.3, 4.7]], ['counter-bank', [1.15, 0.85, 1.8], [4.5, 1.7, 1.0]],
    ['sample-service-zone', [1.15, 1.2, 2.45], [4.7, 2.0, 0.9], true],
  ]);
  return finish(context, [
    'secure seed room joined to an open trial-processing canopy', 'lean pale masonry shell and continuous cream foundation',
    'shallow charcoal gable roof', 'three teal sample-bay shutters and secure door', 'warm fixed sorting counters and slim canopy posts',
  ], [-11, 6.5, 11]);
}
