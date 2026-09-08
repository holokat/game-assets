import {enchantments, enchantmentById, visualLevels} from '../data/enchantments.js';
import {itemById, itemLabel} from '../data/item-catalog.js';
import {isEnchantableItem} from './enchantment-state.js';

const iconPaths = {
  flame: ['M12 3c1 4-3 5-2 8 1-1 2-2 2-4 4 3 6 6 5 9a5.3 5.3 0 0 1-10-1c0-3 2-5 5-12Z', 'M12 14c-2 2-2 4 0 5 2-1 2-3 0-5Z'],
  frost: ['M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9', 'm9 5 3 3 3-3m-6 14 3-3 3 3M5 11l3-1-1-3m10 10-1-3 3-1M5 13l3 1-1 3m10-10-1 3 3 1'],
  shock: ['m13.5 2-8 11H11l-.5 9 8-12H13l.5-8Z'],
  venom: ['M12 3c-2 4-6 7-6 11a6 6 0 0 0 12 0c0-4-4-7-6-11Z', 'M9 14a3 3 0 0 0 3 3m3-5v.1'],
  vampiric: ['M5 6c2 0 4 1 7 4 3-3 5-4 7-4l-3 12-4-4-4 4L5 6Z', 'm8 9 1 4m7-4-1 4'],
  keen: ['m5 19 3-3m-2-3 5 5m-3-3 9-12 4-1-1 4-11 10', 'M4 4v4M2 6h4'],
  force: ['m8 6 4 6-4 6m5-12 4 6-4 6M3 9l2 3-2 3', 'M20 6v12'],
  holy: ['M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z', 'M12 9v6m-2-3h4'],
};
let nextPanelId = 0;
const sameSelection = (a, b) => a.id === b.id && a.level === b.level;

/** A movable inspector panel. Callbacks receive choices; the host owns persistence and VFX. */
export function createEnchantmentPanel({container, onChange = () => {}, onImpact = () => {},
  onExport = () => {}, onPause = () => {}, onLighting = () => {}}) {
  if (!container?.ownerDocument) throw new TypeError('An enchantment panel needs a DOM container');
  const document = container.ownerDocument;
  const listeners = [];
  const prefix = `weapon-enchantment-${++nextPanelId}`;
  let disposed = false;
  let view = {weaponId: null, weaponLabel: '', selection: {id: 'none', level: 1}, playing: true, lighting: false};

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function listen(element, event, callback) {
    const guarded = value => { if (!disposed && !element.disabled) callback(value); };
    element.addEventListener(event, guarded);
    listeners.push(() => element.removeEventListener(event, guarded));
  }
  function button(text, action) {
    const result = node('button', '', text);
    result.type = 'button';
    if (action) result.dataset.enchantmentAction = action;
    return result;
  }
  function group(label, className) {
    const result = node('div', className);
    result.setAttribute('role', 'group');
    result.setAttribute('aria-label', label);
    return result;
  }
  function icon(id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false'})) svg.setAttribute(name, value);
    for (const d of iconPaths[id]) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }

  const element = node('details', 'enchantment-panel');
  element.open = true;
  const summary = node('summary', 'enchantment-heading');
  const title = node('span', 'enchantment-title', 'Weapon enchantment');
  title.id = `${prefix}-title`;
  element.setAttribute('aria-labelledby', title.id);
  const weapon = node('span', 'enchantment-weapon');
  const headingCopy = node('h2', 'enchantment-heading-copy');
  headingCopy.append(title, weapon);
  const disclosure = node('span', 'enchantment-disclosure', '⌄');
  disclosure.setAttribute('aria-hidden', 'true');
  headingCopy.append(disclosure);
  summary.append(headingCopy);

  const empty = node('p', 'enchantment-empty', 'Select or equip a weapon to add an enchantment.');
  const body = node('div', 'enchantment-body');
  const grid = group('Weapon enchantment', 'enchantment-grid');
  const choices = enchantments.map(effect => {
    const choice = button();
    choice.dataset.enchantmentId = effect.id;
    choice.style.setProperty('--enchantment-color', effect.color);
    const glyph = node('span', 'enchantment-glyph');
    glyph.append(icon(effect.id));
    const name = node('span', 'enchantment-name', effect.name);
    const check = node('span', 'enchantment-selected-mark', '✓');
    check.setAttribute('aria-hidden', 'true');
    choice.append(glyph, name, check);
    choice.setAttribute('aria-label', `${effect.name} enchantment`);
    listen(choice, 'click', () => choose({id: effect.id, level: view.selection.level}));
    grid.append(choice);
    return choice;
  });
  const selectionRow = node('div', 'enchantment-selection-row');
  const status = node('p', 'enchantment-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const remove = button('Remove', 'remove');
  remove.className = 'enchantment-remove';
  remove.setAttribute('aria-label', 'Remove weapon enchantment');
  listen(remove, 'click', () => choose({id: 'none', level: 1}));
  selectionRow.append(status, remove);

  const settings = node('div', 'enchantment-settings');
  const visual = node('p', 'enchantment-visual');
  const strength = node('section', 'enchantment-strength');
  const strengthTitle = node('h3', '', 'Visual strength');
  const levelGroup = group('Visual strength', 'enchantment-levels');
  const levelButtons = visualLevels.map(level => {
    const choice = button();
    choice.dataset.enchantmentLevel = String(level.id);
    choice.setAttribute('aria-label', `Level ${level.id}: ${level.label}`);
    choice.append(node('span', 'enchantment-level-number', level.name), node('span', '', level.label));
    listen(choice, 'click', () => choose({...view.selection, level: level.id}));
    levelGroup.append(choice);
    return choice;
  });
  strength.append(strengthTitle, levelGroup);

  const preview = node('section', 'enchantment-preview');
  const previewTitle = node('h3', '', 'Preview');
  const previewActions = group('Enchantment preview', 'enchantment-preview-actions');
  const impact = button('Preview hit', 'impact');
  const pause = button('Pause aura', 'pause');
  listen(impact, 'click', () => onImpact());
  listen(pause, 'click', () => {
    view = {...view, playing: !view.playing};
    render();
    onPause(view.playing);
  });
  previewActions.append(impact, pause);
  const lightingLabel = node('label', 'enchantment-lighting');
  const lighting = node('input');
  lighting.type = 'checkbox';
  lighting.dataset.enchantmentAction = 'lighting';
  listen(lighting, 'change', () => {
    view = {...view, lighting: lighting.checked};
    onLighting(view.lighting);
  });
  lightingLabel.append(lighting, node('span', '', 'Dramatic lighting'));
  preview.append(previewTitle, previewActions, lightingLabel);

  const reference = node('details', 'enchantment-reference');
  const referenceSummary = node('summary', '', 'Design reference');
  const description = node('p');
  const affinity = node('p', 'enchantment-affinity');
  const referenceNote = node('p', 'enchantment-reference-note', 'Combat outcomes are design references and are not simulated.');
  reference.append(referenceSummary, description, affinity, referenceNote);
  const exportButton = button('Export effect preset', 'export');
  exportButton.className = 'enchantment-export';
  listen(exportButton, 'click', () => onExport());
  settings.append(visual, strength, preview, reference, exportButton);
  body.append(grid, selectionRow, settings);
  element.append(summary, empty, body);
  container.append(element);

  function choose(selection) {
    if (!isEnchantableItem(view.weaponId) || sameSelection(view.selection, selection)) return;
    view = {...view, selection: {...selection}};
    render();
    onChange({...selection});
  }
  function render() {
    const available = isEnchantableItem(view.weaponId);
    const effect = available ? enchantmentById.get(view.selection.id) : null;
    const enabled = Boolean(effect);
    element.dataset.enchantment = effect?.id ?? 'none';
    element.dataset.weaponId = available ? view.weaponId : '';
    weapon.textContent = available ? view.weaponLabel || itemLabel(itemById.get(view.weaponId)) : 'No weapon selected';
    empty.hidden = available;
    body.hidden = !available;
    settings.hidden = !enabled;
    for (const choice of choices) {
      choice.disabled = !available;
      choice.setAttribute('aria-pressed', String(enabled && choice.dataset.enchantmentId === effect.id));
    }
    for (const choice of levelButtons) {
      choice.disabled = !enabled;
      choice.setAttribute('aria-pressed', String(enabled && Number(choice.dataset.enchantmentLevel) === view.selection.level));
    }
    for (const action of [remove, impact, pause, lighting, exportButton]) action.disabled = !enabled;
    remove.hidden = !enabled;
    status.textContent = enabled ? `${effect.name} · Level ${view.selection.level}` : 'No enchantment applied';
    visual.textContent = effect?.visual ?? '';
    description.textContent = effect?.description ?? '';
    affinity.textContent = effect ? `Recommended for: ${effect.affinity.toLowerCase()}` : '';
    pause.textContent = view.playing ? 'Pause aura' : 'Resume aura';
    pause.setAttribute('aria-label', view.playing ? 'Pause enchantment aura' : 'Resume enchantment aura');
    pause.setAttribute('aria-pressed', String(!view.playing));
    lighting.checked = view.lighting;
  }
  render();

  return {
    element,
    update({weaponId = null, weaponLabel = '', selection = {id: 'none', level: 1}, playing = true, lighting = false} = {}) {
      if (disposed) return;
      const id = enchantmentById.has(selection?.id) ? selection.id : 'none';
      const level = visualLevels.some(entry => entry.id === selection?.level) ? selection.level : 1;
      const next = {weaponId, weaponLabel, selection: {id, level}, playing: Boolean(playing), lighting: Boolean(lighting)};
      if (next.weaponId === view.weaponId && next.weaponLabel === view.weaponLabel && sameSelection(next.selection, view.selection)
        && next.playing === view.playing && next.lighting === view.lighting) return;
      view = next;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of listeners.splice(0)) cleanup();
      element.remove();
    },
  };
}
