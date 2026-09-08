import { createGravelRoad } from '../assets/gravelRoad.js';
import { exportInventoryAsset } from './inventory122Export.js';
export const exportGravelRoad = () => exportInventoryAsset({ id: 'gravel-road', title: 'Gravel-Road', create: createGravelRoad });
const output = document.querySelector('#output'); window.__GRAVEL_ROAD_EXPORT_READY__ = false;
try { window.__GRAVEL_ROAD_EXPORT_MANIFEST__ = await exportGravelRoad(); output.textContent = JSON.stringify(window.__GRAVEL_ROAD_EXPORT_MANIFEST__, null, 2); window.__GRAVEL_ROAD_EXPORT_READY__ = true; } catch (error) { output.textContent = String(error.stack || error); window.__GRAVEL_ROAD_EXPORT_ERROR__ = String(error.stack || error); }
