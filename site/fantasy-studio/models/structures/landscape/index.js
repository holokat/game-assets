import {THREE} from './helpers.js';
import {waystone,boundary,milestone,headstone} from './markers.js';
import {flintWall,dryWall,stoneBridge,cellarArch} from './masonry.js';
import {fence,stablePen,footbridge,eelWeir,palisade,lookout} from './timber.js';
import {chalkCliff,headframe,mineMouth,rails,spoil} from './mining.js';
import {hedge,fallenBeech,badgerSett,lilyPads} from './vegetation.js';
import {lane,rooting,steppingStones,roadSlab,roadKerb} from './terrain.js';
const builders={waystone_village:waystone,flint_wall_4m:()=>flintWall(),flint_wall_corner:()=>flintWall(true),hedge_4m:hedge,stone_bridge_10m:stoneBridge,stable_pen:stablePen,mound_fence:()=>fence('mound_fence'),lane_slab:lane,boundary_stone:boundary,eel_weir:eelWeir,footbridge,stepping_stones:steppingStones,fallen_beech:fallenBeech,badger_sett:badgerSett,rooting_patch:rooting,chalk_face_4m:chalkCliff,headframe,mine_mouth:mineMouth,spoil_heap:spoil,rail_2m:rails,cellar_arch:cellarArch,camp_fence:()=>fence('camp_fence'),milestone,road_kerb:roadKerb,road_slab_2m:roadSlab,lookout_platform:lookout,palisade_stake_3m:palisade,headstone_a:()=>headstone('headstone_a'),headstone_b:()=>headstone('headstone_b'),headstone_c:()=>headstone('headstone_c'),headstone_d:()=>headstone('headstone_d'),headstone_e:()=>headstone('headstone_e'),lily_pad_patch:lilyPads,stone_wall_4m:dryWall,fence_rail_3m:()=>fence('fence_rail_3m')};
export const structureIds=Object.freeze(Object.keys(builders));
export function buildStructure(id){if(!Object.hasOwn(builders,id))throw new Error(`Unknown landscape structure: ${id}`);const root=builders[id]();root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root);const offset=new THREE.Vector3(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,-(bounds.min.z+bounds.max.z)/2);for(const child of root.children)child.position.add(offset);root.updateMatrixWorld(true);return root;}
