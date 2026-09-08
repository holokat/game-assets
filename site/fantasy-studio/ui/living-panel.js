import {worldKinds,filterLivingCatalog,livingCatalog,livingByKey} from '../data/living-catalog.js';
import {renderLivingVariants} from './living-variants.js';
const title=value=>String(value||'').replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const words=value=>Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value):String(value??'');
export function createLivingPanel({root=document,onSelect,onKind,onClip,onPlay,onReplay,onSeek,onSpeed,onLoop,onLight,onWire,onSkeleton,onTurn,onContext,onExport,onVariant}){
 const el=id=>root.getElementById(id),removers=[];let kind='creatures',selected='creatures:bandit';
 function listen(node,event,fn){node.addEventListener(event,fn);removers.push(()=>node.removeEventListener(event,fn));}
 function render(){
  const entries=filterLivingCatalog({kind,query:el('living-search').value,filter:el('living-filter').value});
  el('living-count').textContent=`${entries.length} / ${livingCatalog.filter(e=>e.worldKind===kind).length}`;
  el('living-empty').hidden=entries.length>0;el('living-list').replaceChildren();
  for(const entry of entries){const button=root.createElement('button');button.className='living-card';button.dataset.key=entry.key;button.setAttribute('aria-pressed',String(entry.key===selected));
   const img=root.createElement('img');img.src=`/fantasy-studio/assets/living-world/${entry.worldKind}-${entry.id}.png`;img.alt='';img.loading='lazy';img.width=240;img.height=210;img.onerror=()=>{img.hidden=true;};
   const name=root.createElement('span');name.textContent=entry.name;const meta=root.createElement('small');meta.textContent=entry.worldKind==='creatures'?`${title(entry.rig)} · ${entry.tier===6?'Boss':`Tier ${entry.tier}`}`:entry.worldKind==='forage'?title(entry.tag):entry.worldKind==='effects'?entry.category:entry.type==='vfx'?'Effect':entry.size?`${entry.size.map(n=>Number(n)).join(' × ')} m`:'World dressing';
   button.append(img,name,meta);el('living-list').append(button);
  }
 }
 function setKind(value){if(!worldKinds[value])throw new Error(`Unknown library: ${value}`);kind=value;el('living-search').value='';el('living-search').placeholder=`Search ${value}`;el('living-filter').replaceChildren();
  const all=root.createElement('option');all.value='';all.textContent=value==='creatures'?'All rigs':value==='forage'?'All forage tags':value==='dressing'?'All areas':'All effect families';el('living-filter').append(all);
  for(const label of [...new Set(livingCatalog.filter(e=>e.worldKind===kind).map(e=>e.filter))].filter(Boolean)){const option=root.createElement('option');option.value=label;option.textContent=title(label);el('living-filter').append(option);}
  root.querySelectorAll('[data-world-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.worldKind===kind)));render();
 }
 listen(el('living-list'),'click',event=>{const b=event.target.closest('[data-key]');if(b)onSelect(b.dataset.key);});
 root.querySelectorAll('[data-world-kind]').forEach(b=>listen(b,'click',()=>onKind(b.dataset.worldKind)));
 listen(el('living-search'),'input',render);listen(el('living-filter'),'change',render);
 for(const[id,event,fn]of [['living-clip','change',e=>onClip(e.target.value)],['living-play','click',onPlay],['living-replay','click',onReplay],['living-timeline','input',e=>onSeek(+e.target.value)],['living-speed','change',e=>onSpeed(+e.target.value)],['living-loop','change',e=>onLoop(e.target.checked)],['living-light','change',e=>onLight(e.target.value)],['living-wireframe','change',e=>onWire(e.target.checked)],['living-skeleton','change',e=>onSkeleton(e.target.checked)],['living-turn','change',e=>onTurn(e.target.checked)],['living-context','change',e=>onContext(e.target.checked)],['living-export','click',onExport]])listen(el(id),event,fn);
 function inspect(entry,{busy=false,error='',actor=null,clip='idle'}={}){
  selected=entry.key;root.querySelectorAll('.living-card').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.key===selected)));
  el('living-kind').textContent=`${worldKinds[entry.worldKind]} · ${title(entry.filter)}`;el('living-title').textContent=entry.name;el('living-description').textContent=entry.description||'';
  el('living-status').textContent=error|| (busy?'Building asset…':'');el('living-export').disabled=busy||!!error;
  const facts=[];
  if(entry.worldKind==='creatures')facts.push(['Rig family',title(entry.rig)],['Tier',entry.tier===6?'6 · Boss':entry.tier],['Group size',entry.groupSize],['Run speed',`${entry.speed} m/s`],['Moves',entry.moves],['Spawns',entry.where]);
  if(entry.worldKind==='forage')facts.push(['Forage tag',title(entry.tag)],['Difficulty',entry.difficulty],['Seasons',entry.seasons],['Grows',entry.grows||entry.where||entry.growth||entry.placement],['Clump',entry.cluster],['Dry / wet weight',`${entry.dryWeight} / ${entry.wetWeight}`]);
  if(entry.worldKind==='dressing')facts.push(['Source size · W × D × H',entry.size?`${entry.size.join(' × ')} m`:'Effect, no mesh dimensions'],['About how many',entry.count],['Area',entry.zone]);
  if(entry.worldKind==='effects')facts.push(['Duration',`${entry.duration} s`],['Playback',entry.loop?'Loop':'One shot'],['Origin',entry.authored?'Authored studio effect':'Requested source effect']);
  el('living-facts').replaceChildren();for(const[label,value]of facts){if(value===undefined||value===null||value==='')continue;const dt=root.createElement('dt'),dd=root.createElement('dd');dt.textContent=label;dd.textContent=words(value);el('living-facts').append(dt,dd);}
  renderLivingVariants(root,entry,actor,onVariant);
  const effect=entry.worldKind==='effects'||entry.type==='vfx';el('living-context-row').hidden=!effect;el('living-export').textContent=effect?'Export effect preset':actor?.clips?.length?'Export animated GLB':'Export GLB';
  const source=entry.sourceUrl||(typeof entry.source==='string'?entry.source:null);el('living-source').href=source||(entry.worldKind==='creatures'?'https://kaldera-codex.cogentgene.workers.dev/monsters.html':'https://kaldera-codex.cogentgene.workers.dev/dressing.html');el('living-source').hidden=entry.authored===true;
  el('living-source-note').textContent=entry.worldKind==='forage'?'Source growth rules only. Sculpt worlds still require named forage clumps; this studio does not seed the game’s trees.':effect?'Effects export as runtime presets. Their motion and shaders are provided by the studio effect module.':'Detailed studio master. Source dimensions and gameplay metadata remain separate from preview construction.';
  const clips=actor?.clips?.map(c=>c.name)||[];const names=clips.length?clips:effect?['Effect loop']:[];
  el('living-playback').hidden=!names.length;el('living-clip').replaceChildren();for(const name of names){const option=root.createElement('option');option.value=name;option.textContent=title(name);el('living-clip').append(option);}el('living-clip').value=names.includes(clip)?clip:names[0]||'';el('living-skeleton-row').hidden=entry.worldKind!=='creatures';
 }
 setKind(kind);
 return {setKind,inspect,get kind(){return kind;},playback({time,duration,playing}){el('living-time').textContent=`${time.toFixed(1)} s`;el('living-timeline').value=duration?Math.min(1,time/duration):0;el('living-play').textContent=playing?'Pause':'Play';el('living-play').setAttribute('aria-label',playing?'Pause animation':'Play animation');},status:message=>{el('living-status').textContent=message;},dispose(){removers.forEach(fn=>fn());}};
}
