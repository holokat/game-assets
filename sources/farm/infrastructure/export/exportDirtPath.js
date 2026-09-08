import { createDirtPath } from '../assets/dirtPath.js';
import { exportInventoryAsset } from './inventory122Export.js';
export const exportDirtPath = () => exportInventoryAsset({ id: 'dirt-path', title: 'Dirt-Path', create: createDirtPath });
const output = document.querySelector('#output'); window.__DIRT_PATH_EXPORT_READY__ = false;
try { window.__DIRT_PATH_EXPORT_MANIFEST__ = await exportDirtPath(); output.textContent = JSON.stringify(window.__DIRT_PATH_EXPORT_MANIFEST__, null, 2); window.__DIRT_PATH_EXPORT_READY__ = true; } catch (error) { output.textContent = String(error.stack || error); window.__DIRT_PATH_EXPORT_ERROR__ = String(error.stack || error); }
