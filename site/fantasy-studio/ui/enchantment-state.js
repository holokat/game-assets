import {itemById} from '../data/item-catalog.js';
import {enchantmentById, visualLevels} from '../data/enchantments.js';

export const enchantmentStorageKey = 'kaldera-weapon-enchantments';
const levels = new Set(visualLevels.map(level => level.id));
const emptySelection = () => ({id: 'none', level: 1});
const isRecord = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

export function isEnchantableItem(itemId) {
  return ['weapon', 'ammunition'].includes(itemById.get(itemId)?.kind);
}

function copySelection(value) {
  if (!isRecord(value) || !Object.hasOwn(value, 'id') || !Object.hasOwn(value, 'level')
    || (value.id !== 'none' && !enchantmentById.has(value.id)) || !levels.has(value.level)) {
    throw new TypeError('An enchantment requires a known effect and a visual strength from 1 to 3');
  }
  return {id: value.id, level: value.level};
}

function copySnapshot(value, {tolerateInvalid = false} = {}) {
  if (!isRecord(value)) {
    if (tolerateInvalid) return {};
    throw new TypeError('Enchantment choices must be an object keyed by weapon');
  }
  const result = {};
  for (const [itemId, selection] of Object.entries(value)) {
    try {
      if (!isEnchantableItem(itemId)) throw new TypeError(`Not an enchantable weapon: ${itemId}`);
      result[itemId] = copySelection(selection);
    } catch (error) {
      if (!tolerateInvalid) throw error;
    }
  }
  return result;
}

/** Isolated weapon choices. Storage failures never interrupt editing. */
export function createEnchantmentState(storage) {
  let selections = {};
  let suspended = false;
  try {
    storage ??= globalThis.localStorage;
    selections = copySnapshot(JSON.parse(storage?.getItem(enchantmentStorageKey) ?? '{}'), {tolerateInvalid: true});
  } catch {
    // A denied storage getter or malformed saved document starts an in-memory session.
  }

  function persist() {
    if (suspended) return;
    try { storage?.setItem(enchantmentStorageKey, JSON.stringify(selections)); }
    catch { /* Browser storage can be disabled or full. The in-memory choice remains usable. */ }
  }

  function selection(itemId) {
    return isEnchantableItem(itemId) && Object.hasOwn(selections, itemId)
      ? {...selections[itemId]} : emptySelection();
  }

  return {
    selection,
    set(itemId, value) {
      if (!isEnchantableItem(itemId)) throw new TypeError(`Not an enchantable weapon: ${itemId}`);
      const validated = copySelection(value);
      if (validated.id === 'none' && validated.level === 1) delete selections[itemId];
      else selections[itemId] = validated;
      persist();
      return selection(itemId);
    },
    snapshot: () => copySnapshot(selections),
    restore(snapshot) {
      // Validate the complete replacement before changing any existing weapon.
      const validated = copySnapshot(snapshot);
      selections = validated;
      persist();
    },
    suspendPersistence(value) { suspended = Boolean(value); },
  };
}
