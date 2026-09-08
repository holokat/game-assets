import { createFarmRoad } from '../assets/farmRoad.js';
import { exportInventoryAsset } from './inventory122Export.js';
export const exportFarmRoad = () => exportInventoryAsset({ id: 'farm-road', title: 'Farm-Road', create: createFarmRoad });
const output = document.querySelector('#output'); window.__FARM_ROAD_EXPORT_READY__ = false;
try { window.__FARM_ROAD_EXPORT_MANIFEST__ = await exportFarmRoad(); output.textContent = JSON.stringify(window.__FARM_ROAD_EXPORT_MANIFEST__, null, 2); window.__FARM_ROAD_EXPORT_READY__ = true; } catch (error) { output.textContent = String(error.stack || error); window.__FARM_ROAD_EXPORT_ERROR__ = String(error.stack || error); }
