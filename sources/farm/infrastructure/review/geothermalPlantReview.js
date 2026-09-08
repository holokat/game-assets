import { createGeothermalPlant } from '../assets/geothermalPlant.js';
import { startInventoryReview } from './inventory122Review.js';
startInventoryReview({id:'geothermal-plant',create:createGeothermalPlant,camera:[-8.1,5.9,8.5],target:[0,1.5,0]});
