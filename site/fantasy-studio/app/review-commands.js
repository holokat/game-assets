import {classes} from '../ui/catalog.js';
import {captureSheet, saveCanvas} from '../runtime/capture.js';
import {exportCharacter} from '../runtime/export.js';
import {mountLoadout} from '../models/weapons.js';

/** Optional URL-driven captures and checks. Never loaded from an editor component. */
export async function runReviewCommands(studio, params) {
  const {stage, workspace, items, postReport, errors} = studio;
  async function run(action) {
    try { await action(); } catch (error) { errors.push(String(error.stack || error)); await postReport(); }
  }
  if (params.has('capture')) await run(async () => {
    const capture = await captureSheet(stage, [studio.actor], params.get('capture'), params.get('only'), studio.actor.bodyType);
    await postReport({capture});
  });
  if (params.has('review')) await run(async () => {
    const name = params.get('review');
    for (const entry of classes) await captureSheet(stage, [studio.actor], name + '-' + entry.id, entry.id, studio.actor.bodyType);
    await captureSheet(stage, [studio.actor], name, null, studio.actor.bodyType);
    await postReport({review: name});
  });
  if (params.has('verify')) await run(async () => {
    const {verifyStudio} = await import('../runtime/verify.js');
    await verifyStudio(studio, {mountLoadout, saveCanvas, exportCharacter, errors, postReport});
  });
  if (params.has('view')) await run(() => studio.setView(params.get('view')));
  if (params.has('snapshot')) await run(async () => {
    stage.renderFrame();
    await saveCanvas(stage, params.get('snapshot'));
    await postReport({snapshot: params.get('snapshot')});
  });
  if (params.get('tab') === 'abilities') await run(async () => {
    await workspace.setMode('abilities');
    if (params.has('ability')) workspace.workbench?.select('ability', params.get('ability'));
    if (params.has('move')) workspace.workbench?.select('motion', params.get('move'));
    if (params.has('phase')) workspace.workbench?.seek(Number(params.get('phase')));
    workspace.frame();
  });
  if (params.has('verify-abilities')) await run(async () => {
    const {verifyAbilities} = await import('../runtime/verify-abilities.js');
    await verifyAbilities(studio);
  });
  if (params.has('ability-snapshot')) await run(async () => {
    stage.renderFrame();
    await saveCanvas(stage, params.get('ability-snapshot'));
    await postReport({ability: workspace.workbench?.state()});
  });
  if (params.get('tab') === 'world') await run(async () => {
    await workspace.setMode('world');
    if (params.has('asset')) await studio.world.select(params.get('asset'));
    if (params.has('phase')) studio.world.seek(Number(params.get('phase')));
    if (params.has('view')) studio.setView(params.get('view'));
  });
  if (params.get('tab') === 'structures') await run(async () => {
    await workspace.setMode('structures');
    if (params.has('structure')) await studio.structures.select(params.get('structure'));
    if (params.has('light')) studio.structures.lighting(params.get('light'));
    if (params.has('view')) studio.setView(params.get('view'));
  });
  if (params.get('tab') === 'items') await run(async () => {
    await workspace.setMode('items');
    if (params.has('item')) await items.select(params.get('item'));
    if (params.has('material')) await items.material(params.get('material'), 'finish');
    if (params.get('on-character') === '1') await items.equip();
  });
  if (params.has('item-snapshot')) await run(async () => {
    stage.renderFrame();
    await saveCanvas(stage, params.get('item-snapshot'));
    await postReport({item: items.state()});
  });
  if (params.has('enchantment')) await run(() => {
    studio.enchantments.refresh();
    studio.enchantments.apply(studio.enchantments.weaponId, {id:params.get('enchantment'),level:Number(params.get('level') || 2)});
    studio.enchantments.setLighting(params.get('lighting') !== 'day');
  });
  if (params.has('verify-items')) await run(async () => {
    const {verifyItemStudio} = await import('../runtime/verify-items.js');
    await verifyItemStudio(studio);
  });
  if (params.has('verify-customization')) await run(async () => {
    const {verifyCustomization} = await import('../runtime/verify-customization.js');
    await verifyCustomization(studio);
  });
}
