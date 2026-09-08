import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createItemPanel} from './item-panel.js';
import {createItemMaterialState} from './item-material-state.js';
import {createItemPreview, createItemThumbnails} from '../runtime/item-preview.js';
import {itemById, defaultItemId, resolveItemId, itemLabel, itemDetail} from '../data/item-catalog.js';
import {createItemModel} from '../models/item-model.js';
import {applyMaterialSelection, disposeItem} from '../models/item-materials.js';
import {downloadBlob} from '../runtime/export.js';

/** Coordinates item inspection and actor equipment; state and DOM rendering are separate. */
export function createItemWorkspace({
  stage, getActor, getBody, equipItem, rebuild, dirty, report,
  root = document, storage,
  createPreview = createItemPreview,
  createThumbnails = createItemThumbnails,
  createPanel = createItemPanel,
}) {
  const element = id => root.querySelector(`#${id}`);
  const materials = createItemMaterialState(storage);
  const preview = createPreview(stage, {dirty});
  const thumbnails = createThumbnails(stage);
  let id = defaultItemId;
  let active = false;
  let viewMode = 'item';
  let version = 0;
  let disposed = false;

  const panel = createPanel({
    select, equip, selection: materials.selection, material, view, exportItem, availableTargets, canEquip, root,
    thumbnail: itemId => thumbnails.get(resolveItemId(itemId), getBody()),
  });

  function selectedModel() {
    return viewMode === 'item' ? preview.model : getActor()?.group;
  }

  function availableTargets() {
    const roles = new Set();
    selectedModel()?.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible) return;
      let owner = mesh;
      while (owner && !owner.userData.itemId) owner = owner.parent;
      if (owner?.userData.itemId === id && mesh.userData.materialRole) roles.add(mesh.userData.materialRole);
    });
    return roles;
  }

  function updateHeading() {
    const item = itemById.get(id);
    element('class-title').textContent = itemLabel(item);
    element('class-subtitle').textContent = itemDetail(item);
    element('action-status').textContent = viewMode === 'item'
      ? 'Item inspection'
      : 'Character · Equipped';
    let triangles = 0;
    let parts = 0;
    selectedModel()?.traverse(object => {
      if (!object.isMesh || !object.visible) return;
      parts++;
      triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
    });
    element('geometry-count').textContent = `${triangles.toLocaleString()} triangles · ${parts} parts`;
  }

  function updateVisibility() {
    const characterVisible = !active || viewMode === 'character';
    const actor = getActor();
    if (actor) actor.group.visible = characterVisible;
    if (stage.skeletonHelper) stage.skeletonHelper.visible = characterVisible && element('skeleton').checked;
    preview.setActive(active && viewMode === 'item');
    if (active) updateHeading();
  }

  function canEquip(item) {
    return Boolean(item && ['weapon', 'shield', 'offhand', 'tool', 'jewellery'].includes(item.kind));
  }

  // Only the latest operation may commit UI feedback or report an error.
  async function present(change, {frameCharacter = false} = {}) {
    const token = ++version;
    panel.update(id, {viewMode, busy: true});
    try {
      await change();
      if (disposed || token !== version) return;
      updateVisibility();
      if (frameCharacter) stage.view('three');
      panel.update(id, {viewMode});
      dirty();
    } catch (error) {
      if (disposed || token !== version) return;
      report(error);
      panel.update(id, {viewMode});
    }
  }

  async function select(next) {
    if (disposed) return;
    next = resolveItemId(next);
    const item = itemById.get(next);
    id = next;
    if (viewMode === 'character' && !canEquip(item)) viewMode = 'item';
    const showCharacter = viewMode === 'character';
    if (showCharacter) preview.cancel?.();
    return present(() => showCharacter
      ? equipItem(next)
      : preview.show(next, {bodyType: getBody(), selection: materials.selection(next)}));
  }

  async function equip(next = id) {
    if (disposed || !canEquip(itemById.get(next))) return;
    id = next;
    viewMode = 'character';
    preview.cancel?.();
    return present(() => equipItem(next), {frameCharacter: true});
  }

  async function view(value) {
    if (disposed) return;
    if (value === 'character' && canEquip(itemById.get(id))) return equip();
    viewMode = 'item';
    return select(id);
  }

  async function material(value, channel) {
    if (disposed) return;
    const itemId = id;
    const selection = materials.set(itemId, value, channel);
    const showCharacter = viewMode === 'character';
    return present(() => showCharacter
      ? rebuild()
      : preview.show(itemId, {bodyType: getBody(), selection}));
  }

  async function exportItem(next = id) {
    if (disposed) return;
    const exportRoot = new THREE.Group();
    exportRoot.rotation.x = -Math.PI / 2;
    try {
      const model = await createItemModel(next, {selection: materials.selection(next)});
      exportRoot.add(model);
      if (disposed) return;
      const result = await new GLTFExporter().parseAsync(exportRoot, {binary: true, onlyVisible: true});
      if (disposed) return;
      downloadBlob(new Blob([result], {type: 'model/gltf-binary'}), 'model/gltf-binary', next.replace(':', '-') + '.glb');
    } catch (error) {
      if (!disposed) report(error);
    } finally {
      disposeItem(exportRoot);
    }
  }

  function applyActor(actor) {
    if (!actor) return;
    const selections = materials.snapshot();
    actor.group.traverse(mesh => {
      if (!mesh.isMesh) return;
      const itemId = mesh.userData.itemId;
      if (!itemById.has(itemId)) return;
      if (selections[itemId]) applyMaterialSelection(mesh, selections[itemId]);
    });
    for (const prop of actor.group.userData.loadout || []) {
      const itemId = prop.userData.itemId || prop.userData.canonicalId || prop.name;
      if (selections[itemId]) applyMaterialSelection(prop, selections[itemId]);
    }
  }

  function exit() {
    if (disposed) return;
    active = false;
    version++;
    preview.cancel?.();
    preview.setActive(false);
    const actor = getActor();
    if (actor) actor.group.visible = true;
    if (stage.skeletonHelper) stage.skeletonHelper.visible = element('skeleton').checked;
  }

  return {
    select, material, view, equip, applyActor, preview, panel,
    selection: materials.selection,
    equipmentMaterials: materials.equipmentMaterials,
    snapshotMaterials: materials.snapshot,
    restoreMaterials: materials.restore,
    suspendPersistence: materials.suspendPersistence,
    get id() { return id; },
    get active() { return active; },
    get viewMode() { return viewMode; },
    async enter() {
      if (disposed) return;
      active = true;
      await select(id);
    },
    exit,
    afterRebuild() {
      if (disposed) return;
      applyActor(getActor());
      if (active) {
        updateVisibility();
        panel.update(id, {viewMode});
      }
    },
    frame(view) {
      if (disposed) return;
      if (active && viewMode === 'item') preview.frame(view);
      else stage.view(view);
    },
    state() {
      return {id, viewMode, selection: materials.selection(id)};
    },
    dispose() {
      if (disposed) return;
      exit();
      disposed = true;
      panel.dispose();
      preview.dispose();
      thumbnails.dispose();
    },
  };
}
