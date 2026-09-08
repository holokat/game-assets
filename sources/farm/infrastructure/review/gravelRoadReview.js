import { createGravelRoad } from '../assets/gravelRoad.js';
import { startInventoryReview } from './inventory122Review.js';
startInventoryReview({ id: 'gravel-road', create: createGravelRoad, camera: [-5.4, 4.7, 6.6], target: [0, .08, 0] });
