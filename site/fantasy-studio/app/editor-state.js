import {classProfile} from '../models/class-profiles.js';
import {characterEntries, palettes} from '../ui/catalog.js';
import {studioNpcs, isStudioNpc} from '../data/studio-npcs.js';

export const playbackSpeeds = Object.freeze([0.5, 1, 1.5, 2, 2.5, 3, 4]);
const classIds = new Set(characterEntries.map(entry => entry.id));
const studioClassId = value => ['mage', 'sorcerer'].includes(value) ? 'wizard' : value;
const colorChannels = ['armor', 'cloth', 'weapon', 'shield'];

/** Editor choices only. Three.js objects and DOM elements belong to other components. */
export function createEditorState({params = new URLSearchParams(), weapons = [], shields = []} = {}) {
  const requestedClass = params.get('class') === 'npc'
    ? (isStudioNpc(params.get('occupation')) ? params.get('occupation') : studioNpcs[0].id)
    : studioClassId(params.get('class'));
  let kind = classIds.has(requestedClass) ? requestedClass : 'warrior';
  let occupation = isStudioNpc(kind) ? kind : studioNpcs[0].id;
  const bodyType = 'neutral';
  const colors = Object.fromEntries(colorChannels.map(key => [key, null]));
  const controls = {weapon: 'default', shield: 'default', palette: 'original'};
  const preview = {motion: 'reference', speed: 2.5, wireframe: false, skeleton: false, grid: false, turn: false};
  const handhelds = {weapon: new Set(weapons.map(([id]) => id)), shield: new Set(shields.map(([id]) => id))};

  for (const slot of ['weapon', 'shield']) {
    if (handhelds[slot].has(params.get(slot))) controls[slot] = params.get(slot);
  }
  if (Object.hasOwn(palettes, params.get('palette'))) controls.palette = params.get('palette');
  for (const channel of colorChannels) {
    const color = params.get(channel + '-color');
    if (/^#[\da-f]{6}$/i.test(color)) colors[channel] = color;
  }

  return {
    colors, controls, preview,
    get kind() { return kind; },
    get category() { return isStudioNpc(kind) ? 'npc' : 'playable'; },
    get occupation() { return occupation; },
    get bodyType() { return bodyType; },
    // Outfit pieces belong to the class. URL parameters and item browsing do
    // not create a second, partially edited outfit state.
    get equipment() { return classProfile(kind).equipment; },
    selectClass(value) {
      // Compatibility aliases apply only to editor choices, not source profiles.
      const next = value === 'npc' ? occupation : studioClassId(value);
      if (!classIds.has(next)) throw new Error(`Unknown studio class: ${value}`);
      kind = next;
      if (isStudioNpc(kind)) occupation = kind;
      Object.assign(controls, {weapon: 'default', shield: 'default', palette: 'original'});
      for (const key of colorChannels) colors[key] = null;
    },
    selectOccupation(value) {
      if (!isStudioNpc(value)) throw new Error(`Unknown NPC occupation: ${value}`);
      this.selectClass(value);
    },
    setHandheld(slot, value) {
      if (!handhelds[slot]?.has(value)) throw new Error(`Unknown ${slot}: ${value}`);
      controls[slot] = value;
    },
    setPalette(value) {
      if (!Object.hasOwn(palettes, value)) throw new Error(`Unknown palette: ${value}`);
      controls.palette = value;
      colors.armor = colors.cloth = null;
    },
    setColor(channel, value) {
      if (!colorChannels.includes(channel) || !/^#[\da-f]{6}$/i.test(value)) throw new Error('Invalid equipment color');
      colors[channel] = value;
    },
    setSpeed(value) {
      if (!playbackSpeeds.includes(value)) throw new Error(`Unknown playback speed: ${value}`);
      preview.speed = value;
    },
    snapshot() {
      return {kind, bodyType, equipment: {...classProfile(kind).equipment}, controls: {...controls}, colors: {...colors}};
    },
    toSearchParams() {
      const result = new URLSearchParams({class: isStudioNpc(kind) ? 'npc' : kind});
      if (isStudioNpc(kind)) result.set('occupation', kind);
      for (const slot of ['weapon', 'shield']) if (controls[slot] !== 'default') result.set(slot, controls[slot]);
      if (controls.palette !== 'original') result.set('palette', controls.palette);
      for (const channel of colorChannels) if (colors[channel]) result.set(channel + '-color', colors[channel]);
      return result;
    },
  };
}
