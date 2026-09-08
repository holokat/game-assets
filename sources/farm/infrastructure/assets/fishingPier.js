import{createCoastalPier}from'./coastalPier.js';export function createFishingPier(){const r=createCoastalPier(),q=r.getObjectByName('coastal-pier-root');if(q)q.name='fishing-pier-root';return r;}
