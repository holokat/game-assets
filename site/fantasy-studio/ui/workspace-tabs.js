/** Existing workspace panels. Adding a tab requires an explicit panel pairing. */
const WORKSPACE_PANELS = Object.freeze({
  character: ['character-library', 'material-inspector'],
  items: ['item-library', 'item-inspector'],
  abilities: ['ability-library', 'ability-inspector'],
  structures: ['structure-library', 'structure-inspector'],
  world: ['living-library', 'living-inspector'],
  effects: ['living-library', 'living-inspector'],
  armor: ['collection-library', 'collection-inspector'],
  farm: ['collection-library', 'collection-inspector'],
});

export function resolveWorkspaceMode(value) {
  return Object.hasOwn(WORKSPACE_PANELS, value) ? value : 'character';
}

/**
 * Present workspace tabs and paired panels without owning editor lifecycles.
 * Arrow keys retain the existing wrapping, focus and automatic activation.
 *
 * @param {Object} options
 * @param {Document} [options.root]
 * @param {(mode: string) => void} options.onSelect
 */
export function createWorkspaceTabs({root = document, onSelect}) {
  const buttons = [...root.querySelectorAll('button[data-workspace]')];
  const listeners = [];
  let disposed = false;

  for (const button of buttons) {
    const click = () => onSelect(button.dataset.workspace);
    const keydown = event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === 'ArrowRight' ? 1 : buttons.length - 1;
      const next = buttons[(buttons.indexOf(button) + offset) % buttons.length];
      next.focus();
      next.click();
    };
    button.addEventListener('click', click);
    button.addEventListener('keydown', keydown);
    listeners.push(() => {
      button.removeEventListener('click', click);
      button.removeEventListener('keydown', keydown);
    });
  }

  return {
    setMode(value) {
      const mode = resolveWorkspaceMode(value);
      if (disposed) return mode;
      root.body.dataset.workspace = mode;
      const visibleIds = new Set(WORKSPACE_PANELS[mode]);
      for (const id of new Set(Object.values(WORKSPACE_PANELS).flat())) {
        const panel = root.getElementById(id);
        if (panel) panel.hidden = !visibleIds.has(id);
      }
      for (const button of buttons) {
        const selected = button.dataset.workspace === mode;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (selected) button.scrollIntoView?.({block: 'nearest', inline: 'nearest'});
      }
      return mode;
    },
    showCharacter({title, subtitle}) {
      if (disposed) return;
      root.getElementById('class-title').textContent = title;
      root.getElementById('class-subtitle').textContent = subtitle;
      root.getElementById('action-status').textContent = 'Character preview';
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const remove of listeners) remove();
    },
  };
}
