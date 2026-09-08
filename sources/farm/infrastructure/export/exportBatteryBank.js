import { createBatteryBank } from '../assets/batteryBank.js';
import { exportInventoryAsset } from './inventory122Export.js';
export const exportBatteryBank=()=>exportInventoryAsset({id:'battery-bank',title:'Battery-Bank',create:createBatteryBank});
const output=document.querySelector('#output');try{window.__BATTERY_BANK_EXPORT_MANIFEST__=await exportBatteryBank();output.textContent=JSON.stringify(window.__BATTERY_BANK_EXPORT_MANIFEST__,null,2);window.__BATTERY_BANK_EXPORT_READY__=true;}catch(error){output.textContent=String(error.stack||error);window.__BATTERY_BANK_EXPORT_ERROR__=String(error.stack||error);}
