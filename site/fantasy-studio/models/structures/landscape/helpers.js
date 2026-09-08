import * as THREE from 'three';
import {kit, random} from '../primitives.js';
export {THREE, kit, random};
export function make(id){const root=new THREE.Group();root.name=id;root.userData.structureId=id;return {root,k:kit(root)};}
export function rod(k,name,a,b,r,material='wood',sides=10){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const m=k.cylinder(name,av.clone().add(bv).multiplyScalar(.5).toArray(),r,r,d.length()+r*.12,material,sides);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
export function polygon(k,name,points,depth,material,z=-depth/2){const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();const m=k.extrude(name,shape,depth,material);m.position.z=z;return m;}
export function arcBlock(k,name,cx,cy,inner,outer,a,b,depth,mat,z=-depth/2,ellipse=1){const pts=[];const steps=3;for(let i=0;i<=steps;i++){const t=a+(b-a)*i/steps;pts.push([cx+outer*Math.cos(t),cy+outer*Math.sin(t)*ellipse]);}for(let i=steps;i>=0;i--){const t=a+(b-a)*i/steps;pts.push([cx+inner*Math.cos(t),cy+inner*Math.sin(t)*ellipse]);}return polygon(k,name,pts,depth,mat,z);}
export function arch(k,name,{width,height,thickness,depth,z=0,material='stone',segments=17,spring=0}){const outer=width/2,inner=outer-thickness,cy=spring||height-outer;for(let i=0;i<segments;i++){arcBlock(k,`${name} voussoir ${i}`,0,cy,inner,outer,i*Math.PI/segments,(i+1)*Math.PI/segments,depth,i%4===0?'stoneLight':material,z-depth/2);}if(cy>0)for(const x of [-1,1])k.box(`${name} pier ${x}`,[x*(outer-thickness/2),cy/2,z],[thickness,cy+.025,depth],material,.035);}
export function rope(k,name,points,r=.025,mat='rope'){for(let i=1;i<points.length;i++)rod(k,`${name} section ${i}`,points[i-1],points[i],r,mat,8);for(let i=1;i<points.length-1;i++)k.sphere(`${name} bend ${i}`,points[i],[r*1.03,r*1.03,r*1.03],mat,0);}
export function sagRope(k,name,a,b,sag=.1,r=.025,mat='rope'){const points=[];for(let i=0;i<=8;i++){const t=i/8;points.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-Math.sin(Math.PI*t)*sag,a[2]+(b[2]-a[2])*t]);}rope(k,name,points,r,mat);}
export function woodGrain(k,name,p,length,width,axis='y',material='woodLight'){const rng=random(name);for(let j=0;j<4;j++){const u=(j-1.5)*width*.19,v=(rng()-.5)*length*.16;let a,b;if(axis==='y'){a=[p[0]+u,p[1]-length*.39+v,p[2]];b=[p[0]+u*.7,p[1]+length*.39+v,p[2]];}else{a=[p[0]-length*.39+v,p[1],p[2]+u];b=[p[0]+length*.39+v,p[1],p[2]+u*.7];}k.beam(`${name} grain ${j}`,a,b,.006,.009,material);}}
export function bolt(k,name,p,r=.032){const b=k.cylinder(name,p,r,r,.022,'iron',8);b.rotation.x=Math.PI/2;return b;}
/** Place shallow closed surface patches on real faces, never across empty arches. */
export function surfaceHit(k,p,axis='z',targets=null){
 k.root.updateMatrixWorld(true);const normal=new THREE.Vector3(axis==='x'?Math.sign(p[0])||1:0,axis==='y'?1:0,axis==='z'?Math.sign(p[2])||1:0);
 const local=new THREE.Vector3(...p),origin=local.clone().addScaledVector(normal,30).applyMatrix4(k.root.matrixWorld);
 const direction=normal.clone().negate().transformDirection(k.root.matrixWorld);const ray=new THREE.Raycaster(origin,direction,0,60);
 const list=targets||[];if(!targets)k.root.traverse(o=>{if(o.isMesh)list.push(o);});const hit=ray.intersectObjects(list,false)[0];if(!hit)return null;
 const inv=k.root.matrixWorld.clone().invert(),point=hit.point.clone().applyMatrix4(inv);const n=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).transformDirection(inv);
 return {point,normal:n};
}
export function lichen(k,name,p,s,amount=6,material='moss',axis='z'){
 const rng=random(name),targets=[];k.root.traverse(o=>{if(o.isMesh)targets.push(o);});
 for(let i=0;i<amount;i++){const x=(rng()-.5)*s[0]*.8,y=(rng()-.5)*s[1]*.8;
 const pos=axis==='z'?[p[0]+x,p[1]+y,p[2]]:[p[0]+x,p[1],p[2]+y];const hit=surfaceHit(k,pos,axis,targets);if(!hit)continue;
 const rx=Math.min(.15,s[0]*(.027+rng()*.033)),ry=Math.min(.09,s[1]*(.025+rng()*.06));const thickness=.002;
 const m=k.rock(`${name} ${i}`,hit.point.clone().addScaledVector(hit.normal,.0006).toArray(),[rx,ry,thickness],i%4?material:'leafLight',1);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),hit.normal);m.userData.surfaceAttached=true;
 }
}
export function post(k,name,x,z,h=1.1,w=.13,mat='wood'){k.box(`${name} footing`,[x,.06,z],[w*1.32,.12,w*1.32],'woodDark');k.box(name,[x,h/2,z],[w,h,w],mat,.02);k.box(`${name} cap`,[x,h-.01,z],[w*1.14,.08,w*1.14],mat);woodGrain(k,name,[x,h/2,z+w/2+.001],h*.88,w);}
export function stoneRows(k,name,{length,height,depth,x=0,y=0,z=0,rows=5,columns=10,material='stone',core=true}){if(core)k.box(`${name} continuous mortar core`,[x,y+height/2,z],[length,height,depth*.92],'mortar',.01);const rng=random(name);for(let r=0;r<rows;r++){const bounds=[-length/2];const cell=length/columns;for(let j=1;j<columns;j++)bounds.push(-length/2+j*cell+(r%2?cell*.35:0));bounds.push(length/2);for(let j=0;j<bounds.length-1;j++){const w=bounds[j+1]-bounds[j];for(const side of [-1,1])k.box(`${name} course ${r} stone ${j} side ${side}`,[x+(bounds[j]+bounds[j+1])/2,y+(r+.5)*height/rows,z+side*depth*.42],[w-.014,height/rows-.016,depth*.21],[material,'stoneLight','stoneDark'][Math.floor(rng()*3)],.04);}}}
/** Radial mound with a flat triangulated base, irregular concentric shoulders and one apex. */
export function mound(k,name,radius,height,material){const positions=[],indices=[],n=24,rings=[[1,0],[.82,.2],[.49,.61],[.18,.91]];for(let ring=0;ring<rings.length;ring++)for(let j=0;j<n;j++){const a=j*Math.PI*2/n,f=1+.055*Math.sin(a*5+ring*.6);positions.push(Math.cos(a)*radius*rings[ring][0]*f,height*rings[ring][1],Math.sin(a)*radius*rings[ring][0]*f);}for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++){const a=r*n+j,b=r*n+(j+1)%n,c=(r+1)*n+j,d=(r+1)*n+(j+1)%n;indices.push(a,c,b,b,c,d);}const apex=positions.length/3;positions.push(0,height,0);const bottom=positions.length/3;positions.push(0,0,0);for(let j=0;j<n;j++){indices.push((rings.length-1)*n+j,apex,(rings.length-1)*n+(j+1)%n);indices.push(j,(j+1)%n,bottom);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);return k.mesh(name,g,material);}
