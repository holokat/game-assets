import { createBiomassGenerator } from '../assets/biomassGenerator.js';
import { exportInventoryAsset } from './inventory122Export.js';
export const exportBiomassGenerator=()=>exportInventoryAsset({id:'biomass-generator',title:'Biomass-Generator',create:createBiomassGenerator});
const output=document.querySelector('#output');try{window.__BIOMASS_GENERATOR_EXPORT_MANIFEST__=await exportBiomassGenerator();output.textContent=JSON.stringify(window.__BIOMASS_GENERATOR_EXPORT_MANIFEST__,null,2);window.__BIOMASS_GENERATOR_EXPORT_READY__=true;}catch(error){output.textContent=String(error.stack||error);window.__BIOMASS_GENERATOR_EXPORT_ERROR__=String(error.stack||error);}
