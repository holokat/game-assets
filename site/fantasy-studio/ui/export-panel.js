import {captureSheet, saveCanvas} from '../runtime/capture.js';
import {exportCharacter, downloadBlob} from '../runtime/export.js';
import {createDOMScope} from './dom-scope.js';

/** File toolbar and collection dialog. Services are injectable for alternate export formats. */
export function createExportPanel({stage, getActor, dirty, report, root = document, getImageName,
  capture = captureSheet, saveImage = saveCanvas, exportModel = exportCharacter, download = downloadBlob}) {
  const dom = createDOMScope(root);
  let galleryURL;
  let toastTimer;
  let closed = false;
  let captureVersion = 0;
  const fileName = actor => actor.kind;
  function toast(message) {
    if (closed) return;
    clearTimeout(toastTimer);
    dom.get('toast').textContent = message;
    dom.get('toast').classList.add('visible');
    toastTimer = setTimeout(() => dom.get('toast').classList.remove('visible'), 2400);
  }
  const bind = (id, action) => dom.on(id, 'click', () => {
    Promise.resolve().then(() => { if (!closed) return action(); }).catch(error => {
      if (!closed) { report(error); toast('File operation failed. Please try again.'); }
    });
  });
  bind('save-image', async () => {
    const actor = getActor();
    if (!actor) return;
    const imageName = getImageName?.() || fileName(actor);
    const url = await saveImage(stage, imageName);
    try {
      if (closed) return;
      const blob = await (await fetch(url)).blob();
      if (!closed) download(blob, 'image/png', `${imageName}.png`);
    } finally { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }
    toast('Image saved');
  });
  bind('export-model', async () => {
    const actor = getActor();
    if (!actor) return;
    dom.get('export-model').disabled = true;
    try {
      const model = await exportModel(actor);
      if (closed) return;
      download(model, 'model/gltf-binary', `${fileName(actor)}.glb`);
      toast('Character exported');
    } finally { if (!closed) dom.get('export-model').disabled = false; }
  });
  bind('gallery-button', async () => {
    const actor = getActor();
    if (!actor) return;
    const token = ++captureVersion;
    dom.get('gallery-dialog').showModal();
    dom.get('gallery-status').textContent = 'Rendering the collection…';
    dom.get('gallery-status').hidden = false;
    dom.get('gallery-image').hidden = true;
    dom.get('download-gallery').disabled = true;
    try {
      const result = await capture(stage, [actor], 'collection', null, actor.bodyType);
      if (closed || token !== captureVersion) { if (result.url.startsWith('blob:')) URL.revokeObjectURL(result.url); return; }
      if (galleryURL?.startsWith('blob:')) URL.revokeObjectURL(galleryURL);
      galleryURL = result.url;
      dom.get('gallery-image').src = galleryURL;
      dom.get('gallery-image').hidden = false;
      dom.get('gallery-status').hidden = true;
      dom.get('download-gallery').disabled = false;
    } catch (error) {
      if (!closed && token === captureVersion) dom.get('gallery-status').textContent = 'Collection could not be rendered.';
      if (!closed) report(error);
    } finally { if (!closed) dirty(); }
  });
  bind('close-gallery', () => dom.get('gallery-dialog').close());
  bind('download-gallery', async () => {
    if (!galleryURL) return;
    const blob = await (await fetch(galleryURL)).blob();
    if (!closed) download(blob, 'image/png', 'character-collection.png');
  });
  return {dispose() { if (galleryURL?.startsWith('blob:')) URL.revokeObjectURL(galleryURL); closed = true; captureVersion++; clearTimeout(toastTimer); dom.dispose(); }};
}
