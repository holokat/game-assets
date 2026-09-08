import {hairColors,hairColorById,skinTones} from '../data/character-colors.js';

export function createCustomizationPanel({root,change,faceView,reset}){
 const document=root.ownerDocument||globalThis.document;
 root.innerHTML=`<div class="customization-heading"><h2>Appearance</h2><button type="button" id="customization-face" class="text-button">Face view</button></div>
 <div class="customization-label"><span>Hair color</span><output id="hair-color-name"></output></div><div id="hair-color-presets" class="hair-color-presets" role="group" aria-label="Hair color"></div>
 <p id="hair-helmet-note" class="hair-helmet-note" hidden>Hair may be covered by this outfit.</p>
 <div class="customization-label skin-label"><label for="skin-tone">Skin tone</label><output id="skin-tone-name"></output></div>
 <input type="range" id="skin-tone" min="0" max="${skinTones.length-1}" step="1" value="5" aria-describedby="skin-tone-note">
 <div class="skin-range-labels" aria-hidden="true"><span>Light</span><span>Deep</span></div><p id="skin-tone-note">12 preset tones</p>
 <button type="button" id="customization-reset" class="text-button">Reset appearance</button>`;
 const slider=root.querySelector('#skin-tone');
 slider.style.setProperty('--skin-gradient',`linear-gradient(to right,${skinTones.map(t=>t.color).join(',')})`);
 for(const color of hairColors){
  const button=document.createElement('button');button.type='button';button.dataset.hairColor=color.id;button.title=color.label;button.setAttribute('aria-label',color.label);button.setAttribute('aria-pressed','false');
  const swatch=document.createElement('i');swatch.style.background=color.color;button.append(swatch);button.onclick=()=>change({hairColor:color.id});root.querySelector('#hair-color-presets').append(button);
 }
 slider.oninput=()=>change({skinTone:skinTones[Number(slider.value)].id});
 root.querySelector('#customization-face').onclick=faceView;root.querySelector('#customization-reset').onclick=reset;
 return {update(selection,head){
  root.querySelector('#hair-color-name').textContent=hairColorById.get(selection.hairColor).label;
  for(const button of root.querySelectorAll('[data-hair-color]'))button.setAttribute('aria-pressed',String(button.dataset.hairColor===selection.hairColor));
  const index=skinTones.findIndex(t=>t.id===selection.skinTone),tone=skinTones[index];slider.value=String(index);slider.setAttribute('aria-valuetext',`${tone.label}, ${index+1} of ${skinTones.length}`);
  root.querySelector('#skin-tone-name').textContent=tone.label;root.querySelector('#hair-helmet-note').hidden=head==='none';
 },dispose(){for(const element of root.querySelectorAll('button,input,select')){element.onclick=null;element.oninput=null;element.onchange=null;}}};
}
