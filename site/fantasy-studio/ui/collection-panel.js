/** Catalog UI, independent of model loading and rendering. */
export function createCollectionPanel({root = document, onSelect, onVariant, onWireframe, onFrame, onRetry}) {
  const el = id => root.getElementById(id);
  const listeners = [];
  let entries = [], selected = null;
  function listen(id, event, callback) {
    const node = el(id); node.addEventListener(event, callback);
    listeners.push(() => node.removeEventListener(event, callback));
  }
  function render() {
    const term = el('collection-search').value.trim().toLowerCase();
    const category = el('collection-filter').value;
    const visible = entries.filter(e => (!category || e.category === category) && `${e.name} ${e.category} ${e.group || ''}`.toLowerCase().includes(term));
    el('collection-count').textContent = `${visible.length} of ${entries.length} assets`;
    el('collection-empty').hidden = visible.length > 0;
    const fragment = root.createDocumentFragment();
    for (const entry of visible) {
      const button = root.createElement('button'); button.className = 'collection-card'; button.type = 'button';
      button.dataset.assetId = entry.id; button.setAttribute('aria-pressed', String(entry.id === selected));
      const name = root.createElement('span'); name.textContent = entry.name;
      const detail = root.createElement('small'); detail.textContent = entry.category;
      button.append(name, detail); fragment.append(button);
    }
    el('collection-list').replaceChildren(fragment);
  }
  listen('collection-list', 'click', event => {
    const button = event.target.closest('[data-asset-id]'); if (button) onSelect(button.dataset.assetId);
  });
  listen('collection-search', 'input', render); listen('collection-filter', 'change', render);
  listen('collection-variant', 'change', event => onVariant(Number(event.target.value)));
  listen('collection-wireframe', 'change', event => onWireframe(event.target.checked));
  listen('collection-frame', 'click', onFrame); listen('collection-retry', 'click', onRetry);
  return {
    setCollection(kind, rows) {
      entries = rows; el('collection-heading').textContent = kind === 'armor' ? 'Armor archive' : 'Farm collections';
      el('collection-intro').textContent = kind === 'armor' ? '50 designs, with both body fits and every archived hide variant.' : 'Canonical farm, infrastructure, beach scenery and crop growth stages.';
      el('collection-search').value = ''; el('collection-list').scrollTop = 0;
      el('collection-filter').replaceChildren(new Option('All collections', ''), ...[...new Set(rows.map(e => e.category))].map(c => new Option(c, c)));
      render();
    },
    inspect(entry, variantIndex) {
      selected = entry.id; render();
      el('collection-title').textContent = entry.name; el('collection-category').textContent = entry.category;
      el('collection-description').textContent = entry.description;
      el('collection-variant').replaceChildren(...entry.variants.map((v, i) => new Option(v.label, String(i))));
      el('collection-variant').value = String(variantIndex);
      const v = entry.variants[variantIndex], a = el('collection-download'); a.href = v.path; a.download = v.path.split('/').pop();
      el('collection-facts').replaceChildren();
      for (const [key, value] of [['Format', 'GLB · Y up'], ['File size', `${(v.bytes / 1048576).toFixed(2)} MiB`], ['Variants', String(entry.variants.length)]]) {
        const dt = root.createElement('dt'), dd = root.createElement('dd'); dt.textContent = key; dd.textContent = value; el('collection-facts').append(dt, dd);
      }
    },
    status(message, failed = false) { el('collection-status').textContent = message; el('collection-retry').hidden = !failed; },
    dispose() { listeners.forEach(remove => remove()); },
  };
}
