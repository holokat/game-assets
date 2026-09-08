/** The existing opening ability for each character class. */
const OPENING_ABILITIES = Object.freeze({
  mage: 'fireball', sorcerer: 'hex', necromancer: 'life-drain', healer: 'heal',
  paladin: 'consecrate-weapon', rogue: 'backstab', bard: 'provoke', artisan: 'snare',
  blank: 'jump', ranger: 'aimed-shot', warrior: 'power-strike',
});

export function defaultAbilityForActor(actor) {
  return Object.hasOwn(OPENING_ABILITIES, actor?.kind) ? OPENING_ABILITIES[actor.kind] : 'power-strike';
}

/**
 * @typedef {Object} AbilityPreferences
 * @property {number} speed
 * @property {boolean} loop
 * @property {boolean|{mode:string,weapon:string,shield:string}} equipment
 * @property {boolean} effects
 */

/**
 * Owns one actor's lazy ability workbench without reading the DOM.
 *
 * buildWorkbench(actor, callbacks) returns a workbench or null. It may check
 * callbacks.isCurrent() before expensive work, but completion is always checked
 * here too. Existing source builders cannot abort while loading their assets.
 * Stale results resolve to null; current failures reject and remain retryable.
 * All callbacks are gated by the request's actor, generation and active state.
 *
 * @param {Object} options
 * @param {() => Object|null} options.getActor
 * @param {(actor: Object, callbacks: Object) => Promise<Object|null>} options.buildWorkbench
 * @param {() => AbilityPreferences} options.getPreferences
 * @param {(busy: boolean) => void} [options.onBusy]
 * @param {Function} [options.onSelect]
 * @param {Function} [options.onChange]
 * @param {(actor: Object) => void} [options.restoreEquipment]
 * @param {(actor: Object) => void} [options.appearance]
 * @param {(actor: Object) => void} [options.afterStaleCleanup]
 */
export function createAbilitySession({
  getActor, buildWorkbench, getPreferences, onBusy = () => {},
  onSelect = () => {}, onChange = () => {}, restoreEquipment = () => {},
  appearance = () => {}, afterStaleCleanup = () => {},
}) {
  let active = false;
  let disposed = false;
  let generation = 0;
  let owned = null;
  let pending = null;

  function matchesContext(request) {
    return !disposed && active && request.generation === generation && request.actor === getActor();
  }

  function isCurrent(request) {
    return matchesContext(request) && !request.cancelled && (pending === request || owned?.request === request);
  }

  function currentWorkbench() {
    return owned && isCurrent(owned.request) ? owned.workbench : null;
  }

  function invalidate() {
    if (disposed) return;
    generation++;
    const previous = owned;
    owned = null;
    pending = null;
    // Invalidate callbacks before disposal can emit any final state changes.
    previous?.workbench.dispose({restoreActor: previous.actor === getActor()});
    onBusy(false);
  }

  function recoverActor(actor) {
    // Source-motion disposal resets its captured rig even with restoreActor:false.
    // Reapply the surviving preview only when both workbenches share that rig.
    if (disposed || actor !== getActor()) return;
    const workbench = currentWorkbench();
    if (workbench && owned.actor === actor) {
      const state = workbench.state();
      workbench.setEquipment(state.equipment??state.autoEquipment);
      workbench.seek(state.progress);
      if (state.playing) workbench.toggle();
    }
    afterStaleCleanup(actor);
  }

  function discard(workbench, actor) {
    if (!workbench) return;
    workbench.dispose({restoreActor: false});
    recoverActor(actor);
  }

  function ready() {
    if (disposed || !active || !getActor()) return Promise.resolve(null);
    const current = currentWorkbench();
    if (current) return Promise.resolve(current);
    // Actor identity is checked independently of explicit rebuild notifications.
    if (owned || (pending && !isCurrent(pending))) invalidate();
    if (pending) return pending.promise;

    const request = {actor: getActor(), generation, promise: null, cancelled: false};
    const guard = callback => (...args) => {
      if (isCurrent(request)) return callback(...args);
    };
    const callbacks = {
      isCurrent: () => isCurrent(request),
      restoreEquipment: guard(() => restoreEquipment(request.actor)),
      appearance: guard(() => appearance(request.actor)),
      select: guard(onSelect),
      change: guard(onChange),
    };

    pending = request;
    onBusy(true);
    request.promise = (async () => {
      let workbench = null;
      try {
        workbench = await buildWorkbench(request.actor, callbacks);
        if (!isCurrent(request)) {
          discard(workbench, request.actor);
          return null;
        }
        if (!workbench) return null;
        // Preference setters can emit callbacks, so ownership precedes setup.
        owned = {request, actor: request.actor, workbench};
        const preferences = getPreferences();
        workbench.setSpeed(preferences.speed);
        workbench.setLoop(preferences.loop);
        workbench.setEquipment(preferences.equipment);
        workbench.setEffects(preferences.effects);
        return workbench;
      } catch (error) {
        const currentFailure = isCurrent(request);
        request.cancelled = true;
        if (owned?.workbench === workbench) owned = null;
        // The builder disposes partial construction; completed workbenches are ours.
        if (workbench) discard(workbench, request.actor);
        else recoverActor(request.actor);
        if (currentFailure) throw error;
        return null;
      } finally {
        if (pending === request) {
          pending = null;
          if (matchesContext(request)) onBusy(false);
        }
      }
    })();
    return request.promise;
  }

  return {
    ready,
    activate() { if (!disposed) active = true; },
    deactivate() { if (!disposed) { active = false; invalidate(); } },
    invalidate,
    owns(workbench) { return !!workbench && workbench === currentWorkbench(); },
    get workbench() { return currentWorkbench(); },
    get active() { return active && !disposed; },
    dispose() {
      if (disposed) return;
      active = false;
      invalidate();
      disposed = true;
    },
  };
}
