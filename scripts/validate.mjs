import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..'), site = path.join(root,'site');
const catalog = JSON.parse(await readFile(path.join(site,'collections/catalog.json')));
const armor = catalog.entries.filter(e=>e.collection==='armor'), farm = catalog.entries.filter(e=>e.collection==='farm');
assert.equal(armor.length,50);assert.equal(armor.flatMap(e=>e.variants).length,168);assert.equal(farm.length,841);
assert.equal(farm.filter(e=>e.category==='Canonical farm').length,97);
assert.equal(farm.filter(e=>e.category==='Infrastructure').length,344);
assert.equal(farm.filter(e=>e.category==='Beach farm').length,400);
assert.equal(new Set(catalog.entries.map(e=>e.id)).size,catalog.entries.length);
let glbs=0,bytes=0;
for(const entry of catalog.entries) for(const variant of entry.variants){
  const data=await readFile(path.join(site,variant.path));
  assert.equal(data.length,variant.bytes,variant.path);assert.equal(createHash('sha256').update(data).digest('hex'),variant.sha256,variant.path);
  assert.equal(data.toString('ascii',0,4),'glTF',variant.path);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
  const json=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
  assert(!json.buffers?.some(b=>b.uri),'External buffer: '+variant.path);
  assert(!json.images?.some(i=>i.uri),'External image: '+variant.path);
  assert(!(json.extensionsRequired||[]).some(x=>/draco|meshopt|basisu/i.test(x)),'Decoder dependency: '+variant.path);
  glbs++;bytes+=data.length;
}
async function files(dir){const results=[];for(const d of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())results.push(...await files(p));else results.push(p);}return results;}
const shipped=await files(site);
for(const file of shipped) assert((await stat(file)).size < 25*1024*1024,`Oversized static asset: ${file}`);
const appFiles=shipped.filter(f=>f.startsWith(path.join(site,'fantasy-studio'))&&f.endsWith('.js'));
for(const file of appFiles){
  const text=await readFile(file,'utf8');
  for(const match of text.matchAll(/(?:from\s*|import\s*\()\s*['"](\.\.?\/[^'"]+)['"]/g)){
    await stat(path.resolve(path.dirname(file),match[1])).catch(()=>{throw new Error(`Missing import in ${file}: ${match[1]}`)});
  }
}
const html=await readFile(path.join(site,'fantasy-studio/index.html'),'utf8');assert(html.includes('https://github.com/holokat/game-assets'));
assert((await readFile(path.join(root,'LICENSE'),'utf8')).startsWith('MIT License'));
console.log(JSON.stringify({armorDesigns:armor.length,farmAssets:farm.length,glbs,modelMiB:Math.round(bytes/1048576),appModules:appFiles.length,staticFiles:shipped.length,checks:'hashes, GLB containers, no external model dependencies, import paths, hosting limits and license passed'},null,2));
