import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {effectById} from '../../data/effect-catalog.js';
import {disposeEffect} from './shapes.js';

/** Optional presentation ground. It never belongs to the exported effect root. */
export function createEffectContext(id){
 const entry=effectById.get(id),root=new THREE.Group();root.name='Environment preview context';if(!entry)return root;
 const wet=['Water'].includes(entry.category)||['fireflies','mist_bank'].includes(id),fire=['Fire and smoke'].includes(entry.category)||id==='chimney_smoke',r=Math.min(entry.radius,2.6),buckets=new Map();
 function add(geometry,color,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){const dummy=new THREE.Object3D();dummy.position.set(...position);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();const g=geometry.toNonIndexed();geometry.dispose();g.applyMatrix4(dummy.matrix);if(!buckets.has(color))buckets.set(color,[]);buckets.get(color).push(g);}
 add(new THREE.CylinderGeometry(r,r*.98,.06,48),'#696c45',[0,-.045,0]);
 if(wet)add(new THREE.CylinderGeometry(r*.78,r*.78,.014,48),'#50777c',[0,-.004,0]);
 else add(new THREE.CylinderGeometry(r*.83,r*.83,.025,40),fire?'#605547':'#767b4c',[0,-.008,0]);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,s=.075+(i%3)*.035;add(new THREE.IcosahedronGeometry(1,1),i%2?'#92927b':'#b3ad96',[Math.cos(a)*r*.9,s*.3,Math.sin(a)*r*.9],[s*1.4,s*.8,s]);}
 for(let i=0;i<32;i++){const a=i*2.399,rad=r*(.75+(i%4)*.05),h=(wet?.42:.15)*(1+(i%5)*.08),x=Math.cos(a)*rad,z=Math.sin(a)*rad;
  add(new THREE.ConeGeometry(wet?.018:.045,h,4),i%2?'#8a995a':'#576c45',[x,h/2,z],[1,1,.45],[0,a,.16*Math.sin(i)]);
  if(!wet&&!fire&&i%4===0){for(let j=0;j<4;j++){const b=j*Math.PI/2;add(new THREE.SphereGeometry(.025,5,3),id==='drifting_petals'?'#d9abb1':'#dac47d',[x+Math.cos(b)*.035,h,z+Math.sin(b)*.035],[1,.4,1]);}}
 }
 if(fire){for(let i=0;i<4;i++)add(new THREE.CylinderGeometry(.09,.11,.8,8),'#463f35',[Math.sin(i)*.1,.08,Math.cos(i)*.1],[1,1,1],[Math.PI/2,0,i*Math.PI/4]);for(let i=0;i<6;i++)add(new THREE.IcosahedronGeometry(.06,0),'#8f5436',[Math.sin(i*4)*.3,.08,Math.cos(i*3)*.2]);}
 for(const[color,geometries]of buckets){const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());const material=new THREE.MeshStandardMaterial({color,roughness:wet&&color==='#50777c'?.24:1,metalness:0,flatShading:true});const mesh=new THREE.Mesh(merged,material);mesh.name='Preview '+color;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 root.userData.previewOnly=true;return root;
}
export {disposeEffect as disposeEffectContext};
