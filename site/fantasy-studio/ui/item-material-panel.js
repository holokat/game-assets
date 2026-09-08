import {sentenceCase} from '../data/item-catalog.js';
import {materialPresets, materialGroups, materialById} from '../data/materials.js';

/** Owns material swatches, target availability, and selection feedback. */
export function createItemMaterialPanel({material, root = document}) {
  const ownerDocument = root.ownerDocument ?? root;
  const element = id => root.querySelector(`#${id}`);
  const container = element('item-swatches');
  const target = element('item-material-target');
  const reset = element('item-material-reset');
  const finish = element('item-finish');
  const construction = ownerDocument.createElement('section');
  construction.className = 'item-construction';
  construction.hidden = true;
  const constructionHeading = ownerDocument.createElement('h3');
  constructionHeading.textContent = 'Construction';
  const constructionChoices = ownerDocument.createElement('div');
  constructionChoices.className = 'item-construction-choices';
  constructionChoices.setAttribute('role', 'group');
  constructionChoices.setAttribute('aria-label', 'Shield construction');
  const constructionButtons = ['wood', 'metal'].map(value => {
    const button = ownerDocument.createElement('button');
    button.type = 'button';
    button.dataset.construction = value;
    button.textContent = sentenceCase(value);
    constructionChoices.append(button);
    return button;
  });
  construction.append(constructionHeading, constructionChoices);
  target.parentNode.insertBefore(construction, target.previousElementSibling);
  const groups = [];
  const buttons = [];
  let chosen = {};
  let available = new Set();
  let disposed = false;

  for (const [role, label] of materialGroups) {
    const group = ownerDocument.createElement('section');
    group.className = 'item-material-group';
    group.dataset.role = role;
    const heading = ownerDocument.createElement('h3');
    heading.textContent = label;
    group.append(heading);

    const swatches = ownerDocument.createElement('div');
    swatches.className = 'item-swatches';
    for (const preset of materialPresets.filter(preset => preset.role === role)) {
      const button = ownerDocument.createElement('button');
      const label = sentenceCase(preset.name);
      button.type = 'button';
      button.dataset.material = preset.id;
      button.dataset.role = preset.role;
      button.title = label;
      button.setAttribute('aria-label', label);
      const chip = ownerDocument.createElement('i');
      chip.style.background = preset.color;
      const name = ownerDocument.createElement('span');
      name.textContent = label;
      button.append(chip, name);
      buttons.push(button);
      swatches.append(button);
    }
    group.append(swatches);
    groups.push(group);
    container.append(group);
  }

  function updatePressed() {
    for (const button of buttons) {
      const role = button.dataset.role;
      button.disabled = !available.has(role) || (target.value !== 'finish' && target.value !== role);
      const effective = chosen[role] || (materialById.get(chosen.finish)?.role === role ? chosen.finish : undefined);
      button.setAttribute('aria-pressed', String(effective === button.dataset.material));
      button.title = button.disabled ? `${button.getAttribute('aria-label')}: no ${role} parts selected` : button.getAttribute('aria-label');
    }
    for (const group of groups) group.hidden = !available.has(group.dataset.role) || (target.value !== 'finish' && target.value !== group.dataset.role);
  }

  function selectMaterial(event) {
    const button = event.target.closest('[data-material]');
    if (button && !button.disabled && container.contains(button)) material(button.dataset.material, target.value);
  }

  const resetMaterial = () => material(null, 'all');
  const selectConstruction = event => {
    const button = event.target.closest('[data-construction]');
    if (button && construction.contains(button)) material(button.dataset.construction, 'construction');
  };
  construction.addEventListener('click', selectConstruction);
  container.addEventListener('click', selectMaterial);
  reset.addEventListener('click', resetMaterial);
  target.addEventListener('change', updatePressed);

  return {
    update(selection, targets, item) {
      if (disposed) return;
      chosen = {...selection};
      construction.hidden = item?.kind !== 'shield';
      for (const button of constructionButtons) button.setAttribute('aria-pressed', String(button.dataset.construction === (chosen.construction || 'wood')));
      available = new Set(targets);
      const main = materialById.get(chosen.finish);
      const applied = [...available].map(role => materialById.get(chosen[role]) || (main?.role === role ? main : undefined)).filter(Boolean);
      finish.textContent = applied.length ? applied.map(preset => sentenceCase(preset.name)).join(' · ') : 'Original materials';
      for (const option of target.options) {
        option.disabled = option.value !== 'finish' && !targets.has(option.value);
      }
      if (target.selectedOptions[0]?.disabled) target.value = 'finish';
      updatePressed();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      container.removeEventListener('click', selectMaterial);
      reset.removeEventListener('click', resetMaterial);
      target.removeEventListener('change', updatePressed);
      construction.removeEventListener('click', selectConstruction);
      construction.remove();
      for (const group of groups) group.remove();
    },
  };
}
