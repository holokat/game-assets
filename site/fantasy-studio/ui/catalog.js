import {studioClasses} from '../data/studio-classes.js';
import {studioNpcs} from '../data/studio-npcs.js';

const catalogEntry = ({id, name, subtitle, symbol, description, materials}) =>
  Object.freeze({id, title: name, subtitle, symbol, description, materials});
export const classes = Object.freeze(studioClasses.map(catalogEntry));
export const npcs = Object.freeze(studioNpcs.map(catalogEntry));
export const characterEntries = Object.freeze([...classes, ...npcs]);
export const palettes = {
 original:{label:'Outfit colors'},
 ash:{label:'Ash and iron',cloth:'#505660',metal:'#9fa9ac',leather:'#3e3430'},
 ember:{label:'Ember and bronze',cloth:'#773839',metal:'#bb9662',leather:'#3b2821'},
 moss:{label:'Moss and silver',cloth:'#485447',metal:'#9ba9a4',leather:'#593f29'},
};
