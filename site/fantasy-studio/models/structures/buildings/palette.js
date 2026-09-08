/** User-directed dark oak/walnut palette, scoped to architecture only.
 * Keep surface roles and PBR properties so wood, masonry and metal still read
 * as separate materials under the same warm, weathered color direction.
 */
const palette = Object.freeze({
  wood: '#3e291c', woodDark: '#271b14', woodLight: '#65432a', endgrain: '#785233',
  plaster: '#6c4d33', whitewash: '#79593c',
  thatch: '#73502b', straw: '#987043',
  slate: '#453124', slateDark: '#2d211a', slateLight: '#694c33',
  stone: '#62503f', stoneLight: '#80694f', stoneDark: '#41352c',
  flint: '#4d3d30', mortar: '#695641', chalk: '#887154',
  iron: '#302923', steel: '#756557', copper: '#705038', brass: '#90703e',
  rope: '#86643e', cloth: '#74583c', blue: '#57412f', green: '#695031',
  leaf: '#725333', leafLight: '#947142', leafDark: '#493923', moss: '#5c482d',
  flowerBlue: '#9a7149', flowerPink: '#935e42', flower: '#b38b55',
  water: '#493c2f', glass: '#b78243',
});

export function applyBuildingPalette(root) {
  const visited = new Set();
  root.traverse(part => {
    if (!part.isMesh || !part.material) return;
    const color = palette[part.userData.surface];
    if (!color) return;
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (visited.has(material)) continue;
      visited.add(material);
      material.color.set(color);
      if (part.userData.surface === 'glass') {
        material.emissive.set(color);
        material.emissiveIntensity = 0.45;
      }
    }
  });
  root.userData.features = [...(root.userData.features || []), 'Dark oak and walnut color direction with warm weathered roofing'];
}
