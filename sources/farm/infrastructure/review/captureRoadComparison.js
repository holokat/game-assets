const assetId = new URL(import.meta.url).searchParams.get('id');
const load = (path) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = path; });
const drawContained = (context, image, x, y, width, height) => { const scale = Math.min(width / image.width, height / image.height); const drawWidth = image.width * scale; const drawHeight = image.height * scale; context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight); };
const post = async (path, blob) => { const response = await fetch(`/__artifact__?path=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob }); if (!response.ok) throw new Error(`Could not write ${path}`); };
try {
  const [concept, render] = await Promise.all([load(`./references/concepts/${assetId}.png`), load(`./review/${assetId}/browser-review.png`)]);
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const context = canvas.getContext('2d'); context.fillStyle = '#f7f0e6'; context.fillRect(0, 0, canvas.width, canvas.height);
  drawContained(context, concept, 0, 0, 1024, 1024); drawContained(context, render, 1024, 0, 1024, 1024);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Comparison canvas could not encode.');
  await post(`review/${assetId}/comparison.png`, blob);
  document.body.textContent = `Comparison written for ${assetId}.`; window.__ROAD_COMPARISON_READY__ = true;
} catch (error) { document.body.textContent = String(error.stack || error); window.__ROAD_COMPARISON_ERROR__ = String(error.stack || error); }
