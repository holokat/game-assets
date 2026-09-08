import {createSoilMixingStation,animateSoilMixingStation} from '../assets/soilMixingStation.js';
import {startInventoryReview} from './inventory122Review.js';
startInventoryReview({id:'soil-mixing-station',create:createSoilMixingStation,animate:animateSoilMixingStation,camera:[-5.5,3.2,6.6],target:[0,1,0]});
