import {effectCatalog} from '/fantasy-studio/data/effect-catalog.js';
const studio = window.studio;
const result = {checks:[],errors:[]};
function assert(value, message) { if (!value) throw new Error(message); }
function mark(message) { result.checks.push(message); }
const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
try {
  await studio.workspace.setMode('armor');
  await studio.collections.select('leather_chest',5);
  assert(studio.collections.model, 'Armor preview missing');
  assert(document.querySelector('#collection-download').href.endsWith('leather_chest-female-scaledHide.glb'),'Armor variant download mismatch');
  const search = document.querySelector('#collection-search'); search.value='zzzz-no-asset';search.dispatchEvent(new Event('input'));
  assert(!document.querySelector('#collection-empty').hidden,'Empty search state missing');search.value='';search.dispatchEvent(new Event('input'));
  mark('Armor variants, search, empty state and download link');
  await studio.workspace.setMode('farm');
  for (const [id,variant] of [['canonical:storage-shed',0],['infrastructure:well',1],['beach:agricultural-drones',0]]) {
    await studio.collections.select(id,variant);assert(studio.collections.model,'Farm preview missing: '+id);studio.stage.renderFrame();
  }
  mark('All three farm collections and hierarchy variant rendered');
  // Leaving while a GLB is loading must not reattach it or hide the next workspace.
  const pending = studio.collections.select('canonical:botanical-garden');
  await studio.workspace.setMode('character');await pending;
  assert(studio.actor.group.visible&&!studio.collections.active&&!studio.collections.presentation.root.visible,'Stale collection visibility');
  mark('Pending model load safely cancelled by tab switch');
  await studio.workspace.setMode('effects');
  for(const effect of effectCatalog){await studio.world.select('effects:'+effect.id);studio.world.seek(.55);studio.stage.renderFrame();}
  assert(!document.querySelector('#living-library').hidden,'Effects panel hidden');
  mark(`${effectCatalog.length} ambient effects sampled and rendered`);
  await studio.workspace.setMode('abilities');
  assert(studio.workspace.workbench,'Spell workbench missing');
  for(const ability of studio.workspace.workbench.abilities){studio.workspace.workbench.select('ability',ability.id);studio.workspace.workbench.seek(.58);studio.stage.renderFrame();}
  mark(`${studio.workspace.workbench.abilities.length} abilities sampled with effects`);
  for(const motion of studio.workspace.workbench.motions){studio.workspace.workbench.select('motion',motion.id);studio.workspace.workbench.seek(.5);studio.stage.renderFrame();}
  mark(`${studio.workspace.workbench.motions.length} motions sampled`);
  await studio.workspace.setMode('farm');
  assert(!document.querySelector('#collection-library').hidden&&document.querySelector('#living-library').hidden,'Shared panel tab state mismatch');
  assert(!studio.actor.group.visible,'Character overlaps collection');
  mark('Repeated workspace transitions restore panels and stage');
  assert(studio.errors.length===0,'Runtime errors: '+studio.errors.join('\n'));
  result.passed=true;
} catch(error) {result.errors.push(String(error.stack||error));result.passed=false;}
await studio.postReport({publication:result});
const badge=document.createElement('output');badge.id='publication-result';badge.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:100;background:#fff;padding:16px;border:1px solid #ccc;border-radius:8px;max-width:80vw;font:14px system-ui';badge.textContent=result.passed?'Publication checks passed: '+result.checks.join('; '):result.errors.join('\n');document.body.append(badge);
