import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../site/preview/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from '../site/preview/vendor/three/build/three.module.js';
const {entries} = JSON.parse(await readFile(new URL('../site/collections/catalog.json',import.meta.url)));
const loader = new GLTFLoader();
let count = 0;
for (const entry of entries) for (const variant of entry.variants) {
  const data = await readFile(new URL('../site' + variant.path,import.meta.url));
  const gltf = await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const bounds = new Box3().setFromObject(gltf.scene);
  assert(!bounds.isEmpty(), `Empty model: ${variant.path}`);
  assert([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),`Invalid bounds: ${variant.path}`);
  const geometries = new Set(), materials = new Set();
  gltf.scene.traverse(node => {
    if (!node.isMesh) return;
    assert(node.geometry.attributes.position.count > 0,variant.path);
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); count++;
}
console.log(`Reloaded ${count} catalog GLBs with GLTFLoader; every model has finite, nonempty bounds.`);
