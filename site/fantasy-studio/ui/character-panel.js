import {classes, npcs} from './catalog.js';
import {isStudioNpc} from '../data/studio-npcs.js';
import {weapons, shields} from '../models/weapons.js';
import {createDOMScope} from './dom-scope.js';

/** Class outfits and handheld controls. Choices are supplied to actions. */
export function createCharacterPanel({selectClass, selectOccupation, root = document}) {
  const dom = createDOMScope(root);
  const document = root.ownerDocument || root;
  const option = (title, value) => {
    const element = document.createElement('option');
    element.textContent = title;
    element.value = value;
    return element;
  };
  dom.get('classes').replaceChildren();
  for (const entry of classes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'class-card';
    button.dataset.class = entry.id;
    const symbol = document.createElement('span');
    symbol.className = 'class-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = entry.symbol;
    const copy = document.createElement('span');
    copy.className = 'class-copy';
    const title = document.createElement('b');
    title.textContent = entry.title;
    copy.append(title);
    button.append(symbol, copy);
    dom.on(button, 'click', () => selectClass(entry.id));
    dom.get('classes').append(button);
  }
  for (const [id, choices] of [['weapon', weapons], ['shield', shields]]) {
    dom.get(id).replaceChildren(...choices.map(([value, title]) => option(title, value)));
  }
  dom.get('npc-occupation').replaceChildren(...npcs.map(entry => option(entry.title, entry.id)));
  dom.get('npc-occupation').value = npcs[0].id;
  dom.on('npc-category', 'click', () => selectClass('npc'));
  dom.on('npc-occupation', 'change', event => selectOccupation(event.target.value));
  return {
    update(kind) {
      const npc = isStudioNpc(kind);
      for (const button of dom.all('[data-class]')) {
        const active = button.dataset.class === kind;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      }
      dom.get('npc-category').classList.toggle('active', npc);
      dom.get('npc-category').setAttribute('aria-pressed', String(npc));
      dom.get('npc-category').setAttribute('aria-expanded', String(npc));
      dom.get('npc-occupations').hidden = !npc;
      if (npc) dom.get('npc-occupation').value = kind;
    },
    dispose: dom.dispose,
  };
}
