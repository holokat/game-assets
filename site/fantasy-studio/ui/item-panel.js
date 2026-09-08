import {
  itemCatalog, itemById, categoryOptions, defaultItemId, resolveItemId, itemLabel, itemDetail, sentenceCase,
} from '../data/item-catalog.js';
import {createItemMaterialPanel} from './item-material-panel.js';

/** Catalog browsing and item details, with material controls delegated to their own panel. */
export function createItemPanel({
  select, equip, selection, material, view, thumbnail, exportItem, availableTargets, canEquip,
  root = document,
}) {
  const ownerDocument = root.ownerDocument ?? root;
  const element = id => root.querySelector(`#${id}`);
  const list = element('item-list');
  const search = element('item-search');
  const category = element('item-category');
  const equipButton = element('item-equip');
  const exportButton = element('item-export');
  const viewButtons = [...root.querySelectorAll('[data-item-view]')];
  const listeners = [];
  const options = [];
  let current = defaultItemId;
  let filter = 'all';
  let query = '';
  let mode = 'item';
  let disposed = false;

  const Observer = ownerDocument.defaultView.IntersectionObserver;
  const observer = new Observer(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || disposed) continue;
      const image = entry.target;
      observer.unobserve(image);
      thumbnail(image.dataset.item).then(url => {
        if (disposed || !list.contains(image)) return;
        image.src = url;
        image.classList.add('ready');
      }).catch(() => {
        if (!disposed && list.contains(image)) image.alt = 'Preview unavailable';
      });
    }
  }, {root: list, rootMargin: '160px'});

  function addOption(select, label, value) {
    const option = ownerDocument.createElement('option');
    option.textContent = label;
    option.value = value;
    options.push(option);
    select.add(option);
  }

  for (const [id, label] of categoryOptions) addOption(category, label, id);
  const materials = createItemMaterialPanel({material, root});

  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  }

  function matchesFilters(item) {
    const searchable = `${item.name} ${item.family || ''} ${item.colour || ''}`.toLowerCase();
    return (filter === 'all' || item.kind === filter)
      && (!query || searchable.includes(query));
  }

  function createCard(item) {
    const button = ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'item-card';
    button.dataset.item = item.id;
    button.setAttribute('aria-pressed', String(item.id === current));

    const image = ownerDocument.createElement('img');
    image.width = 192;
    image.height = 192;
    image.alt = '';
    image.dataset.item = item.id;
    const title = ownerDocument.createElement('span');
    title.textContent = itemLabel(item);
    const detail = ownerDocument.createElement('small');
    detail.textContent = sentenceCase(item.kind);
    button.append(image, title, detail);
    observer.observe(image);
    return button;
  }

  function render() {
    if (disposed) return;
    observer.disconnect();
    const found = itemCatalog.filter(matchesFilters);
    element('item-count').textContent = `${found.length} of ${itemCatalog.length}`;
    element('item-empty').hidden = Boolean(found.length);
    const fragment = ownerDocument.createDocumentFragment();
    for (const item of found) fragment.append(createCard(item));
    list.replaceChildren(fragment);
  }

  function setFilter(value) {
    if (disposed) return;
    filter = categoryOptions.some(([id]) => id === value) ? value : 'all';
    category.value = filter;
    render();
  }

  listen(search, 'input', () => {
    query = search.value.trim().toLowerCase();
    render();
  });
  listen(category, 'change', () => setFilter(category.value));
  listen(list, 'click', event => {
    const card = event.target.closest('.item-card');
    if (card && list.contains(card)) select(card.dataset.item);
  });
  listen(equipButton, 'click', () => equip(current));
  listen(exportButton, 'click', () => exportItem(current));
  for (const button of viewButtons) listen(button, 'click', () => view(button.dataset.itemView));

  function update(id, {viewMode = mode, busy = false} = {}) {
    if (disposed) return;
    current = resolveItemId(id);
    mode = viewMode;
    const item = itemById.get(current);
    for (const card of list.querySelectorAll('.item-card')) {
      card.setAttribute('aria-pressed', String(card.dataset.item === current));
    }
    element('item-title').textContent = itemLabel(item);
    element('item-description').textContent = itemDetail(item);
    element('item-source').hidden = !item.sourceUrl;
    if (element('item-source').parentElement) element('item-source').parentElement.hidden = !item.sourceUrl;
    if (item.sourceUrl) element('item-source').href = item.sourceUrl;
    element('item-kind').textContent = sentenceCase(item.kind);
    equipButton.disabled = busy || !canEquip(item);
    equipButton.textContent = mode === 'character' ? 'Equipped on character' : 'Equip and view';
    exportButton.disabled = busy;
    element('item-surface-controls').hidden = item.kind === 'material';
    for (const button of viewButtons) {
      button.hidden = button.dataset.itemView === 'character' && !canEquip(item);
      button.setAttribute('aria-pressed', String(button.dataset.itemView === mode));
    }
    materials.update(selection(current), availableTargets(), item);
  }

  render();
  return {
    update,
    render,
    setFilter,
    get current() { return current; },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      for (const removeListener of listeners) removeListener();
      materials.dispose();
      for (const option of options) option.remove();
      list.replaceChildren();
    },
  };
}
