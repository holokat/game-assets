import { createConstructionYard, createFarmhouse, createWorkerCabin } from '../assets/ruralSites.js';
import { exportInventoryAsset } from './inventory122Export.js';
const assets={'construction-yard':[createConstructionYard,'Construction-Yard'],farmhouse:[createFarmhouse,'Farmhouse'],'worker-cabin':[createWorkerCabin,'Worker-Cabin']},id=new URL(import.meta.url).searchParams.get('id'),[create,title]=assets[id],output=document.querySelector('#output');
try{window.__RURAL_SITES_EXPORT__=await exportInventoryAsset({id,title,create});output.textContent=JSON.stringify(window.__RURAL_SITES_EXPORT__,null,2);window.__RURAL_SITES_EXPORT_READY__=true}catch(error){window.__RURAL_SITES_EXPORT_ERROR__=String(error.stack||error);output.textContent=window.__RURAL_SITES_EXPORT_ERROR__}
