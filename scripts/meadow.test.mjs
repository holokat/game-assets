import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../site/preview/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {bindPropMotion} from '../site/collections/farm/haven-meadow/runtime/motion.js';

const metadata = JSON.parse(await readFile(new URL('../site/collections/farm/haven-meadow/metadata.json', import.meta.url)));
const catalog = JSON.parse(await readFile(new URL('../site/collections/catalog.json', import.meta.url)));

test('Meadow metadata matches loaded geometry and motion remains independent per placement', async () => {
  const loader = new GLTFLoader();
  assert.equal(metadata.assets.length, 12);
  for (const asset of metadata.assets) {
    const entry = catalog.entries.find(entry => entry.id === asset.id);
    assert.equal(entry.variants[0].path, asset.path);
    const bytes = await readFile(new URL('../site' + asset.path, import.meta.url));
    const {scene} = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    let triangles = 0, meshes = 0;
    scene.traverse(node => {
      if (!node.isMesh) return;
      meshes++;
      triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
    });
    assert.equal(triangles, asset.triangles, asset.id);
    assert.equal(meshes, asset.meshes, asset.id);
    assert(asset.placementEnvelope.every(value => Number.isFinite(value) && value > 0));
    for (const box of asset.collisionBoxes || []) {
      assert.equal(box.length, 6);
      assert(box.every(Number.isFinite));
      assert(box.slice(2, 5).every(value => value > 0));
    }
    if (asset.foliage) assert.deepEqual(asset.collisionBoxes, []);
    const instance = scene.clone(true), update = bindPropMotion(instance);
    if (!asset.motionNodes.length) { assert.equal(update, null); continue; }
    const bases = asset.motionNodes.map(m => scene.getObjectByName(m.node).rotation[m.axis]);
    update(.25); update(.75);
    for (const [i, m] of asset.motionNodes.entries()) {
      const node = instance.getObjectByName(m.node), original = scene.getObjectByName(m.node);
      assert.deepEqual(node.userData.bwMotion, {kind:m.kind, axis:m.axis, speed:m.speed, ...(m.amplitude === undefined ? {} : {amplitude:m.amplitude})});
      assert.equal(original.rotation[m.axis], bases[i], 'Prototype was animated');
      const expected = bases[i] + (m.kind === 'sway' ? Math.sin(m.speed) * m.amplitude : m.speed);
      assert(Math.abs(node.rotation[m.axis] - expected) < 1e-10);
      update(NaN); update(-1); update(Infinity);
      assert.equal(node.rotation[m.axis], expected, 'Invalid time changed pose');
    }
  }
});
