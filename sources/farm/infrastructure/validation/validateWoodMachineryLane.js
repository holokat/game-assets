import { createMachineShop, createSawbench, createSawmill } from '../assets/woodMachinery.js';
import { validateInventoryAsset } from './inventory122Validation.js';
const assets = {
  'machine-shop': [createMachineShop, 'Machine-Shop', ['machine-shop-grounded-concrete-slab-mesh', 'machine-shop-front-access-header-mesh', 'machine-shop-lathe-base-mesh']],
  sawbench: [createSawbench, 'Sawbench', ['sawbench-long-narrow-work-surface-mesh', 'sawbench-visible-circular-saw-blade-mesh', 'sawbench-teal-motor-housing-mesh']],
  sawmill: [createSawmill, 'Sawmill', ['sawmill-grounded-concrete-strip-mesh', 'sawmill-long-log-carriage-bed-mesh', 'sawmill-guarded-saw-head-mesh']],
};
const id = new URL(import.meta.url).searchParams.get('id'), [create, title, criticalNodes] = assets[id], output = document.querySelector('#output');
try { window.__WOOD_MACHINERY_VALIDATION__ = await validateInventoryAsset({ id, title, create, budget: 5000, criticalNodes, expectedChannels: [] }); output.textContent = window.__WOOD_MACHINERY_VALIDATION__.checks.map(check => `${check.passed ? 'PASS' : 'FAIL'}: ${check.name}`).join('\n'); window.__WOOD_MACHINERY_VALIDATION_READY__ = true; } catch (error) { window.__WOOD_MACHINERY_VALIDATION_ERROR__ = String(error.stack || error); output.textContent = window.__WOOD_MACHINERY_VALIDATION_ERROR__; }
