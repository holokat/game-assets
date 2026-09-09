import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStructurePresentation} from '../runtime/structure-presentation.js';
import {createCollectionPanel} from './collection-panel.js';
import {bindPropMotion} from '../../collections/farm/haven-meadow/runtime/motion.js';

function disposeModel(model) {
  if (!model) return;
  model.removeFromParent();
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) materials.add(material);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
}

/** Shared read-only viewer for the published armor and farm GLBs. */
export function createCollectionWorkspace({stage, root = document, getActor, dirty, report}) {
  const el = id => root.getElementById(id), loader = new GLTFLoader();
  const presentation = createStructurePresentation(stage, {dirty});
  let catalog, catalogPromise, kind = 'armor', entry, variant = 0, model, active = false, disposed = false, revision = 0, wire = false;
  const remembered = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animateModel = null;
  const panel = createCollectionPanel({root, onSelect: select, onVariant: index => select(entry.id, index),
    onWireframe(value) { wire = value; applyWireframe(); }, onFrame: () => presentation.frame(), onRetry: () => enter(kind)});
  async function loadCatalog() {
    catalogPromise ??= fetch('/collections/catalog.json').then(r => { if (!r.ok) throw new Error(`Catalog HTTP ${r.status}`); return r.json(); }).then(data => catalog = data.entries).catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }
  function applyWireframe() {
    model?.traverse(node => { for (const material of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) material.wireframe = wire; }); dirty();
  }
  function visibility() {
    if (getActor()) getActor().group.visible = !active;
    if (stage.skeletonHelper) stage.skeletonHelper.visible = !active && el('skeleton').checked;
    presentation.setActive(active);
  }
  async function select(id, index = 0) {
    const nextEntry = catalog.find(e => e.id === id && e.collection === kind);
    if (!nextEntry || !nextEntry.variants[index] || disposed) return;
    const token = ++revision; entry = nextEntry; variant = index; remembered.set(kind, {id, index});
    panel.inspect(entry, variant); panel.status('Loading model…');
    animateModel = null; presentation.setModel(null); disposeModel(model); model = null;
    el('class-title').textContent = entry.name; el('class-subtitle').textContent = entry.category;
    el('geometry-count').textContent = ''; el('action-status').textContent = 'Loading asset';
    try {
      const gltf = await loader.loadAsync(entry.variants[index].path);
      if (disposed || token !== revision || !active) { disposeModel(gltf.scene); return; }
      const wrapper = new THREE.Group(); wrapper.add(gltf.scene);
      const bounds = new THREE.Box3().setFromObject(gltf.scene), center = bounds.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
      model = wrapper; animateModel = bindPropMotion(model); presentation.setModel(model); applyWireframe();
      let triangles = 0, draws = 0;
      model.traverse(node => { if (node.isMesh) { triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3; draws++; node.castShadow = true; node.receiveShadow = true; } });
      el('geometry-count').textContent = `${Math.round(triangles).toLocaleString()} triangles · ${draws} meshes`;
      el('action-status').textContent = 'Original GLB · MIT license';
      el('scene').setAttribute('aria-label', `Interactive 3D asset: ${entry.name}`);
      panel.status('Ready to download.'); dirty();
    } catch (error) {
      if (token === revision && !disposed) { report(error); panel.status('Preview could not load. Retry or download the GLB directly.', true); }
    }
  }
  async function enter(value) {
    active = true; kind = value; const token = ++revision; visibility();
    panel.status('Loading catalog…');
    try {
      await loadCatalog(); if (disposed || token !== revision || !active) return;
      const rows = catalog.filter(e => e.collection === kind); panel.setCollection(kind, rows);
      const saved = remembered.get(kind);
      const requested = new URLSearchParams(location.search).get('asset');
      const linked = !saved && rows.find(row => row.id === requested);
      if (linked) {
        el('collection-filter').value = linked.category;
        el('collection-filter').dispatchEvent(new Event('change'));
      }
      await select(saved?.id || linked?.id || rows[0].id, saved?.index || 0);
    } catch (error) { if (token === revision && !disposed) { report(error); panel.status('The catalog could not load. Retry to reload it.', true); } }
  }
  return {enter, select, panel, presentation, get active() { return active; }, get id() { return entry?.id; }, get model() { return model; },
    frame: view => presentation.frame(view),
    update(delta) {
      if (!active || !animateModel || reducedMotion.matches) return false;
      animateModel(delta); return true;
    },
    exit() { revision++; active = false; visibility(); }, afterRebuild() { if (active) visibility(); },
    state: () => ({kind, id: entry?.id, variant, active}),
    dispose() { disposed = true; revision++; active = false; animateModel = null; visibility(); presentation.dispose(); disposeModel(model); panel.dispose(); },
  };
}
