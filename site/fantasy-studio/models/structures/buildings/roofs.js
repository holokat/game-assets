import * as THREE from 'three';
import {kit,random} from '../primitives.js';

export function gableRoof(root,{name='Roof',x=0,z=0,w,d,eave,rise,material='slate',axis='x',gable='plaster',detail=true}){
 const g=kit(root).group(name,[x,0,z]);if(axis==='x'){g.rotation.y=Math.PI/2;[w,d]=[d,w];}const k=kit(g),thatch=material==='thatch',thickness=thatch?.25:.13;
 const s=new THREE.Shape();s.moveTo(-w/2,eave);s.lineTo(w/2,eave);s.lineTo(0,eave+rise);s.closePath();const core=k.extrude(`${name} solid roof core with underside`,s,d,material);core.position.z=-d/2;
 if(gable)for(const side of [-1,1]){const p=new THREE.Shape();p.moveTo(-w/2+.25,eave-.01);p.lineTo(w/2-.25,eave-.01);p.lineTo(0,eave+rise-.22);p.closePath();const m=k.extrude('Closed gable end',p,.12,gable);m.position.z=side<0?-d/2-.025:d/2-.09;for(const sx of [-1,1])k.beam('Gable raking fascia',[sx*w/2,eave,side*d/2],[0,eave+rise,side*d/2],.19,.19,'woodDark');k.beam('Gable king post',[0,eave-.03,side*d/2],[0,eave+rise-.1,side*d/2],.17,.18,'woodDark');k.box('Gable tie beam',[0,eave+.025,side*d/2],[w-.12,.14,.16],'woodDark');for(const xx of [-w*.23,w*.23])k.beam('Gable short stud',[xx,eave+.055,side*d/2],[xx,eave+rise*(1-Math.abs(xx)/(w/2))-.08,side*d/2],.105,.12,'wood');}
 const angle=Math.atan2(rise,w/2),slope=Math.hypot(w/2,rise),rng=random(name+w+d),rows=Math.ceil(slope/(thatch?.43:.46)),cols=Math.ceil(d/(thatch?.39:.55));
 if(detail)for(const side of [-1,1])for(let row=0;row<rows;row++){const f=(row+.5)/rows,px=side*w/2*f,py=eave+rise*(1-f),step=d/cols;for(let col=0;col<=cols;col++){let left=-d/2+col*step-(row%2)*step/2,right=Math.min(d/2,left+step);left=Math.max(-d/2,left);if(right-left<.025)continue;const tile=k.box(thatch?'Overlapping bound reed course':'Individually lapped slate tile',[px,py+thickness/2,(left+right)/2],[slope/rows*1.16,thickness,right-left-.015],thatch?(rng()>.75?'straw':'thatch'):(rng()>.78?'slateLight':rng()>.82?'slateDark':'slate'),0);tile.rotation.z=-side*angle;
  if(thatch&&row===rows-1){for(let strand=0;strand<2;strand++){const zz=(left+right)/2+(strand-.5)*(right-left)*.38; k.beam('Bound thatch eave tip',[px-side*.13,py+.13,zz],[side*(w/2+.08),eave-.06,zz],.035,.035,rng()>.5?'straw':'thatch');}}
 }}
 for(const side of [-1,1])k.box('Continuous eaves bearer',[side*w/2,eave-.045,0],[.15,.21,d+.08],'woodDark');
 const ridges=Math.ceil(d/.36);for(let i=0;i<ridges;i++){const zz=-d/2+(i+.5)*d/ridges;const cap=k.cylinder(thatch?'Rope-bound straw ridge cap':'Terracotta slate ridge cap',[0,eave+rise+.045,zz],thatch?.22:.14,thatch?.22:.14,d/ridges+.025,thatch?'straw':'slateLight',8);cap.rotation.x=Math.PI/2;if(thatch&&i%2===0)k.torus('Ridge binding',[0,eave+rise+.045,zz],.225,.018,'woodDark',[0,0,0],10);}
 return g;
}
export function hipRoof(root,{name='Hipped roof',x=0,z=0,w,d,eave,rise,material='slate'}){
 const k=kit(root),g=k.group(name,[x,0,z]),a=kit(g);const geom=new THREE.ConeGeometry(1,rise,4,1,false);geom.rotateY(Math.PI/4);geom.scale(w/Math.SQRT2,1,d/Math.SQRT2);geom.translate(0,eave+rise/2,0);a.mesh('Closed four-sided hip core',geom,material);
 const rng=random(name),rows=Math.ceil(Math.hypot(Math.max(w,d)/2,rise)/.46);
 // Each tapered course is tiled on all four pitched planes.
 for(const [span,run,rot] of [[w,d/2,0],[w,d/2,Math.PI],[d,w/2,Math.PI/2],[d,w/2,-Math.PI/2]]){const f=a.group('Hipped roof tiled slope');f.rotation.y=rot;const q=kit(f),angle=Math.atan2(rise,run);for(let row=0;row<rows;row++){const t=(row+.5)/rows,half=span/2*t,yy=eave+rise*(1-t),zz=run*t,n=Math.max(1,Math.ceil(half*2/.55));for(let j=0;j<n;j++){const tile=q.box('Tapered hip slate course',[-half+(j+.5)*2*half/n,yy+.055,zz],[2*half/n+.018,.115,Math.hypot(run,rise)/rows*1.07],rng()>.75?'slateLight':material,0);tile.rotation.x=angle;}}}
 for(const sx of [-1,1])for(const sz of [-1,1])a.beam('Hip ridge capping',[sx*w/2,eave+.05,sz*d/2],[0,eave+rise+.12,0],.16,.16,'slateLight');
 a.box('Solid cornice beneath roof',[0,eave-.08,0],[w,.18,d],'woodDark');return g;
}
export function dormer(root,{x=0,z=0,base=4,w=1.5,d=1.2,h=1.1,material='thatch'},windowBuilder){const g=kit(root).group('Roof dormer',[x,0,z]),k=kit(g);k.box('Dormer continuous body',[0,base+h/2,0],[w,h,d],'plaster');for(const sx of [-1,1])k.box('Dormer upright',[sx*w/2,base+h/2,d/2],[.14,h,.17],'woodDark');gableRoof(g,{w:w+.25,d:d+.25,eave:base+h,rise:.7,material,axis:'z',gable:'plaster'});if(windowBuilder)windowBuilder(g,[0,base+.14,d/2+.02],{w:w*.57,h:h*.66});return g;}
