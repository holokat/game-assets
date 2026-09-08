import {itemById} from '../data/item-catalog.js';
import {materialById} from '../data/materials.js';
import {shieldById,shieldConstructions} from '../data/shield-catalog.js';

export const itemMaterialStorageKey = 'kaldera-item-materials';
export const itemMaterialChannels = Object.freeze(['finish', 'metal', 'wood', 'leather', 'gem']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Read saved choices, dropping obsolete cross-surface material assignments. */
export function normalizeItemMaterials(value) {
  const selections = {};
  if (!isRecord(value)) return selections;

  for (const [itemId, choice] of Object.entries(value)) {
    if (!itemById.has(itemId) || !isRecord(choice)) continue;
    selections[itemId] = {};
    if (shieldById.has(itemId) && shieldConstructions.includes(choice.construction)) selections[itemId].construction = choice.construction;
    for (const channel of itemMaterialChannels) {
      if (Object.hasOwn(choice, channel) && materialById.has(choice[channel])
        && (channel === 'finish' || materialById.get(choice[channel]).role === channel)) {
        selections[itemId][channel] = choice[channel];
      }
    }
  }
  return selections;
}

/** DOM-free material choices. Every read is detached from the persisted state. */
export function createItemMaterialState(storage) {
  let saved;
  try {
    storage ??= globalThis.localStorage;
    saved = JSON.parse(storage?.getItem(itemMaterialStorageKey) ?? '{}');
  } catch {
    // Storage can be disabled, unavailable, or contain an older malformed value.
  }
  let selections = normalizeItemMaterials(saved);
  let suspended = false;

  function persist() {
    if (suspended) return;
    try {
      storage?.setItem(itemMaterialStorageKey, JSON.stringify(selections));
    } catch {
      // Editing remains available when the browser cannot persist preferences.
    }
  }

  function selection(itemId) {
    return {...selections[itemId]};
  }

  function set(itemId, value, channel) {
    if (!itemById.has(itemId)) throw new Error(`Unknown library item: ${itemId}`);
    if (value === null) {
      delete selections[itemId];
    } else if (channel === 'construction') {
      if (!shieldById.has(itemId) || !shieldConstructions.includes(value)) throw new Error(`Invalid shield construction: ${value}`);
      selections[itemId] ??= {};
      selections[itemId].construction = value;
    } else {
      if (!itemMaterialChannels.includes(channel)) throw new Error(`Unknown material channel: ${channel}`);
      const preset = materialById.get(value);
      if (!preset) throw new Error(`Unknown item material: ${value}`);
      if (channel !== 'finish' && preset.role !== channel) throw new Error(`${value} is not a ${channel} material`);
      selections[itemId] ??= {};
      selections[itemId][channel] = value;
      // Matching parts remembers each surface independently. Selecting a metal
      // after a wood must keep the wood choice and replace any older metal.
      if (channel === 'finish') selections[itemId][preset.role] = value;
    }
    persist();
    return selection(itemId);
  }

  return {
    selection,
    set,
    snapshot: () => normalizeItemMaterials(selections),
    restore(saved) {
      selections = normalizeItemMaterials(saved);
      persist();
    },
    suspendPersistence(value) {
      suspended = Boolean(value);
    },
    equipmentMaterials(equipment) {
      return Object.fromEntries(Object.entries(equipment).map(([slot, itemId]) => [slot, selection(itemId)]));
    },
  };
}
