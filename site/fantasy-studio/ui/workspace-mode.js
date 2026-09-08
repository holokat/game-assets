import {createAbilityPanel} from './ability-panel.js';
import {createWorkspaceTabs} from './workspace-tabs.js';
import {characterEntries} from './catalog.js';
import {createAbilitySession, defaultAbilityForActor} from '../runtime/ability-session.js';
import {createAbilityRenderer} from '../runtime/ability-renderer.js';
import {createHealerPresentation, isHealerPreview, frameHealerPreview} from '../runtime/healer-presentation.js';
import {mountLoadout} from '../models/weapons.js';
import {previewEquipmentMode} from '../runtime/preview-equipment.js';
import {normalizeAbilityEquipment} from '../runtime/ability-equipment.js';

/**
 * Compose workspace presentation, ability ownership and the existing stage.
 * Actor/animator accessors stay live across character rebuilds. The items accessor
 * supports the editor's construction order without importing its composition root.
 *
 * @param {Object} options
 * @param {Object} options.stage
 * @param {() => Object} options.items
 * @param {() => Object|null} options.getActor
 * @param {() => Object|null} options.getAnimator
 * @param {{weapon: string, shield: string}} options.controls
 * @param {Function} options.appearance
 * @param {Function} options.dirty
 * @param {(error: Error) => void} options.report
 * @param {(value: number) => void} [options.onSpeedChange]
 */
export function createWorkspaceMode({
  stage, items, structures, world, collections, getActor, getAnimator, controls, appearance, dirty, report,
  onSpeedChange = () => {}, beforeModeChange = () => {},
}) {
  const element = id => document.getElementById(id);
  let mode = 'character';
  let revision = 0;
  let disposed = false;
  let equipmentPreferences = normalizeAbilityEquipment();

  const renderer = createAbilityRenderer(stage);
  const presentation = createHealerPresentation(stage, document.querySelector('.viewport'));
  const previousRenderFrame = stage.renderFrame;
  const renderFrame = delta => {
    if (mode === 'abilities') session.workbench?.refreshEffects();
    presentation.sync(session.workbench?.state(), mode === 'abilities');
    renderer.render(mode === 'abilities' || !!stage.enchantmentActive, delta);
  };
  stage.renderFrame = renderFrame;

  const panel = createAbilityPanel({
    async select(type, id) {
      const request = revision;
      try {
        const workbench = await session.ready();
        if (request !== revision || !session.owns(workbench)) return;
        workbench.select(type, id);
        frame();
        dirty();
      } catch (error) {
        if (request === revision && !disposed) fail(error);
      }
    },
    toggle() { session.workbench?.toggle(); dirty(); },
    replay() { session.workbench?.replay(); dirty(); },
    seek(progress) { session.workbench?.seek(progress); dirty(); },
    speed(value) {
      element('speed').value = String(value);
      const animator = getAnimator();
      if (animator) animator.speed = value;
      session.workbench?.setSpeed(value);
      onSpeedChange(value);
      dirty();
    },
    loop(value) { session.workbench?.setLoop(value); },
    equipment(value) {
      const next = normalizeAbilityEquipment(value, equipmentPreferences);
      if (session.workbench) session.workbench.setEquipment(next);
      else { equipmentPreferences = next; panel.equipment(next, getActor()?.group.userData.resolvedLoadout); }
      dirty();
    },
    effects(value) { session.workbench?.setEffects(value); dirty(); },
    frame,
  });

  const session = createAbilitySession({
    getActor,
    async buildWorkbench(actor, callbacks) {
      const {createAbilityWorkbench} = await import('../runtime/ability-workbench.js');
      if (!callbacks.isCurrent()) return null;
      return createAbilityWorkbench(stage, actor, {...callbacks, equipment: equipmentPreferences});
    },
    getPreferences: () => ({
      speed: Number(element('speed').value),
      loop: element('ability-loop').checked,
      equipment: {...equipmentPreferences},
      effects: element('ability-effects').checked,
    }),
    onBusy: panel.busy,
    onSelect: panel.select,
    onChange(state) {
      if (state.equipment) equipmentPreferences = normalizeAbilityEquipment(state.equipment);
      panel.update(state);
    },
    restoreEquipment: restore,
    appearance,
    afterStaleCleanup(actor) {
      if (disposed || actor !== getActor()) return;
      if (mode === 'items') items?.().afterRebuild();
      dirty();
    },
  });
  const tabs = createWorkspaceTabs({onSelect: setMode});
  tabs.setMode(mode);

  function restore(actor = getActor()) {
    if (!actor || actor !== getActor() || disposed) return;
    mountLoadout(actor.rig, controls.weapon, controls.shield);
    actor.previewEquipment = previewEquipmentMode(actor.group.userData.resolvedLoadout?.weapon);
    appearance();
  }

  function frame() {
    if (disposed) return;
    const workbench = session.workbench;
    const state = workbench?.state();
    const category = workbench?.motion.catalog.find(motion => motion.id === state.id)?.category;
    const wide = state?.type === 'ability' || ['Magic', 'Airborne'].includes(category);
    if (isHealerPreview(state)) { frameHealerPreview(stage); dirty(); return; }
    stage.controls.target.set(0, wide ? -4 : 0, 4.3);
    stage.camera.position.set(wide ? 20 : 13, wide ? -24 : -20, wide ? 13 : 10);
    stage.controls.maxDistance = 65;
    stage.controls.update();
    dirty();
  }

  function fail(error) {
    panel.busy(false);
    report(error);
    element('ability-description').textContent = 'The source library could not be loaded. Try opening the tab again.';
  }

  function pauseCharacter() {
    const animator = getAnimator();
    if (animator) animator.playing = false;
  }

  async function setMode(value) {
    if (disposed) return;
    beforeModeChange();
    const request = ++revision;
    items?.().exit();
    structures?.()?.exit();
    world?.()?.exit();
    collections?.()?.exit();
    mode = tabs.setMode(value);
    const url = new URL(location.href); url.searchParams.set('workspace', mode); history.replaceState(null, '', url);
    if (mode !== 'abilities') presentation.sync(null, false);
    stage.resize();
    pauseCharacter();

    if (mode === 'abilities') {
      const character = characterEntries.find(entry => entry.id === getActor()?.kind);
      if (character) tabs.showCharacter(character);
      session.activate();
      try {
        const workbench = await session.ready();
        if (request !== revision || !session.owns(workbench)) return;
        const state = workbench.state();
        if (state.time === 0 && state.id === 'idle') {
          workbench.select('ability', defaultAbilityForActor(getActor()));
        } else panel.update(state);
        frame();
      } catch (error) {
        if (request === revision && !disposed) fail(error);
      }
    } else {
      session.deactivate();
      getActor()?.rig.reset();
      restore();
      stage.view('three');
      if (mode === 'items') await items().enter();
      else if (mode === 'structures') await structures().enter();
      else if (mode === 'world' || mode === 'effects') {
        await world().enter();
        if (request !== revision || disposed) return;
        await world().setKind(mode === 'effects' ? 'effects' : 'creatures');
        document.querySelector('.living-heading h2').textContent = mode === 'effects' ? 'Visual effects' : 'Living world';
      }
      else if (mode === 'armor' || mode === 'farm') await collections().enter(mode);
      else {
        const actor = getActor();
        const entry = characterEntries.find(entry => entry.id === actor?.kind);
        if (entry) tabs.showCharacter({...entry, bodyType: actor.bodyType});
      }
    }
    if (request === revision && !disposed) dirty();
  }

  return {
    setMode,
    ready: session.ready,
    frame,
    view(value) {
      return !disposed && mode === 'abilities' && isHealerPreview(session.workbench?.state()) && frameHealerPreview(stage, value);
    },
    get mode() { return mode; },
    get workbench() { return session.workbench; },
    get active() { return !disposed && mode === 'abilities'; },
    beforeRebuild() {
      if (disposed) return;
      revision++;
      session.deactivate();
    },
    async afterRebuild() {
      if (disposed || mode !== 'abilities') return;
      const request = revision;
      session.activate();
      const workbench = await session.ready();
      if (request !== revision || !session.owns(workbench)) return;
      workbench.select('ability', defaultAbilityForActor(getActor()));
      frame();
    },
    update(delta) { if (!disposed && mode === 'abilities') session.workbench?.update(delta); },
    syncSpeed() { session.workbench?.setSpeed(Number(element('speed').value)); },
    dispose() {
      if (disposed) return;
      disposed = true;
      revision++;
      tabs.dispose();
      session.dispose();
      panel.dispose?.();
      renderer.dispose();
      presentation.dispose();
      if (stage.renderFrame === renderFrame) stage.renderFrame = previousRenderFrame;
    },
  };
}
