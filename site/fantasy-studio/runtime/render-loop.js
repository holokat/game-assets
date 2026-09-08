/** One cancellable frame owner. Inspection controls and actor/workspace objects are injected. */
export function createRenderLoop({stage, getActor, getAnimator, workspace, items, structures, world, enchantments, preview, blocked,
  requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id)}) {
  let dirty = true;
  let running = false;
  let frameId;
  let previousTime;

  function frame(time) {
    if (!running) return;
    frameId = requestFrame(frame);
    const dt = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    const actor = getActor();
    if (!actor || blocked() || stage.capturing) return;
    const animator = getAnimator();
    const moved = stage.controls.update();
    const playing = workspace.active ? !!workspace.workbench?.state().playing : animator.playing;
    if (workspace.active) workspace.update(dt);
    else animator.update(dt);
    const structureMoving = structures?.active ? structures.update(dt) : false;
    const worldMoving = world?.active ? world.update(dt) : false;
    if (preview.turn && !structures?.active && !world?.active) {
      const target = items.active && items.viewMode === 'item' ? items.preview.root : actor.group;
      target.rotation.z += dt * 0.4 * preview.speed;
    }
    const enchantmentMoving = enchantments?.update(dt);
    if (dirty || moved || playing || preview.turn || structureMoving || worldMoving || enchantmentMoving) {
      stage.renderFrame(dt);
      dirty = false;
    }
  }

  return {
    invalidate() { dirty = true; },
    start() {
      if (running) return;
      running = true;
      previousTime = undefined;
      frameId = requestFrame(frame);
    },
    dispose() {
      running = false;
      cancelFrame(frameId);
      previousTime = undefined;
    },
  };
}
