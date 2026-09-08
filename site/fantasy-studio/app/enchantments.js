import {BOW_RELEASE_PHASE} from '../models/bow-poses.js';
import {itemById, itemLabel} from '../data/item-catalog.js';
import {enchantmentById} from '../data/enchantments.js';
import {createEnchantmentState} from '../ui/enchantment-state.js';
import {createEnchantmentPanel} from '../ui/enchantment-panel.js';
import {createEnchantmentSession} from '../runtime/enchantment-session.js';
import {createEnchantmentLighting} from '../runtime/enchantment-lighting.js';
import {ABILITY_BY_ID, MOVE_BY_ID, abilityTiming} from '../vendor/source-library.js';

const inspectors = {character:'#material-inspector',items:'#item-inspector',abilities:'#ability-inspector'};
const offensiveMotions = new Set(['slash','heavy','thrust','spin','shoot']);
export function enchantmentMotionContext(workspace, animator) {
  if (!workspace.active) return animator ? {
    id:animator.motion,time:animator.time,duration:animator.duration,playing:animator.playing,
    impactTime:offensiveMotions.has(animator.motion) ? animator.duration * (animator.motion === 'shoot' ? BOW_RELEASE_PHASE : .48) : null,
  } : null;
  const state = workspace.workbench?.state();
  if (!state) return null;
  let impactTime = null, impactTimes;
  if (state.type === 'ability') {
    const entry = ABILITY_BY_ID.get(state.id);
    if (['slash','impact'].includes(entry?.visual.family) && !state.id.includes('shield')) impactTime = abilityTiming(entry).release;
  } else {
    const move = MOVE_BY_ID.get(state.id);
    const contacts = move?.events.filter(event => ['swing-impact','whirlwind-pulse'].includes(event.type)) || [];
    if (contacts.length) {
      const authored = workspace.workbench.motion.authoredLibrary.eventPhases;
      impactTimes = contacts.map(event => (authored?.get(state.id)?.[event.type] ?? event.at / move.duration) * state.duration);
      impactTime = impactTimes[0];
    }
  }
  return {id:state.type+':'+state.id,time:state.time,duration:state.duration,seekVersion:state.seekVersion,playing:state.playing,impactTime,impactTimes};
}

/** Connects independent effect, saved per-item choice, inspector and the current workspace. */
export function createEditorEnchantments({root=document,stage,getActor,getAnimator,workspace,items,dirty,report,
  state=createEnchantmentState(),createPanel=createEnchantmentPanel,createSession=createEnchantmentSession}) {
  const session = createSession({scene:stage.scene});
  const lighting = createEnchantmentLighting(stage,root.querySelector('.viewport'));
  let night = true, disposed = false, previousUI = '', weaponId = null;
  const panel = createPanel({container:root.querySelector(inspectors.character),
    onChange:selection => apply(weaponId,selection),
    onPause:value => {session.setPlaying(value); refreshPanel(); dirty();},
    onLighting:value => {night=!!value; refresh(); dirty();},
    onImpact:() => {session.setPlaying(true); session.triggerImpact(); refreshPanel(); dirty();},
    onExport:() => {
      try {
        const preset = exportPreset();
        const url = URL.createObjectURL(new Blob([JSON.stringify(preset,null,2)+'\n'],{type:'application/json'}));
        const link = (root.ownerDocument || root).createElement('a');link.href=url;link.download=weaponId+'-'+preset.enchantment.id+'-enchantment.json';
        link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      } catch(error) {report(error);}
    },
  });
  root.querySelector(inspectors.character)?.prepend(panel.element);
  function context() {
    if (!inspectors[workspace.mode]) return {target:null,id:null};
    const target = items.active && items.viewMode === 'item' ? items.preview.model
      : getActor()?.group.userData.loadout?.find(item => item.userData.slot === 'weapon');
    const id = target?.userData.itemId;
    const item = itemById.get(id);
    return item && (item.kind === 'weapon' || ['arrow','bolt'].includes(id)) ? {target,id} : {target:null,id:null};
  }
  function refreshPanel() {
    const item = itemById.get(weaponId), selection = state.selection(weaponId);
    const ui = {weaponId,weaponLabel:item ? itemLabel(item) : '',selection,playing:session.playing,lighting:night};
    const next = JSON.stringify(ui);
    if (next !== previousUI) {panel.update(ui); previousUI=next;}
  }
  function refresh() {
    if (disposed) return false;
    const {target,id} = context();weaponId=id;
    const host = root.querySelector(inspectors[workspace.mode] || inspectors.character);
    if (host && panel.element.parentElement !== host) host.prepend(panel.element);
    const changed = session.bind(target,state.selection(id));
    lighting.set(session.active && night);
    stage.enchantmentActive = session.active;
    refreshPanel();
    return changed;
  }
  function apply(id,selection) {
    try {state.set(id,selection);refresh();dirty();} catch(error) {report(error);throw error;}
  }
  function exportPreset() {
    const selection = state.selection(weaponId), entry = enchantmentById.get(selection.id);
    if (!weaponId || !entry) throw new Error('Choose a weapon enchantment to export');
    return {format:'kaldera-weapon-enchantment',version:1,weaponId,
      enchantment:{id:selection.id,level:selection.level},
      description:entry.description,affinity:entry.affinity,
      usage:'Visual effect preset. Combat damage, proc chances and healing are configured by the game.'};
  }
  return {
    state,panel,session,refresh,apply,exportPreset,
    get weaponId() {return weaponId;},
    update(delta) {
      const changed = refresh();
      const moving = session.update(delta,enchantmentMotionContext(workspace,getAnimator()));
      stage.enchantmentPresentation = session.presentation;
      return changed || moving;
    },
    impact(position) {refresh();session.triggerImpact(position);dirty();},
    seek(time) {refresh();session.seek(time);dirty();},
    setPlaying(value) {session.setPlaying(value);refreshPanel();dirty();},
    setLighting(value) {night=!!value;refresh();dirty();},
    deactivate() {lighting.set(false);session.clear();stage.enchantmentActive=false;stage.enchantmentPresentation=null;},
    dispose() {
      if (disposed) return;disposed=true;
      session.dispose();lighting.dispose();panel.dispose();
      stage.enchantmentActive=false;stage.enchantmentPresentation=null;
    },
  };
}
