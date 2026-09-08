import { prepareInteractionRecipe } from './interactionRecipes.js';

const EPSILON = 1e-6;

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function findSourceSemantics(root) {
  let semantics = root.userData?.sourceSemantics ?? null;
  if (semantics) return semantics;
  root.traverse((node) => {
    if (!semantics && node.userData?.sourceSemantics) semantics = node.userData.sourceSemantics;
  });
  return semantics;
}

function findAssetId(root, fallback) {
  if (fallback) return fallback;
  let assetId = root.userData?.assetId ?? null;
  root.traverse((node) => {
    if (!assetId && node.userData?.assetId) assetId = node.userData.assetId;
  });
  return assetId;
}

function prepareChannelTracks(root, suppliedChannels) {
  const channels = suppliedChannels ?? findSourceSemantics(root)?.animationChannels ?? [];
  return channels.map((channel) => {
    const node = root.getObjectByName(channel.node);
    if (!node) throw new Error(`Interaction channel node is missing: ${channel.node}`);
    const target = node[channel.property];
    if (!target || !Number.isFinite(target[channel.axis])) {
      throw new Error(`Invalid interaction channel target: ${channel.node}.${channel.property}.${channel.axis}`);
    }
    return {
      node,
      target,
      property: channel.property,
      axis: channel.axis,
      baseValue: target[channel.axis],
      amplitude: Number.isFinite(channel.amplitude) ? channel.amplitude : 0,
      frequency: Number.isFinite(channel.frequency) ? channel.frequency : 1,
      phase: Number.isFinite(channel.phase) ? channel.phase : 0,
    };
  });
}

function collectColliders(root) {
  const colliders = [];
  root.traverse((node) => {
    if (node.userData?.collider) colliders.push(node);
  });
  return colliders;
}

export class AssetInteractionController {
  constructor(root, options = {}) {
    if (!root?.traverse) throw new Error('AssetInteractionController requires a Three.js Object3D root.');
    this.root = root;
    this.assetId = findAssetId(root, options.assetId);
    this.progress = clamp01(options.initialProgress ?? 0);
    this.targetProgress = this.progress;
    this.duration = Math.max(0.05, options.duration ?? 0.85);
    this.speed = 1;
    this.isActive = false;
    this.isDisposed = false;
    this.mode = 'stopped';
    this.loopTime = 0;
    this.loopSpeed = 1;
    this.easing = options.easing ?? smoothstep;
    this.onActiveChange = options.onActiveChange ?? null;
    this.onStable = options.onStable ?? null;
    this.setColliderEnabled = options.setColliderEnabled ?? ((node, enabled) => {
      node.userData.interactionCollisionEnabled = enabled;
    });
    this.recipe = options.recipe ?? prepareInteractionRecipe(this.assetId, root);
    this.tracks = this.recipe ? [] : prepareChannelTracks(root, options.actionChannels);
    this.colliders = collectColliders(root);
    this.actionId = options.actionId ?? this.recipe?.id ?? (this.tracks.length ? 'primary-action' : 'static');
    this.hasAction = Boolean(this.recipe || this.tracks.length);
    this.#apply(this.progress, false);
    this.#setCollisionState(true);
  }

  deploy(options = {}) {
    this.#assertUsable();
    if (!this.hasAction) return this;
    this.duration = Math.max(0.05, options.duration ?? this.duration);
    this.speed = Math.max(EPSILON, options.speed ?? 1);
    this.targetProgress = 1;
    this.mode = 'target';
    this.#setActive(Math.abs(this.targetProgress - this.progress) > EPSILON);
    return this;
  }

  retract(options = {}) {
    this.#assertUsable();
    if (!this.hasAction) return this;
    this.duration = Math.max(0.05, options.duration ?? this.duration);
    this.speed = Math.max(EPSILON, options.speed ?? 1);
    this.targetProgress = 0;
    this.mode = 'target';
    this.#setActive(Math.abs(this.targetProgress - this.progress) > EPSILON);
    return this;
  }

  play(options = {}) {
    this.#assertUsable();
    if (!this.hasAction) return this;
    this.loopSpeed = Math.max(EPSILON, options.speed ?? 1);
    this.loopTime = Number.isFinite(options.startTime) ? options.startTime : this.loopTime;
    this.mode = 'loop';
    this.#setActive(true);
    return this;
  }

  setProgress(value) {
    this.#assertUsable();
    this.progress = clamp01(value);
    this.targetProgress = this.progress;
    this.mode = 'stopped';
    this.#setActive(false);
    this.#apply(this.progress, false);
    this.#setCollisionState(true);
    this.onStable?.(this.progress, this);
    return this;
  }

  cancel() {
    if (this.isDisposed) return this;
    this.targetProgress = this.progress;
    this.mode = 'stopped';
    this.#setActive(false);
    this.#setCollisionState(true);
    this.onStable?.(this.progress, this);
    return this;
  }

  update(dt) {
    if (this.isDisposed || !this.isActive || !this.hasAction) return false;
    const deltaSeconds = Math.max(0, Number.isFinite(dt) ? dt : 0);
    if (this.mode === 'loop') {
      this.loopTime += deltaSeconds * this.loopSpeed;
      const loopProgress = 0.5 - 0.5 * Math.cos(this.loopTime * Math.PI * 2);
      this.progress = loopProgress;
      this.#apply(loopProgress, true);
      return true;
    }

    const direction = Math.sign(this.targetProgress - this.progress);
    const step = deltaSeconds * this.speed / this.duration;
    this.progress = clamp01(this.progress + direction * step);
    const reachedTarget = Math.abs(this.targetProgress - this.progress) <= EPSILON;
    if (reachedTarget) this.progress = this.targetProgress;
    this.#apply(this.progress, true);
    if (reachedTarget) {
      this.mode = 'stopped';
      this.#setActive(false);
      this.#setCollisionState(true);
      this.onStable?.(this.progress, this);
      return false;
    }
    return true;
  }

  dispose() {
    if (this.isDisposed) return;
    this.#setActive(false);
    this.isDisposed = true;
    this.mode = 'stopped';
    this.recipe = null;
    this.tracks.length = 0;
    this.colliders.length = 0;
    this.root = null;
    this.onActiveChange = null;
    this.onStable = null;
    this.setColliderEnabled = null;
  }

  #apply(progress, moving) {
    const eased = this.easing(clamp01(progress));
    if (this.recipe) {
      this.recipe.apply(eased);
    } else {
      for (let index = 0; index < this.tracks.length; index += 1) {
        const track = this.tracks[index];
        track.target[track.axis] = track.baseValue + track.amplitude * eased;
      }
    }
    if (moving) this.#setCollisionState(false);
  }

  #setCollisionState(enabled) {
    for (let index = 0; index < this.colliders.length; index += 1) {
      this.setColliderEnabled?.(this.colliders[index], enabled);
    }
  }

  #setActive(active) {
    const next = Boolean(active);
    if (next === this.isActive) return;
    this.isActive = next;
    if (next) this.#setCollisionState(false);
    this.onActiveChange?.(this, next);
  }

  #assertUsable() {
    if (this.isDisposed) throw new Error('Cannot operate a disposed AssetInteractionController.');
  }
}

export class AssetInteractionSystem {
  constructor() {
    this.controllers = new Set();
    this.activeControllers = new Set();
    this.isDisposed = false;
  }

  create(root, options = {}) {
    if (this.isDisposed) throw new Error('Cannot add a controller to a disposed AssetInteractionSystem.');
    const externalActiveChange = options.onActiveChange;
    const controller = new AssetInteractionController(root, {
      ...options,
      onActiveChange: (item, active) => {
        if (active) this.activeControllers.add(item);
        else this.activeControllers.delete(item);
        externalActiveChange?.(item, active);
      },
    });
    this.controllers.add(controller);
    return controller;
  }

  update(dt) {
    if (this.isDisposed || this.activeControllers.size === 0) return 0;
    for (const controller of this.activeControllers) controller.update(dt);
    return this.activeControllers.size;
  }

  remove(controller) {
    if (!this.controllers.has(controller)) return false;
    this.activeControllers.delete(controller);
    this.controllers.delete(controller);
    controller.dispose();
    return true;
  }

  dispose() {
    if (this.isDisposed) return;
    for (const controller of this.controllers) controller.dispose();
    this.controllers.clear();
    this.activeControllers.clear();
    this.isDisposed = true;
  }

  get activeCount() {
    return this.activeControllers.size;
  }
}

export function createAssetInteraction(root, options) {
  return new AssetInteractionController(root, options);
}
