import { createMachineShop, createSawbench, createSawmill } from '../assets/woodMachinery.js';
import { exportInventoryAsset } from './inventory122Export.js';
const assets = { 'machine-shop': [createMachineShop, 'Machine-Shop'], sawbench: [createSawbench, 'Sawbench'], sawmill: [createSawmill, 'Sawmill'] };
const id = new URL(import.meta.url).searchParams.get('id'), [create, title] = assets[id], output = document.querySelector('#output');
try { window.__WOOD_MACHINERY_EXPORT__ = await exportInventoryAsset({ id, title, create }); output.textContent = JSON.stringify(window.__WOOD_MACHINERY_EXPORT__, null, 2); window.__WOOD_MACHINERY_EXPORT_READY__ = true; } catch (error) { window.__WOOD_MACHINERY_EXPORT_ERROR__ = String(error.stack || error); output.textContent = window.__WOOD_MACHINERY_EXPORT_ERROR__; }
