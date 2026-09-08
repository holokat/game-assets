/** Add the published collections to the existing workspace. */
export function mountCollectionMarkup(root = document) {
  const nav = root.querySelector('.workspace-tabs');
  const main = root.querySelector('.workspace');
  const nodes = [];
  for (const [id, label] of [['armor', 'Armor'], ['farm', 'Farm'], ['effects', 'Visual effects']]) {
    const tab = root.createElement('button');
    tab.type = 'button'; tab.role = 'tab'; tab.dataset.workspace = id;
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', id === 'effects' ? 'living-library' : 'collection-library');
    tab.textContent = label; nav.insertBefore(tab, nav.querySelector('span')); nodes.push(tab);
  }
  const library = root.createElement('aside');
  library.id = 'collection-library'; library.className = 'collection-library'; library.hidden = true;
  library.innerHTML = `<div class="collection-heading"><h2 id="collection-heading">Armor</h2><span id="collection-count"></span></div>
    <p id="collection-intro" class="collection-note"></p>
    <div class="collection-filters"><label class="sr-only" for="collection-search">Search assets</label><input id="collection-search" type="search" placeholder="Search assets" autocomplete="off">
    <label class="sr-only" for="collection-filter">Collection</label><select id="collection-filter"></select></div>
    <div id="collection-list" class="collection-list" aria-label="Assets"></div><p id="collection-empty" hidden>No matching assets.</p>`;
  main.insertBefore(library, main.querySelector('.viewport')); nodes.push(library);
  const inspector = root.createElement('aside');
  inspector.id = 'collection-inspector'; inspector.className = 'collection-inspector'; inspector.hidden = true;
  inspector.innerHTML = `<section><span id="collection-category" class="eyebrow"></span><h2 id="collection-title">Choose an asset</h2><p id="collection-description"></p><dl id="collection-facts"></dl></section>
    <section><h3>Preview and download</h3><label for="collection-variant">Model variant</label><select id="collection-variant"></select><a id="collection-download" class="collection-download primary" download>Download GLB</a><p id="collection-status" role="status"></p><button id="collection-retry" hidden>Retry preview</button></section>
    <section><h3>Inspection</h3><label class="check"><input id="collection-wireframe" type="checkbox">Wireframe</label><button id="collection-frame">Frame asset</button></section>
    <section><h3>Use in your game</h3><p>Downloads preserve the original model and materials. Preview centering does not change the file.</p><a href="https://github.com/holokat/game-assets#use-the-assets" target="_blank" rel="noopener">Integration guide ↗</a><p>MIT license. Keep the license notice with redistributed assets.</p></section>`;
  main.append(inspector); nodes.push(inspector);
  const links = root.createElement('section'); links.className = 'effect-source-links';
  links.innerHTML = `<h3>Effect library</h3><button id="open-spell-effects">Browse spell effects</button><p>Ambient effects export as JSON presets. Their Three.js runtime and the spell effects are included in the repository.</p><a href="https://github.com/holokat/game-assets#visual-effects" target="_blank" rel="noopener">Effect source and integration ↗</a>`;
  root.getElementById('living-inspector').append(links); nodes.push(links);
  return () => nodes.forEach(node => node.remove());
}
