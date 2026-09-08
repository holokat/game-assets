import * as THREE from 'three';
import {kit,random} from '../primitives.js';

// Chisel only the visible stone perimeter, keeping relief blocks at 28 triangles.
function dressedBlock(k,name,p,size,material){const [w,h,d]=size,b=Math.min(.038,w*.15,h*.15),s=new THREE.Shape();s.moveTo(-w/2+b,-h/2);s.lineTo(w/2-b,-h/2);s.lineTo(w/2,-h/2+b);s.lineTo(w/2,h/2-b);s.lineTo(w/2-b,h/2);s.lineTo(-w/2+b,h/2);s.lineTo(-w/2,h/2-b);s.lineTo(-w/2,-h/2+b);s.closePath();const m=k.extrude(name,s,d,material);m.position.set(p[0],p[1],p[2]-d/2);return m;}
function leadCame(k,a,b){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av),m=k.box('Diamond lead came',av.clone().add(bv).multiplyScalar(.5).toArray(),[.021,delta.length()+.002,.023],'iron',0);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
// Closed building volumes, with a continuous backing beneath relief masonry.
export function wall(root,name,p,w,h,d,{material='stone',stone=true,base=0}={}){
 const k=kit(root),g=k.group(name,p),a=kit(g);a.box(`${name} continuous core`,[0,h/2,0],[w,h,d],stone?'mortar':material,.025);
 if(stone){for(const [side,length,z,rotation] of [['front',w,d/2,0],['back',w,d/2,Math.PI],['right',d,w/2,Math.PI/2],['left',d,w/2,-Math.PI/2]]){
  const f=a.group(`${name} ${side} coursed face`);f.rotation.y=rotation;const q=kit(f),rng=random(`${name}${side}`),rows=Math.ceil(h/.54),rh=h/rows;
  for(let row=0;row<rows;row++){const n=Math.ceil(length/.92),sw=length/n;for(let j=0;j<=n;j++){let left=-length/2+j*sw-(row%2)*sw/2,right=Math.min(length/2,left+sw);left=Math.max(-length/2,left);if(right-left<.04)continue;
   dressedBlock(q,`Dressed stone ${side} ${row} ${j}`,[(left+right)/2,(row+.5)*rh,z+.026],[(right-left)-.035,rh-.035,.16],rng()>.76?'stoneLight':rng()>.65?'stoneDark':material,.042);
  }}
 }}
 if(base){a.box(`${name} plinth`,[0,.13,0],[w+.18,.26,d+.18],'stoneDark');a.box(`${name} plinth cap`,[0,.3,0],[w+.24,.13,d+.24],'stoneLight');}
 return g;
}
export function quoins(root,w,d,h,y=0){const k=kit(root);for(const x of [-1,1])for(const z of [-1,1])for(let i=0;i<Math.ceil(h/.48);i++){const rh=h/Math.ceil(h/.48);k.box(`Corner quoin ${x} ${z} ${i}`,[x*(w/2-.12),y+(i+.5)*rh,z*(d/2-.12)],[i%2?.64:.43,rh-.022,i%2?.43:.64],i%3?'stoneLight':'stone',.045);}}
export function timberFrame(root,w,d,h,{y=0,panels=4,diagonals=true}={}){
 const k=kit(root);for(const sy of [y+.12,y+h-.12])k.box('Continuous timber ring',[0,sy,0],[w+.16,.24,d+.16],'woodDark');
 for(const [length,depth,rot] of [[w,d/2,0],[w,d/2,Math.PI],[d,w/2,Math.PI/2],[d,w/2,-Math.PI/2]]){const g=k.group('Mortised timber wall');g.rotation.y=rot;const a=kit(g),n=Math.max(2,Math.round(length/2.15));
  for(let i=0;i<=n;i++){const x=-length/2+i*length/n;a.box('Timber post',[x,y+h/2,depth+.065],[.2,h,.2],'woodDark');for(const yy of [y+.22,y+h-.22])a.cylinder('Exposed oak joint peg',[x,yy,depth+.166],.036,.036,.024,'endgrain',8).rotation.x=Math.PI/2;}
  if(diagonals)for(let i=0;i<n;i++){const x=-length/2+i*length/n;a.beam('Diagonal wall brace',[x+.08,y+.22,depth+.06],[x+length/n-.08,y+h-.22,depth+.06],.13,.12,'wood');}
 }
}
export function facade(root,name,pos,rotation,build){const g=kit(root).group(name,pos);g.rotation.y=rotation;build(kit(g),g);return g;}
function archShape(w,h,pointed){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h*.63);if(pointed){s.quadraticCurveTo(w*.47,h*.8,0,h);s.quadraticCurveTo(-w*.47,h*.8,-w/2,h*.63);}else{s.absarc(0,h-w/2,w/2,0,Math.PI,false);}s.lineTo(-w/2,0);return s;}
export function door(root,pos,{w=1.4,h=2.3,rotation=0,arched=false,iron=false,double=false}={}){
 return facade(root,'Recessed framed door',pos,rotation,(k)=>{
  if(arched){k.extrude('Dark arched recess backing',archShape(w+.27,h+.2,true),.09,'woodDark');const p=k.extrude('Solid oak arched door',archShape(w,h,true),.12,'wood');p.position.z=.09;
   const n=14;for(let i=0;i<n;i++){let t=i/(n-1),x=(t-.5)*(w+.45),yy=h*.64+(1-Math.pow(Math.abs(t-.5)*2,1.5))*h*.4;const b=k.box(`Arch voussoir ${i}`,[x,yy,.148],[.25,.34,.3],'stoneLight');b.rotation.z=(.5-t)*1.65;}
  }else{k.box('Deep door rebate',[0,h/2,.02],[w+.32,h+.19,.15],'woodDark');k.box('Solid door backing',[0,h/2,.12],[w,h,.16],'wood');k.box('Door header',[0,h+.055,.15],[w+.45,.22,.35],'woodDark');}
  const n=Math.ceil(w/.18);for(let i=0;i<n;i++){const x=-w/2+(i+.5)*w/n,top=arched?h*.64+(1-Math.pow(Math.abs(x)/(w/2),1.5))*h*.33:h;k.box('Individual oak door board',[x,top/2,.225],[w/n-.015,top,.04],i%3?'wood':'woodLight',.008);}
  for(const x of [-w/2-.12,w/2+.12])k.box('Door jamb',[x,h*.34,.13],[.23,h*.68,.3],arched?'stoneLight':'woodDark');
  for(const y of [h*.21,h*.62]){k.box('Strap hinge',[0,y,.265],[w*.92,.075,.048],iron?'iron':'woodDark',.012);for(const x of [-w*.39,-w*.15,w*.15,w*.39])k.sphere('Hinge rivet',[x,y,.292],[.029,.029,.018],'iron',0);}
  if(double)k.box('Double door central seam',[0,h*.42,.258],[.025,h*.84,.02],'woodDark',0);
  k.box('Latch plate',[w*.22,h*.44,.278],[.17,.24,.045],'iron');k.torus('Forged door pull',[w*.22,h*.44,.319],.09,.022,'iron');
  k.box('Worn stone threshold',[0,.015,.2],[w+.35,.12,.62],'stoneLight',.05);
 });
}
export function window(root,pos,{w=1.05,h=1.3,rotation=0,pointed=false,bars=false,shutters=false}={}){
 return facade(root,'Deep leaded window',pos,rotation,(k)=>{
  if(pointed){k.extrude('Pointed window masonry surround',archShape(w+.25,h+.25,true),.13,'stoneLight');const dark=k.extrude('Pointed window inset shadow',archShape(w,h,true),.07,'woodDark');dark.position.set(0,.085,.136);const glass=k.extrude('Recessed pointed glazing',archShape(w-.13,h-.11,true),.025,'glass');glass.position.set(0,.13,.2);}
  else{k.box('Window stone surround',[0,h/2,.02],[w+.28,h+.28,.19],'stoneLight');k.box('Window dark rebate',[0,h/2,.135],[w+.04,h+.05,.07],'woodDark');k.box('Recessed amber panes',[0,h/2,.181],[w-.1,h-.09,.035],'glass');}
  const gh=pointed?h*.68:h-.12,gw=w-.12,leadZ=pointed?.232:.216;for(let i=-3;i<=3;i++){const offset=i*.32;for(const sign of [-1,1]){const xa=Math.max(-gw/2,(-gh/2-offset)/sign),xb=Math.min(gw/2,(gh/2-offset)/sign);let lo=Math.min(xa,xb),hi=Math.max(xa,xb); // clipped diagonal lines in pane rectangle
   const pts=[];for(const x of [-gw/2,gw/2]){const y=sign*x+offset;if(Math.abs(y)<=gh/2+.001)pts.push([x,y]);}for(const y of [-gh/2,gh/2]){const x=(y-offset)/sign;if(Math.abs(x)<gw/2-.001)pts.push([x,y]);}if(pts.length===2)leadCame(k,[pts[0][0],pts[0][1]+gh/2+.09,leadZ],[pts[1][0],pts[1][1]+gh/2+.09,leadZ]);
  }}
  k.box('Central mullion',[0,h*.48,.22],[.065,h*.88,.085],'woodDark');k.box('Window sill',[0,-.025,.1],[w+.42,.14,.38],'stoneLight');
  if(bars){for(let i=0;i<5;i++)k.box('Forged security bar',[-w*.4+i*w*.2,h/2,.263],[.045,h+.15,.045],'iron');k.box('Masonry-anchored iron window crosshead',[0,h+.05,.23],[w+.25,.075,.28],'iron');}
  if(shutters)for(const side of [-1,1]){const x=side*(w*.76+.12);k.box('Shutter leaf',[x,h/2,.06],[w*.43,h,.11],'wood');for(let j=0;j<3;j++)k.box('Shutter board relief',[x+(j-1)*w*.125,h/2,.125],[w*.115,h-.04,.025],'woodLight',.005);for(const yy of [h*.2,h*.8])k.box('Shutter iron strap',[x,yy,.148],[w*.42,.045,.033],'iron');}
 });
}
export function steps(root,pos,w=2,count=3,rise=.2,run=.36){const k=kit(root);for(let i=0;i<count;i++)k.box(`Stair tread ${i+1}`,[pos[0],pos[1]+(i+1)*rise/2,pos[2]-i*run],[w,(i+1)*rise,run+.06],'stoneLight',.04);}
export function chimney(root,pos,{w=.85,d=.8,h=2.1}={}){const g=wall(root,'Bonded stone chimney',pos,w,h,d,{material:'stone',stone:true}),k=kit(g);g.userData.smokeSocket={position:[0,h+.24,0],direction:[0,1,0],effect:'chimney_smoke'};k.box('Chimney corbel course',[0,h-.14,0],[w+.18,.2,d+.18],'stoneDark');k.box('Chimney crown coping',[0,h+.03,0],[w+.3,.16,d+.3],'stoneLight');k.box('Chimney soot opening backing',[0,h+.118,0],[w*.68,.025,d*.68],'coal',.02);for(const x of [-1,1])k.box('Chimney opening rim',[x*w*.43,h+.16,0],[.13,.13,d+.08],'stone');for(const z of [-1,1])k.box('Chimney opening rim',[0,h+.16,z*d*.43],[w+.08,.13,.13],'stone');return g;}
export function plankWall(root,name,p,w,h,d,{horizontal=false}={}){const k=kit(root),g=k.group(name,p),a=kit(g);a.box('Weatherproof plank backing',[0,h/2,0],[w,h,d],'woodDark');for(const [len,depth,r] of [[w,d/2,0],[w,d/2,Math.PI],[d,w/2,Math.PI/2],[d,w/2,-Math.PI/2]]){const f=a.group('Plank elevation');f.rotation.y=r;const q=kit(f),n=Math.ceil((horizontal?h:len)/.24);for(let i=0;i<n;i++){const s=(horizontal?h:len)/n;q.box('Individual wall plank',horizontal?[0,(i+.5)*s,depth+.02]:[-len/2+(i+.5)*s,h/2,depth+.02],horizontal?[len,s-.017,.1]:[s-.017,h,.1],i%4?'wood':'woodLight',.01);}}return g;}
