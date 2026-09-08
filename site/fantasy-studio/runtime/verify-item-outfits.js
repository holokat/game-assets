import {studioClasses} from '../data/studio-classes.js';
import {studioNpcs} from '../data/studio-npcs.js';
import {createReviewSheet} from './review-sheet.js';
import {exportCharacter} from './export.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeItem} from '../models/item-materials.js';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const meshes = root => { const result = []; root.traverse(node => { if (node.isMesh) result.push(node); }); return result; };

/** Browser checks for the complete playable and occupation outfits beside the item library. */
export async function verifyItemOutfits(studio, {result, renderSize}) {
  const {stage} = studio;
  for (const [category, entries] of [['classes', studioClasses], ['npcs', studioNpcs]]) {
    const sheet = createReviewSheet({columns: category === 'classes' ? 4 : 5,
      cellWidth: 320, cellHeight: 470, count: entries.length,
      title: category === 'classes' ? 'Kaldera class outfits' : 'Kaldera NPC outfits'});
    for (const [index, entry] of entries.entries()) {
      await studio.workspace.setMode('character');
      await studio.selectClass(entry.id);
      assert(studio.actor.bodyType === 'neutral', 'Outfit changed the reference body: ' + entry.id);
      assert(JSON.stringify(studio.equipment) === JSON.stringify(entry.equipment), 'Incomplete outfit: ' + entry.id);
      const parts = meshes(studio.actor.group);
      assert(parts.every(mesh => [...mesh.geometry.attributes.position.array].every(Number.isFinite)), 'Nonfinite outfit: ' + entry.id);
      assert(parts.some(mesh => mesh.userData.chibiWardrobe), 'Outfit geometry is missing: ' + entry.id);
      renderSize(sheet.cellWidth, sheet.cellHeight);
      sheet.add(stage.renderer.domElement, entry.name, index);
      result[category].push(entry.id + ':neutral');

      for (const [channel, color, roles] of [
        ['armor', '#315f72', ['metal', 'leather']], ['cloth', '#75508a', ['cloth']],
      ]) {
        const input = document.getElementById(channel + '-color');
        input.value = color;
        input.dispatchEvent(new Event('input'));
        assert(studio.colors[channel] === color, 'Outfit color control did not update: ' + entry.id);
        assert(parts.some(mesh => mesh.userData.chibiWardrobe && roles.includes(mesh.userData.materialRole)
          && '#' + mesh.material.color.getHexString() === color), 'Outfit color did not reach geometry: ' + entry.id);
        result.outfitColorChecks++;
      }
      const buffer = await exportCharacter(studio.actor);
      const parsed = await new GLTFLoader().parseAsync(buffer, '');
      try {
        assert(meshes(parsed.scene).some(mesh => mesh.isSkinnedMesh), 'Export lost skeleton: ' + entry.id);
        assert(!parsed.scene.getObjectByName('Studio ground'), 'Ground leaked into outfit export');
        result.exports++;
      } finally {
        disposeItem(parsed.scene);
      }

      await studio.workspace.setMode('abilities');
      for (const move of ['heavy-attack', 'cast', 'run', 'jump']) {
        studio.workspace.workbench.select('motion', move);
        studio.workspace.workbench.seek(.42);
        stage.renderFrame();
        result.abilityChecks++;
      }
      studio.workspace.workbench.select('ability', entry.id === 'ranger' ? 'aimed-shot' : 'fireball');
      studio.workspace.workbench.seek(.3);
      stage.renderFrame();
      result.abilityChecks++;
      assert(JSON.stringify(studio.equipment) === JSON.stringify(entry.equipment), 'Ability preview changed outfit: ' + entry.id);
    }
    result.sheets.push(await sheet.save('complete-' + category + '-sheet'));
  }
}
