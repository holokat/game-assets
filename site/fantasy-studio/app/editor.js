import * as THREE from 'three';
import {createStage} from '../runtime/stage.js';
import {createCharacter, disposeCharacter} from '../models/character.js';
import {Animator, motions} from '../runtime/animation.js';
import {mountLoadout, weapons, shields} from '../models/weapons.js';
import {twoHandedProfiles} from '../models/two-handed-profiles.js';
import {captureSheet} from '../runtime/capture.js';
import {prepareAppearance, updateAppearance, tintEquipment} from '../ui/appearance.js';
import {createWorkspaceMode} from '../ui/workspace-mode.js';
import {createItemWorkspace} from '../ui/item-workspace.js';
import {mountLivingMarkup} from '../ui/living-markup.js';
import {createLivingWorkspace} from '../ui/living-workspace.js';
import {createStructureWorkspace} from '../ui/structure-workspace.js';
import {createCharacterCustomization} from '../ui/character-customization.js';
import {createEditorPanel} from '../ui/editor-panel.js';
import {createExportPanel} from '../ui/export-panel.js';
import {itemById} from '../data/item-catalog.js';
import {createEditorState} from './editor-state.js';
import {createCharacterSession} from './character-session.js';
import {createEditorReports} from './editor-reports.js';
import {createRenderLoop} from '../runtime/render-loop.js';
import {mountCollectionMarkup} from '../ui/collection-markup.js';
import {createCollectionWorkspace} from '../ui/collection-workspace.js';
import {createEditorEnchantments} from './enchantments.js';

/**
 * Application composition root. Connects component contracts and owns public commands.
 * Components receive narrow getters/actions; none import this module or window.studio.
 */
export function createEditor({root = document, params = new URLSearchParams(location.search), stage = createStage(root.querySelector('#scene'))} = {}) {
  const removeLivingMarkup = mountLivingMarkup(root);
  const removeCollectionMarkup = mountCollectionMarkup(root);
  const state = createEditorState({params, weapons, shields});
  const actors = new Map();
  let session, workspace, items, structures, world, collections, customization, enchantments, loop;
  let buildFailed = false;
  let disposed = false;
  let startPromise;
  const getActor = () => session?.current?.actor;
  const getAnimator = () => session?.current?.animator;
  const dirty = () => loop?.invalidate();
  const reports = createEditorReports({getStatus: () => ({
    ready: !!getActor() && !session.loading,
    class: getActor()?.kind,
    bodyType: getActor()?.bodyType,
  })});
  reports.watchShaders(stage.renderer);
  const panel = createEditorPanel({root, report: reports.record, actions: {
    selectClass, selectOccupation, setHandheld, setMotion, setSpeed, setView,
    togglePreview, togglePlayback, reset, setInspection,
    setPalette(value) { state.setPalette(value); applyAppearance(); },
    setColor(channel, value) { state.setColor(channel, value); applyAppearance(); },
  }});
  panel.speed(state.preview.speed);
  for (const name of ['wireframe', 'skeleton', 'grid', 'turn']) panel.inspection(name, state.preview[name]);

  session = createCharacterSession({
    create: buildCharacterBundle,
    dispose: disposeCharacterBundle,
    beforeBuild: () => {enchantments?.deactivate(); workspace.beforeRebuild();},
    commit(bundle, input, options) {
      actors.clear();
      actors.set(bundle.actor.kind, bundle.actor);
      stage.scene.add(bundle.actor.group, bundle.helper);
      stage.skeletonHelper = bundle.helper;
      mountLoadout(bundle.actor.rig, state.controls.weapon, state.controls.shield);
      applyAppearance();
      state.preview.motion = 'reference';
      panel.character(bundle.actor, {...input, controls: state.controls});
      stage.characterHeight = new THREE.Box3().setFromObject(bundle.actor.group).max.z;
      stage.characterFaceHeight = bundle.actor.group.userData.characterStyle === 'chibi' ? 5.58 : 7.25;
      if (!options.preserveCamera) setView('three');
      panel.stats(bundle.actor);
      customization.refresh();
      dirty();
    },
    async afterCommit() { await workspace.afterRebuild(); items.afterRebuild(); structures.afterRebuild(); world.afterRebuild(); collections.afterRebuild(); },
    busy(value) {
      if (value) buildFailed = false;
      panel.loading(value);
      if (!value && buildFailed) panel.buildError();
      dirty();
    },
    failed(error) { buildFailed = true; reports.record(error); },
  });
  workspace = createWorkspaceMode({stage, items: () => items, structures: () => structures, world: () => world, collections: () => collections, getActor, getAnimator,
    controls: state.controls, dirty, report: reports.record,
    appearance() { applyAppearance(); if (getActor()) panel.stats(getActor()); },
    onSpeedChange(value) { state.setSpeed(value); },
    beforeModeChange() { enchantments?.deactivate(); },
  });
  items = createItemWorkspace({stage, root, getActor, getBody: () => state.bodyType,
    equipItem, rebuild, dirty, report: reports.record,
  });
  structures = createStructureWorkspace({stage, root, getActor, dirty, report: reports.record});
  world = createLivingWorkspace({stage, root, getActor, dirty, report: reports.record});
  collections = createCollectionWorkspace({stage, root, getActor, dirty, report: reports.record});
  root.getElementById('open-spell-effects').onclick = () => workspace.setMode('abilities');
  customization = createCharacterCustomization({stage, root, getActor,
    getEquipment: () => state.equipment,
    rebuild, dirty,
  });
  enchantments = createEditorEnchantments({root,stage,getActor,getAnimator,workspace,items,dirty,report:reports.record});
  const files = createExportPanel({root, stage, getActor, dirty, report: reports.record,
    getImageName: () => collections.active ? collections.id.replaceAll(':', '-') : world.active ? world.id : structures.active ? structures.id : null});
  const api = {
    stage, actors, workspace, items, structures, world, collections, customization, enchantments, state,
    colors: state.colors, controls: state.controls, errors: reports.errors,
    testing: false,
    get equipment() { return state.equipment; },
    get actor() { return getActor(); },
    get animator() { return getAnimator(); },
    get loading() { return session.loading; },
    selectClass, selectOccupation, equipItem, setMotion, rebuild, applyAppearance,
    postReport: reports.postReport,
    captureSheet: iteration => captureSheet(stage, [getActor()], iteration, null, getActor().bodyType),
    setView,
    start() {
      if (disposed) throw new Error('Editor is disposed');
      if (!startPromise) { loop.start(); startPromise = rebuild().then(async result => {
        const mode = params.get('workspace');
        if (mode) await workspace.setMode(mode);
        return result;
      }); }
      return startPromise;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      loop.dispose();
      enchantments.dispose();
      files.dispose();
      panel.dispose();
      customization.dispose();
      workspace.dispose();
      items.dispose();
      structures.dispose();
      world.dispose();
      collections.dispose();
      removeCollectionMarkup();
      removeLivingMarkup();
      session.dispose();
      actors.clear();
      stage.skeletonHelper = null;
      reports.dispose();
      stage.dispose();
    },
  };
  loop = createRenderLoop({stage, getActor, getAnimator, workspace, items, structures, world, enchantments,
    preview: state.preview, blocked: () => session.loading || api.testing,
  });
  stage.setInvalidate?.(dirty);
  return api;

  async function buildCharacterBundle(input) {
    let actor, helper;
    try {
      actor = await createCharacter(input.kind, input.options);
      prepareAppearance(actor);
      const animator = new Animator(actor.rig);
      animator.speed = state.preview.speed;
      animator.set('reference');
      helper = new THREE.SkeletonHelper(actor.group);
      helper.visible = state.preview.skeleton;
      return {actor, animator, helper};
    } catch (error) {
      if (helper) disposeHelper(helper);
      if (actor) disposeCharacter(actor);
      throw error;
    }
  }
  function disposeHelper(helper) {
    helper.removeFromParent();
    helper.geometry.dispose();
    for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) material.dispose();
  }
  function disposeCharacterBundle(bundle) { disposeHelper(bundle.helper); disposeCharacter(bundle.actor); }
  async function rebuild(options = {}) {
    const input = state.snapshot();
    input.options = {bodyType: input.bodyType, equipment: input.equipment, customization: customization.options()};
    const result = await session.rebuild(input, options);
    await reports.postReport();
    return result?.actor;
  }
  async function selectClass(kind) { state.selectClass(kind); return rebuild(); }
  async function selectOccupation(kind) { state.selectOccupation(kind); return rebuild(); }
  function refreshLoadout() {
    const actor = getActor();
    if (!actor) return;
    mountLoadout(actor.rig, state.controls.weapon, state.controls.shield);
    applyAppearance();
    panel.loadout(state.controls, actor.group.userData.resolvedLoadout);
    panel.stats(actor);
    dirty();
  }
  function setHandheld(slot, value) {
    const profile=twoHandedProfiles[getActor()?.group.userData.resolvedLoadout?.weapon];
    if(slot==='shield'&&!['none','default'].includes(value)&&profile&&profile.kind!=='staff')state.setHandheld('weapon','none');
    state.setHandheld(slot, value); refreshLoadout();
  }
  async function equipItem(id) {
    const item = itemById.get(id);
    if (!item) throw new Error(`Unknown item: ${id}`);
    else if (['weapon', 'tool'].includes(item.kind)) setHandheld('weapon', id);
    else if (['shield', 'offhand', 'jewellery'].includes(item.kind)) setHandheld('shield', id);
    else throw new Error(`Item cannot be equipped: ${id}`);
  }
  function applyAppearance() {
    const actor = getActor();
    if (!actor) return;
    updateAppearance(actor, {palette: state.controls.palette, wireframe: state.preview.wireframe});
    tintEquipment(actor.group, state.colors);
    items?.applyActor(actor);
    customization?.apply();
    panel.palette(state.controls.palette);
    dirty();
  }
  function setMotion(id) {
    if (!motions.some(([value]) => value === id)) throw new Error(`Unknown preview motion: ${id}`);
    const animator = getAnimator();
    if (!animator) return;
    state.preview.motion = id;
    animator.set(id);
    animator.speed = state.preview.speed;
    panel.motion(id, animator.playing);
    dirty();
  }
  function setSpeed(value) {
    state.setSpeed(value);
    if (getAnimator()) getAnimator().speed = value;
    panel.speed(value);
    workspace.syncSpeed();
    dirty();
  }
  function togglePreview() {
    const animator = getAnimator();
    if (!animator) return;
    if (!animator.duration) setMotion('idle');
    else animator.playing = !animator.playing;
    panel.motion(animator.motion, animator.playing);
    dirty();
  }
  function togglePlayback() {
    if (workspace.active) { workspace.workbench?.toggle(); dirty(); }
    else if (world?.active) { world.toggle(); dirty(); }
    else togglePreview();
  }
  function setView(view) {
    if (!['front', 'side', 'back', 'three', 'face', 'top'].includes(view)) throw new Error(`Unknown camera view: ${view}`);
    if (collections?.active) collections.frame(view);
    else if (world?.active) world.frame(view);
    else if (structures?.active) structures.frame(view);
    else if (items?.active) items.frame(view);
    else if (!workspace.view(view)) stage.view(view);
    panel.view(view);
    dirty();
  }
  function setInspection(name, value) {
    if (!['wireframe', 'skeleton', 'grid', 'turn'].includes(name)) throw new Error(`Unknown inspection option: ${name}`);
    state.preview[name] = value;
    panel.inspection(name, value);
    if (name === 'wireframe') applyAppearance();
    if (name === 'skeleton' && stage.skeletonHelper) stage.skeletonHelper.visible = value && !(items.active && items.viewMode === 'item');
    if (name === 'grid') stage.grid.visible = value;
    dirty();
  }
  async function reset() { setInspection('turn', false); setInspection('wireframe', false); return selectClass(state.kind); }
}
