import {structureCatalog,structureById} from '../data/structure-catalog.js';
import {createDOMScope} from './dom-scope.js';

/** Catalog facts remain in data; this panel owns filters, selection and event teardown. */
export function createStructurePanel({root=document,select,lighting,wireframe,rotate,animate,exportModel}){
 const dom=createDOMScope(root),el=id=>dom.get(id),cards=new Map();let selected='inn';
 const zones=[...new Set(structureCatalog.map(e=>e.zone))];
 for(const zone of zones){const option=document.createElement('option');option.value=zone;option.textContent=zone;el('structure-zone').append(option);}
 function filter(){
  const q=el('structure-search').value.trim().toLowerCase(),zone=el('structure-zone').value;
  let count=0;for(const entry of structureCatalog){const match=(!zone||entry.zone===zone)&&(!q||`${entry.name} ${entry.id} ${entry.description} ${entry.prompt}`.toLowerCase().includes(q));cards.get(entry.id).hidden=!match;if(match)count++;}
  el('structure-count').textContent=`${count} of ${structureCatalog.length}`;el('structure-empty').hidden=count>0;
 }
 for(const entry of structureCatalog){
  const button=document.createElement('button');button.type='button';button.className='structure-card';button.dataset.structure=entry.id;button.setAttribute('aria-pressed','false');
  const img=document.createElement('img');img.alt='';img.loading='lazy';img.width=192;img.height=144;img.src=`/outputs/structures/thumbnails/${entry.id}.png`;
  img.addEventListener('error',()=>{img.hidden=true;},{once:true});
  const name=document.createElement('span');name.textContent=entry.name;
  const dimensions=document.createElement('small');dimensions.textContent=entry.size.join(' × ')+' m';button.append(img,name,dimensions);button.addEventListener('click',()=>select(entry.id));cards.set(entry.id,button);el('structure-list').append(button);
 }
 dom.on('structure-search','input',filter);dom.on('structure-zone','change',filter);
 dom.on('structure-light','change',e=>lighting(e.target.value));dom.on('structure-wireframe','change',e=>wireframe(e.target.checked));dom.on('structure-turn','change',e=>rotate(e.target.checked));dom.on('structure-animate','change',e=>animate(e.target.checked));dom.on('structure-export','click',()=>exportModel());
 filter();
 return {filter,
  update(id,{busy=false,stats=null,error=null}={}){
   selected=id;const entry=structureById.get(id);if(!entry)return;
   for(const[key,card]of cards)card.setAttribute('aria-pressed',String(key===id));
   el('structure-title').textContent=entry.name;el('structure-kind').textContent=entry.kind;el('structure-description').textContent=entry.description;el('structure-prompt').textContent=entry.prompt;
   el('structure-dimensions').textContent=entry.size.join(' × ')+' m';el('structure-location').textContent=entry.zone;
   el('structure-export').disabled=busy;el('structure-export').textContent=busy?'Building model…':'Export structure GLB';
   el('structure-status').textContent=error|| (busy?'Building the selected structure…':stats?`${stats.triangles.toLocaleString()} triangles · ${stats.drawCalls} draw call${stats.drawCalls===1?'':'s'}. ${stats.triangles>stats.runtimeTriangleBudget?'Studio detail exceeds the MMO’s '+stats.runtimeTriangleBudget.toLocaleString()+' triangle budget.':'Within the MMO’s triangle budget.'}`:'');
   el('structure-motion-control').hidden=id!=='mill_wheel'&&!stats?.effectSockets?.length;
  },
  get selected(){return selected;},
  dispose(){dom.dispose();el('structure-list').replaceChildren();cards.clear();},
 };
}
