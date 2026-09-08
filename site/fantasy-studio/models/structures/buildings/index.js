import * as THREE from 'three';
import {applyBuildingPalette} from './palette.js';
import {chapel,manor,gateTower,inn,bank,sunkenChapel} from './civic.js';
import {cottageA,cottageB,cottageC,healer,millersHouse} from './cottages.js';
import {stable,smithy,mill,granary,foremansHut} from './workshops.js';
const builders={chapel,manor,gate_tower:gateTower,inn,bank,stable,smithy,cottage_a:cottageA,cottage_b:cottageB,cottage_c:cottageC,healer,mill,millers_house:millersHouse,granary,foremans_hut:foremansHut,chapel_sunken:sunkenChapel};
export const structureIds=Object.freeze(Object.keys(builders));
export function buildStructure(id){const build=builders[id];if(!build)throw new Error(`Unknown building structure: ${id}`);const root=new THREE.Group();root.name=id;root.userData.structureId=id;root.userData.family='buildings';build(root);applyBuildingPalette(root);const features=new Set();root.traverse(o=>{for(const f of o.userData.features||[])features.add(f);});root.userData.features=[...features];root.updateMatrixWorld(true);return root;}
