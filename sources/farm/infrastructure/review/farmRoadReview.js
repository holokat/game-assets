import { createFarmRoad } from '../assets/farmRoad.js';
import { startInventoryReview } from './inventory122Review.js';
startInventoryReview({ id: 'farm-road', create: createFarmRoad, camera: [-5.5, 4.9, 6.7], target: [0, .12, 0] });
