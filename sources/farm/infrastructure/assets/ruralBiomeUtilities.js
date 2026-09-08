import * as THREE from 'three';
import { addChannel, addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material = (name, color, roughness = 0.7) => new THREE.MeshStandardMaterial({ name, color, roughness, flatShading: true, vertexColors: true });
const mesh = (c, p, id, geometry, surface, group) => registerMesh(c, p, id, new THREE.Mesh(faceted(geometry, `${c.id}:${id}`), surface), group, 'structural-pass');
const box = (c, p, id, size, pos, surface, group, rotation = [0, 0, 0]) => {
  const node = mesh(c, p, id, new THREE.BoxGeometry(...size), surface, group);
  node.position.set(...pos); node.rotation.set(...rotation); return node;
};
const cyl = (c, p, id, radii, height, pos, surface, group, rotation = [0, 0, 0], segments = 8) => {
  const node = mesh(c, p, id, new THREE.CylinderGeometry(radii[0], radii[1], height, segments), surface, group);
  node.position.set(...pos); node.rotation.set(...rotation); return node;
};
const semantics = (c, p, sockets, colliders) => {
  sockets.forEach(([id, pos]) => addSocket(c, p, id, pos));
  colliders.forEach(([id, pos, size, trigger = false]) => addCollider(c, p, id, 'box', pos, { width: size[0], height: size[1], depth: size[2], isTrigger: trigger }));
};
const done = (c, identity, camera, motion = 'Static asset. No animation channels are authored.') => {
  const root = finishAsset(c);
  root.userData.artDirection = { concept: `references/concepts/${c.id}.png`, prompt: `references/prompts/${c.id}.md`, identity, motion, correctionPasses: 0 };
  root.userData.qualityContract = { suitability: 'pass', triangleBudget: 5000, optimizedDrawRange: [4, 5], criticalFeatures: identity, reviewCamera: camera };
  return root;
};

export function createUndergroundCistern() {
  const c = createAssetContext('underground-cistern', { label: 'Underground cistern' });
  const { model } = c;
  const s = {
    stone: material('underground-cistern-pale-service-slab', '#aaa497'), earth: material('underground-cistern-muted-earth-mound', '#8d8167'),
    iron: material('underground-cistern-charcoal-hatch-vent', '#353c3d', 0.46), teal: material('underground-cistern-muted-teal-pipes', '#4b7470', 0.44),
    cream: material('underground-cistern-cream-safety-markers', '#d0c6ae'),
  };
  const installation = addPivot(c, model, 'buried-water-installation');
  box(c, installation, 'rectangular-service-slab', [4.4, 0.22, 3.5], [0, 0.11, 0], s.stone, 'foundation');
  const mound = cyl(c, installation, 'low-buried-tank-mound', [1.15, 1.58], 0.72, [0, 0.58, 0], s.earth, 'mound', [0, Math.PI / 8, 0], 8);
  mound.scale.set(1.32, 1, 0.9);
  const hatch = addPivot(c, installation, 'central-access-hatch', [0, 0, 0]);
  cyl(c, hatch, 'hatch-collar', [0.72, 0.78], 0.16, [0, 1.02, 0], s.iron, 'hatch', [0, 0, 0], 12);
  cyl(c, hatch, 'bolted-hatch-lid', [0.64, 0.64], 0.12, [0, 1.16, 0], s.iron, 'hatch', [0, 0, 0], 12);
  for (let index = 0; index < 8; index += 1) {
    const a = index * Math.PI / 4;
    cyl(c, hatch, `hatch-bolt-${index + 1}`, [0.045, 0.045], 0.06, [Math.cos(a) * 0.57, 1.25, Math.sin(a) * 0.57], s.cream, 'hatch', [0, 0, 0], 6);
  }
  box(c, hatch, 'hatch-lifting-handle', [0.44, 0.08, 0.09], [0, 1.31, 0], s.cream, 'hatch');
  cyl(c, installation, 'capped-vent-stack', [0.18, 0.22], 0.78, [-0.95, 1.24, -0.45], s.iron, 'ventilation', [0, 0, 0], 8);
  cyl(c, installation, 'vent-stack-cap', [0, 0.3], 0.22, [-0.95, 1.73, -0.45], s.iron, 'ventilation', [0, 0, 0], 8);
  for (const [id, x, z] of [['inlet', -1.55, 0.85], ['outlet', 1.55, -0.85]]) {
    cyl(c, installation, `${id}-pipe-riser`, [0.13, 0.13], 0.72, [x, 0.72, z], s.teal, 'pipework', [0, 0, 0], 8);
    cyl(c, installation, `${id}-flange`, [0.22, 0.22], 0.1, [x, 0.38, z], s.teal, 'pipework', [0, 0, 0], 8);
    box(c, installation, `${id}-horizontal-mouth`, [0.48, 0.2, 0.2], [x + (x < 0 ? -0.18 : 0.18), 1.04, z], s.teal, 'pipework');
  }
  for (const x of [-1.95, 1.95]) {
    box(c, installation, `cream-safety-marker-${x}`, [0.12, 0.95, 0.12], [x, 0.69, 1.42], s.cream, 'markers');
    cyl(c, installation, `marker-cap-${x}`, [0, 0.13], 0.2, [x, 1.26, 1.42], s.cream, 'markers', [0, Math.PI / 4, 0], 4);
  }
  semantics(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['hatch', [0, 1.3, 0]], ['vent', [-0.95, 1.65, -0.45]],
    ['inlet', [-1.75, 1.05, 0.85]], ['outlet', [1.75, 1.05, -0.85]], ['service-front', [0, 0.2, 1.9]],
    ['service-rear', [0, 0.2, -1.9]], ['marker-left', [-1.95, 1.2, 1.42]], ['marker-right', [1.95, 1.2, 1.42]],
  ], [
    ['service-slab', [0, 0.11, 0], [4.4, 0.22, 3.5]], ['buried-volume', [0, 0.55, 0], [3.6, 1.1, 2.7]],
    ['hatch', [0, 1.15, 0], [1.6, 0.45, 1.6]], ['pipe-risers', [0, 0.75, 0], [4.0, 1.5, 2.7]],
    ['service-zone', [0, 1.0, 0], [4.6, 2.0, 3.8], true],
  ]);
  return done(c, ['low earth mound indicating buried storage', 'pale rectangular service slab', 'central bolted access hatch', 'capped vent stack', 'separate teal inlet and outlet risers with safety markers'], [-6, 3.8, 6]);
}

function palm(c, parent, id, pos, height, lean, frondSurface, s) {
  const tree = addPivot(c, parent, id, pos);
  const segments = 6;
  const segmentHeight = height / segments;
  const leanAngle = -Math.atan2(lean[0], height);
  for (let index = 0; index < segments; index += 1) {
    const y = 0.14 + (index + 0.5) * segmentHeight;
    const ratio = y / height;
    cyl(c, tree, `${id}-trunk-segment-${index + 1}`, [0.15 - index * 0.01, 0.23 - index * 0.012], segmentHeight * 0.96, [lean[0] * ratio, y, lean[1] * ratio], s.trunk, 'trunks', [lean[1] / height, 0, leanAngle], 6);
  }
  const crown = addPivot(c, tree, `${id}-crown`, [lean[0], height + 0.14, lean[1]]);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const frond = mesh(c, crown, `${id}-frond-${index + 1}`, new THREE.ConeGeometry(0.28, 1.65, 4), index % 3 === 0 ? s.young : frondSurface, 'fronds');
    frond.position.set(Math.cos(angle) * 0.58, -0.04, Math.sin(angle) * 0.58);
    frond.rotation.set(Math.sin(angle) * 1.05, -angle, -Math.cos(angle) * 1.05);
  }
  for (let index = 0; index < 3; index += 1) {
    const coconut = mesh(c, crown, `${id}-coconut-${index + 1}`, new THREE.IcosahedronGeometry(0.17, 0), s.coconut, 'coconuts');
    const angle = index * Math.PI * 2 / 3;
    coconut.position.set(Math.cos(angle) * 0.23, -0.28, Math.sin(angle) * 0.23);
  }
  return tree;
}

export function createCoconutGrove() {
  const c = createAssetContext('coconut-grove', { label: 'Coconut grove' });
  const { model } = c;
  const s = {
    sand: material('coconut-grove-muted-sandy-ground', '#b79a65'), trunk: material('coconut-grove-warm-segmented-trunks', '#765033'),
    frond: material('coconut-grove-deep-green-fronds', '#365a34'), young: material('coconut-grove-light-young-fronds', '#67834d'),
    coconut: material('coconut-grove-dark-coconuts', '#4a3325'),
  };
  const grove = addPivot(c, model, 'five-palm-grove-cluster');
  cyl(c, grove, 'low-sandy-ground-pad', [3.25, 3.25], 0.14, [0, 0.07, 0], s.sand, 'ground', [0, Math.PI / 12, 0], 12);
  const palms = [
    ['central-tall-palm', [0, 0, 0.35], 6.1, [0.15, -0.1]], ['left-leaning-palm', [-1.65, 0, 0.15], 5.0, [-0.65, 0.05]],
    ['right-leaning-palm', [1.65, 0, 0.15], 5.15, [0.62, -0.08]], ['young-front-palm', [-0.65, 0, 1.45], 4.25, [-0.1, 0.16]],
    ['rear-palm', [0.8, 0, -1.35], 4.75, [0.25, -0.35]],
  ];
  palms.forEach(([id, pos, height, lean], index) => palm(c, grove, id, pos, height, lean, index === 3 ? s.young : s.frond, s));
  semantics(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['palm-central', [0, 0.2, 0.35]], ['palm-left', [-1.65, 0.2, 0.15]],
    ['palm-right', [1.65, 0.2, 0.15]], ['palm-young', [-0.65, 0.2, 1.45]], ['palm-rear', [0.8, 0.2, -1.35]],
    ['harvest-central', [0.15, 6.1, 0.25]], ['harvest-left', [-2.3, 5.0, 0.2]], ['grove-centre', [0, 0.2, 0]],
  ], [
    ['central-trunk', [0.08, 3.0, 0.3], [0.65, 6.0, 0.65]], ['left-trunk', [-1.95, 2.5, 0.18], [0.8, 5.0, 0.8]],
    ['right-trunk', [1.95, 2.55, 0.12], [0.8, 5.1, 0.8]], ['young-trunk', [-0.7, 2.1, 1.5], [0.65, 4.2, 0.65]],
    ['canopy-zone', [0, 5.2, 0], [6.5, 3.0, 6.0], true],
  ]);
  return done(c, ['compact five-palm coconut grove', 'varied lean trunks between 4.25 and 6.1 metres', 'segmented warm-brown trunks', 'angular deep and light green fronds', 'small attached coconut clusters over a sandy pad'], [-10, 7.2, 10]);
}

export function createSolarPump() {
  const c = createAssetContext('solar-pump', { label: 'Solar pump' });
  const { model } = c;
  const s = {
    concrete: material('solar-pump-pale-concrete-pad', '#aca89e'), panel: material('solar-pump-muted-blue-panels', '#436b92', 0.38),
    iron: material('solar-pump-charcoal-frame-drive', '#343b3d', 0.44), teal: material('solar-pump-muted-teal-pump-pipes', '#477672', 0.42),
    cream: material('solar-pump-cream-control-cabinet', '#cbc3af'),
  };
  const station = addPivot(c, model, 'off-grid-pump-station');
  box(c, station, 'concrete-equipment-pad', [3.8, 0.24, 3.0], [0, 0.12, 0], s.concrete, 'foundation');
  for (const x of [-1.55, 1.55]) for (const z of [-0.75, 0.75]) box(c, station, `solar-frame-post-${x}-${z}`, [0.12, 2.15, 0.12], [x, 1.2, z], s.iron, 'solar-frame');
  for (const x of [-0.82, 0.82]) {
    box(c, station, `tilted-solar-panel-${x}`, [1.48, 0.09, 1.55], [x, 2.2, -0.12], s.panel, 'solar-panels', [-0.48, 0, 0]);
    box(c, station, `solar-panel-lower-rail-${x}`, [1.58, 0.11, 0.1], [x, 1.84, 0.58], s.iron, 'solar-frame', [-0.48, 0, 0]);
    box(c, station, `solar-panel-upper-rail-${x}`, [1.58, 0.11, 0.1], [x, 2.56, -0.8], s.iron, 'solar-frame', [-0.48, 0, 0]);
  }
  cyl(c, station, 'vertical-pump-cylinder', [0.34, 0.4], 1.45, [-0.55, 0.96, 0.25], s.teal, 'pump', [0, 0, 0], 10);
  cyl(c, station, 'pump-cap', [0.28, 0.4], 0.28, [-0.55, 1.82, 0.25], s.teal, 'pump', [0, 0, 0], 10);
  const drive = addPivot(c, station, 'visible-pump-flywheel', [0.02, 1.1, 0.25]);
  const wheel = mesh(c, drive, 'flywheel-rim', new THREE.TorusGeometry(0.42, 0.055, 6, 12), s.iron, 'drive');
  wheel.rotation.y = Math.PI / 2;
  for (const angle of [0, Math.PI / 2]) {
    const spoke = box(c, drive, `flywheel-spoke-${angle}`, [0.06, 0.78, 0.06], [0, 0, 0], s.iron, 'drive');
    spoke.rotation.z = angle;
  }
  cyl(c, drive, 'flywheel-shaft', [0.07, 0.07], 0.55, [0, 0, 0], s.iron, 'drive', [0, 0, Math.PI / 2], 8);
  const rod = addPivot(c, station, 'pump-drive-linkage', [0.45, 1.1, 0.25]);
  box(c, rod, 'short-reciprocating-link', [0.62, 0.08, 0.08], [0.25, 0, 0], s.iron, 'drive');
  addChannel(c, drive, 'rotation', 'x', Math.PI * 2, 0.52, 0);
  addChannel(c, rod, 'position', 'y', 0.16, 0.52, 0);
  box(c, station, 'cream-control-cabinet', [0.65, 1.45, 0.62], [1.15, 0.86, 0.35], s.cream, 'controls');
  box(c, station, 'cabinet-charcoal-latch', [0.08, 0.28, 0.1], [1.49, 0.92, 0.68], s.iron, 'controls');
  for (const [id, x, z] of [['inlet', -1.45, 0.75], ['outlet', 1.45, -0.85]]) {
    cyl(c, station, `${id}-pipe-riser`, [0.12, 0.12], 0.62, [x, 0.45, z], s.teal, 'pipework', [0, 0, 0], 8);
    box(c, station, `${id}-pipe-run`, [Math.abs(x + 0.55), 0.18, 0.18], [(x - 0.55) / 2, 0.72, z], s.teal, 'pipework');
  }
  semantics(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['pump', [-0.55, 1.0, 0.25]], ['flywheel', [0.02, 1.1, 0.25]],
    ['drive-linkage', [0.7, 1.1, 0.25]], ['inlet', [-1.45, 0.45, 0.75]], ['outlet', [1.45, 0.45, -0.85]],
    ['control', [1.15, 0.9, 0.65]], ['service-front', [0, 0.2, 1.65]], ['power', [0, 2.25, -0.2]],
  ], [
    ['pad', [0, 0.12, 0], [3.8, 0.24, 3.0]], ['solar-array', [0, 2.2, -0.1], [3.45, 1.1, 2.1]],
    ['pump-drive', [-0.2, 1.05, 0.25], [1.7, 2.1, 1.0]], ['control-cabinet', [1.15, 0.86, 0.35], [0.8, 1.72, 0.8]],
    ['service-zone', [0, 1.0, 0.75], [3.3, 2.0, 1.3], true],
  ]);
  return done(c, ['two tilted solar panels on a lean charcoal frame', 'vertical teal pump cylinder', 'visible side flywheel and short reciprocating linkage', 'separate inlet and outlet pipes', 'cream control cabinet on a concrete pad'], [-6, 4.2, 6], 'The exposed pump flywheel rotates while the short drive linkage reciprocates. Solar array, pump body, pipes, and cabinet remain fixed.');
}

export function createFishSmokehouse() {
  const c = createAssetContext('fish-smokehouse', { label: 'Fish smokehouse' });
  const { model } = c;
  const s = {
    timber: material('fish-smokehouse-warm-timber-walls', '#805839'), stone: material('fish-smokehouse-pale-foundation-firebox', '#aaa397'),
    charcoal: material('fish-smokehouse-charcoal-roof-chimney', '#343a3a', 0.46), teal: material('fish-smokehouse-muted-teal-doors-vents', '#456e6a', 0.44),
    cream: material('fish-smokehouse-cream-empty-drying-racks', '#cfc3a7'),
  };
  const building = addPivot(c, model, 'coastal-smokehouse-building');
  box(c, building, 'stone-foundation', [5.1, 0.28, 3.6], [0, 0.14, 0], s.stone, 'foundation');
  box(c, building, 'timber-smokehouse-shell', [4.7, 2.6, 3.2], [0, 1.58, 0], s.timber, 'building');
  for (const z of [-0.88, 0.88]) box(c, building, `gable-roof-panel-${z}`, [5.15, 0.15, 2.0], [0, 3.05, z], s.charcoal, 'roof', [z < 0 ? -0.35 : 0.35, 0, 0]);
  box(c, building, 'roof-ridge', [5.2, 0.14, 0.14], [0, 3.36, 0], s.charcoal, 'roof');
  for (const x of [-0.62, 0.62]) box(c, building, `wide-loading-door-${x}`, [1.12, 2.05, 0.1], [x, 1.25, 1.64], s.teal, 'doors');
  box(c, building, 'front-gable-vent', [0.78, 0.5, 0.1], [0, 2.68, 1.65], s.teal, 'ventilation');
  box(c, building, 'masonry-firebox', [1.05, 1.25, 0.85], [-2.72, 0.76, -0.7], s.stone, 'firebox');
  box(c, building, 'firebox-door', [0.1, 0.62, 0.58], [-3.27, 0.72, -0.7], s.charcoal, 'firebox');
  box(c, building, 'tall-smoke-stack', [0.58, 2.45, 0.58], [-2.6, 3.1, -0.65], s.charcoal, 'chimney');
  cyl(c, building, 'smoke-stack-cap', [0, 0.48], 0.28, [-2.6, 4.46, -0.65], s.charcoal, 'chimney', [0, Math.PI / 4, 0], 4);
  box(c, building, 'narrow-rack-canopy', [5.0, 0.14, 1.25], [0, 2.32, -2.0], s.charcoal, 'canopy', [-0.16, 0, 0]);
  for (const x of [-2.05, 0, 2.05]) box(c, building, `rack-support-post-${x}`, [0.12, 2.0, 0.12], [x, 1.15, -2.35], s.timber, 'drying-racks');
  for (const y of [0.85, 1.4]) {
    box(c, building, `empty-drying-rail-${y}`, [4.3, 0.09, 0.09], [0, y, -2.25], s.cream, 'drying-racks');
    for (const x of [-1.7, -0.85, 0, 0.85, 1.7]) box(c, building, `drying-crossbar-${y}-${x}`, [0.06, 0.06, 0.65], [x, y, -2.25], s.cream, 'drying-racks');
  }
  semantics(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['loading', [0, 0.2, 2.0]], ['firebox', [-3.25, 0.72, -0.7]],
    ['chimney', [-2.6, 4.4, -0.65]], ['rack-lower', [0, 0.85, -2.25]], ['rack-upper', [0, 1.4, -2.25]],
    ['service-rear', [0, 0.2, -2.7]], ['vent', [0, 2.68, 1.75]], ['output', [1.7, 0.9, -2.25]],
  ], [
    ['foundation', [0, 0.14, 0], [5.1, 0.28, 3.6]], ['building', [0, 1.7, 0], [4.9, 3.4, 3.4]],
    ['firebox-chimney', [-2.75, 2.1, -0.7], [1.3, 4.2, 1.1]], ['drying-racks', [0, 1.3, -2.2], [4.7, 2.6, 1.2]],
    ['loading-zone', [0, 1.1, 2.0], [2.8, 2.2, 1.0], true],
  ]);
  return done(c, ['compact timber fish smokehouse', 'pale masonry firebox and tall capped charcoal stack', 'wide teal loading doors and gable vent', 'shallow charcoal gable roof', 'two fixed empty cream drying-rack levels under a narrow canopy'], [-8, 5.5, 8]);
}

export function createWoodFiredSauna() {
  const c = createAssetContext('wood-fired-sauna', { label: 'Wood-fired sauna' });
  const { model } = c;
  const s = {
    timber: material('wood-fired-sauna-warm-timber-cladding', '#91613b'), stone: material('wood-fired-sauna-pale-foundation-stove', '#aaa397'),
    charcoal: material('wood-fired-sauna-charcoal-roof-chimney-hardware', '#343a3a', 0.46), teal: material('wood-fired-sauna-muted-teal-entry-door', '#456e6a', 0.44),
    cream: material('wood-fired-sauna-cream-bench-vent-rack', '#cfc4ac'),
  };
  const building = addPivot(c, model, 'compact-sauna-cabin');
  box(c, building, 'stone-foundation', [4.2, 0.28, 3.35], [0, 0.14, 0], s.stone, 'foundation');
  box(c, building, 'timber-cabin-shell', [3.85, 2.55, 3.0], [0, 1.55, 0], s.timber, 'building');
  for (const z of [-0.82, 0.82]) box(c, building, `pitched-roof-panel-${z}`, [4.25, 0.15, 1.85], [0, 2.96, z], s.charcoal, 'roof', [z < 0 ? -0.3 : 0.3, 0, 0]);
  box(c, building, 'roof-ridge', [4.3, 0.14, 0.14], [0, 3.24, 0], s.charcoal, 'roof');
  const door = addPivot(c, building, 'visible-hinged-entry-door', [-0.72, 0, 1.53]);
  box(c, door, 'teal-entry-door-panel', [1.22, 2.0, 0.1], [0.61, 1.18, 0], s.teal, 'door');
  for (const y of [0.55, 1.78]) box(c, door, `door-hinge-${y}`, [0.12, 0.24, 0.16], [0, y, 0.08], s.charcoal, 'door-hardware');
  addChannel(c, door, 'rotation', 'y', 0.82, 0.46, 0);
  box(c, building, 'small-high-window', [0.72, 0.42, 0.1], [1.0, 2.08, 1.53], s.charcoal, 'window');
  box(c, building, 'cream-window-frame', [0.94, 0.62, 0.08], [1.0, 2.08, 1.48], s.cream, 'window');
  box(c, building, 'exterior-stove-surround', [0.95, 1.15, 0.72], [-2.38, 0.72, -0.55], s.stone, 'stove');
  box(c, building, 'stove-access-door', [0.1, 0.58, 0.56], [-2.87, 0.7, -0.55], s.charcoal, 'stove');
  box(c, building, 'capped-chimney-stack', [0.42, 1.75, 0.42], [-1.05, 3.35, -0.55], s.charcoal, 'chimney');
  cyl(c, building, 'chimney-cap', [0, 0.36], 0.24, [-1.05, 4.34, -0.55], s.charcoal, 'chimney', [0, Math.PI / 4, 0], 4);
  box(c, building, 'short-cooling-bench', [1.65, 0.16, 0.62], [0.15, 0.46, 2.0], s.cream, 'bench');
  for (const x of [-0.55, 0.85]) box(c, building, `cooling-bench-leg-${x}`, [0.12, 0.38, 0.12], [x, 0.22, 2.0], s.cream, 'bench');
  for (const x of [1.35, 2.05]) box(c, building, `firewood-rack-post-${x}`, [0.1, 1.18, 0.1], [x, 0.67, -1.82], s.cream, 'firewood-rack');
  for (const y of [0.22, 0.58, 0.94]) box(c, building, `empty-firewood-rack-shelf-${y}`, [0.85, 0.08, 0.55], [1.7, y, -1.82], s.cream, 'firewood-rack');
  box(c, building, 'rack-shed-roof', [1.15, 0.12, 0.78], [1.7, 1.33, -1.82], s.cream, 'firewood-rack', [-0.15, 0, 0]);
  semantics(c, model, [
    ['ground', [0, 0, 0]], ['terrain', [0, 0, 0]], ['entry', [-0.1, 0.2, 1.95]], ['door-hinge', [-0.72, 1.2, 1.53]],
    ['stove', [-2.85, 0.7, -0.55]], ['chimney', [-1.05, 4.3, -0.55]], ['cooling-bench', [0.15, 0.6, 2.0]],
    ['firewood-rack', [1.7, 0.7, -1.82]], ['vent-window', [1.0, 2.1, 1.6]], ['service-side', [-2.7, 0.2, -0.55]],
  ], [
    ['foundation', [0, 0.14, 0], [4.2, 0.28, 3.35]], ['cabin', [0, 1.65, 0], [4.0, 3.3, 3.2]],
    ['stove-chimney', [-2.15, 2.1, -0.55], [1.6, 4.2, 1.0]], ['bench-rack', [0.9, 0.75, 0.05], [3.3, 1.5, 4.4]],
    ['entry-zone', [-0.1, 1.1, 2.0], [1.8, 2.2, 1.0], true],
  ]);
  return done(c, ['compact timber wood-fired sauna', 'pale stone foundation and exterior stove surround', 'charcoal pitched roof and capped chimney', 'visible teal hinged entry door and high window', 'short cooling bench and tidy empty firewood rack'], [-7, 5.3, 7], 'Only the clearly hinged front entry door swings. Cabin, stove, chimney, bench, and empty rack remain fixed.');
}

export function animateSolarPump(root, time = 0) {
  const channels = root?.userData?.sculptRuntime?.animationChannels ?? [];
  channels.forEach((channel) => { channel.node[channel.property][channel.axis] = channel.baseValue + Math.sin(time * channel.frequency + channel.phase) * channel.amplitude; });
  return root;
}

export function animateWoodFiredSauna(root, time = 0) {
  const channel = root?.userData?.sculptRuntime?.animationChannels?.[0];
  if (channel) channel.node.rotation.y = channel.baseValue + Math.sin(time * channel.frequency + channel.phase) * channel.amplitude;
  return root;
}
