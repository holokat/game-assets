import {characterEntries, palettes} from './catalog.js';
import {motions} from '../runtime/animation.js';
import {createCharacterPanel} from './character-panel.js';
import {createDOMScope} from './dom-scope.js';
import {twoHandedProfiles} from '../models/two-handed-profiles.js';

/** Main inspector bindings and presentation. All editor mutations go through actions. */
export function createEditorPanel({root = document, actions, report}) {
  const dom = createDOMScope(root);
  const document = root.ownerDocument || root;
  const invoke = (name, ...args) => {
    try { Promise.resolve(actions[name](...args)).catch(report); } catch (error) { report(error); }
  };
  const character = createCharacterPanel({root,
    selectClass: value => invoke('selectClass', value),
    selectOccupation: value => invoke('selectOccupation', value),
  });
  dom.get('palettes').replaceChildren();
  for (const [id, palette] of Object.entries(palettes)) {
    const button = document.createElement('button');
    button.className = 'palette-button';
    button.dataset.palette = id;
    const swatches = id === 'original' ? ['#34454d', '#952f3d', '#bc9960'] : [palette.metal, palette.cloth, palette.leather];
    const chips = document.createElement('span');
    chips.className = 'palette-chips';
    for (const color of swatches) {
      const chip = document.createElement('i');
      chip.style.background = color;
      chips.append(chip);
    }
    button.append(chips, document.createTextNode(palette.label));
    dom.on(button, 'click', () => invoke('setPalette', id));
    dom.get('palettes').append(button);
  }
  dom.get('motion').replaceChildren();
  for (const [id, title] of motions) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = id === 'reference' ? 'Still pose' : title;
    dom.get('motion').add(option);
  }
  dom.on('motion', 'change', event => invoke('setMotion', event.target.value));
  dom.on('speed', 'change', event => invoke('setSpeed', Number(event.target.value)));
  dom.on('play', 'click', () => invoke('togglePreview'));
  dom.on('reset', 'click', () => invoke('reset'));
  for (const slot of ['weapon', 'shield']) dom.on(slot, 'change', event => invoke('setHandheld', slot, event.target.value));
  for (const channel of ['armor', 'cloth', 'weapon', 'shield']) dom.on(channel + '-color', 'input', event => invoke('setColor', channel, event.target.value));
  for (const name of ['wireframe', 'skeleton', 'grid', 'turn']) dom.on(name, 'change', event => invoke('setInspection', name, event.target.checked));
  for (const button of dom.all('[data-view]')) dom.on(button, 'click', () => invoke('setView', button.dataset.view));
  dom.on('mobile-materials', 'click', () => {
    const open = document.body.classList.toggle('show-materials');
    dom.get('mobile-materials').setAttribute('aria-expanded', String(open));
  });
  dom.on(document.defaultView, 'keydown', event => {
    if (event.target.closest?.('input,select,textarea,button,[contenteditable="true"]')) return;
    if (event.code === 'Space') { event.preventDefault(); invoke('togglePlayback'); }
  });

  return {
    character(actor, state) {
      const entry = characterEntries.find(entry => entry.id === actor.kind);
      dom.get('class-title').textContent = entry.title;
      dom.get('class-outfit').textContent = `${entry.title} outfit`;
      dom.get('class-subtitle').textContent = entry.subtitle;
      dom.get('class-description').textContent = entry.description;
      const swatches = ['#687678', '#783b3a', '#674d35'];
      dom.get('materials').replaceChildren(...entry.materials.map((name, index) => {
        const row = document.createElement('div');
        row.className = 'material-row';
        const dot = document.createElement('i');
        dot.className = 'material-dot';
        dot.style.background = swatches[index % swatches.length];
        row.append(dot, document.createTextNode(name));
        return row;
      }));
      character.update(actor.kind);
      this.loadout(state.controls, actor.group.userData.resolvedLoadout);
      this.motion('reference', false);
    },
    stats(actor) {
      let triangles = 0;
      let parts = 0;
      actor.group.traverse(object => {
        if (!object.isMesh || !object.visible) return;
        parts++;
        triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
      });
      dom.get('geometry-count').textContent = `${Math.round(triangles).toLocaleString()} triangles · ${parts} parts`;
      dom.get('action-status').textContent = 'Character preview';
    },
    loadout(controls, resolved) {
      const profile=twoHandedProfiles[resolved?.weapon||controls.weapon],bothHands=!!profile&&profile.kind!=='staff';
      dom.get('weapon').value = controls.weapon;
      dom.get('shield').value = bothHands?'none':controls.shield;
      dom.get('shield').disabled = bothHands;
      dom.get('shield').title = bothHands?'This weapon uses both hands.':'';
    },
    palette(id) { for (const button of dom.all('[data-palette]')) button.classList.toggle('active', button.dataset.palette === id); },
    view(id) { for (const button of dom.all('[data-view]')) button.classList.toggle('active', button.dataset.view === id); },
    speed(value) { dom.get('speed').value = String(value); },
    motion(id, playing) {
      dom.get('motion').value = id;
      dom.get('play').textContent = playing ? 'Pause preview' : 'Play preview';
    },
    inspection(name, value) { dom.get(name).checked = value; },
    loading(value) {
      if (value) dom.get('loading').textContent = 'Building character…';
      dom.get('loading').hidden = !value;
    },
    buildError() {
      dom.get('loading').hidden = false;
      dom.get('loading').textContent = 'Character could not be built. See the local report.';
    },
    dispose() { character.dispose(); dom.dispose(); },
  };
}
