import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base = process.argv[2] || 'https://game-assets.cogentgene.workers.dev';
const root = new URL('../site/',import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(await readFile(new URL('collections/catalog.json',root)));
const home=await fetch(base);assert(home.ok,'Homepage unavailable');assert(home.url.includes('/fantasy-studio/'),'Root redirect missing');assert((await home.text()).includes('https://github.com/holokat/game-assets'),'GitHub link missing');
const paths=['/collections/catalog.json','/LICENSE','/fantasy-studio/index.html','/fantasy-studio/ui/collection-workspace.js','/fantasy-studio/ui/collections.css','/fantasy-studio/ui/export-panel.js','/fantasy-studio/runtime/capture.js','/fantasy-studio/runtime/source-effects.js','/studio/public/vfx/spell-fire-explosion-atlas.png','/studio/public/animations/quaternius-retargeted.json'];
for(const id of ['cloth_head','leather_chest','plate_chest','canonical:storage-shed','canonical:picnic-area','infrastructure:well','beach:agricultural-drones']){
 const entry=catalog.entries.find(e=>e.id===id);paths.push(entry.variants.at(-1).path);
}
let checked=0;
for(let start=0;start<paths.length;start+=4)await Promise.all(paths.slice(start,start+4).map(async path=>{
 const response=await fetch(base+path);assert.equal(response.status,200,path);
 const actual=Buffer.from(await response.arrayBuffer()), expected=await readFile(new URL('.'+path,root));assert.equal(sha(actual),sha(expected),'Deployed bytes differ: '+path);
 if(path.endsWith('.glb')){assert(response.headers.get('content-type')?.includes('model/gltf-binary'),path);assert.equal(response.headers.get('access-control-allow-origin'),'*',path);}
 checked++;
}));
assert.equal((await fetch(base+'/collections/missing-asset.glb')).status,404,'Missing asset must return 404');
for(const workspace of ['armor','farm','effects','abilities'])assert((await fetch(`${base}/fantasy-studio/?workspace=${workspace}`)).ok,workspace);
console.log(`Live deployment passed: ${checked} byte-matched files, homepage, GitHub link, all new tab URLs, GLB content types/CORS and missing-asset behavior.`);
