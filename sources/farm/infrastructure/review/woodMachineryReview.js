import { createMachineShop, createSawbench, createSawmill } from '../assets/woodMachinery.js';
import { startInventoryReview } from './inventory122Review.js';
const id = new URL(import.meta.url).searchParams.get('id'), assets = { 'machine-shop': [createMachineShop, [-8, 5.8, 8], [0, 1.45, 0]], sawbench: [createSawbench, [-5.4, 3.4, 5.6], [0, 0.75, 0]], sawmill: [createSawmill, [-10, 6.2, 10], [0, 1.35, 0]] }, [create, camera, target] = assets[id];
startInventoryReview({ id, create, camera, target });
