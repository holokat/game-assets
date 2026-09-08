import { createGeothermalPlant } from '../assets/geothermalPlant.js';
import { exportInventoryAsset } from './inventory122Export.js';
export const exportGeothermalPlant=()=>exportInventoryAsset({id:'geothermal-plant',title:'Geothermal-Plant',create:createGeothermalPlant});
const output=document.querySelector('#output');try{window.__GEOTHERMAL_PLANT_EXPORT_MANIFEST__=await exportGeothermalPlant();output.textContent=JSON.stringify(window.__GEOTHERMAL_PLANT_EXPORT_MANIFEST__,null,2);window.__GEOTHERMAL_PLANT_EXPORT_READY__=true;}catch(error){output.textContent=String(error.stack||error);window.__GEOTHERMAL_PLANT_EXPORT_ERROR__=String(error.stack||error);}
