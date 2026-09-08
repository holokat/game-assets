import * as THREE from 'three';
import { addCollider, addPivot, addSocket, createAssetContext, finishAsset, registerMesh } from '../core/assetContext.js';
import { faceted } from '../core/geometryLibrary.js';

const material=(name,color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness,flatShading:true,vertexColors:true});
const mesh=(c,p,id,g,m,group)=>registerMesh(c,p,id,new THREE.Mesh(faceted(g,`${c.id}:${id}`),m),group);
const box=(c,p,id,size,pos,m,group)=>{const q=mesh(c,p,id,new THREE.BoxGeometry(...size),m,group);q.position.set(...pos);return q;};
const cylinder=(c,p,id,r,h,segments,pos,m,group)=>{const q=mesh(c,p,id,new THREE.CylinderGeometry(r,r,h,segments),m,group);q.position.set(...pos);return q;};
function finish(c,critical,camera){const root=finishAsset(c);root.userData.artDirection={concept:`references/concepts/${c.id}.png`,identity:critical,motion:'Static asset. No animation channels are authored.',correctionPasses:0};root.userData.qualityContract={suitability:'pass',triangleBudget:5000,optimizedDrawRange:[4,5],criticalFeatures:critical,reviewCamera:camera};return root;}
const sockets=(c,model,items)=>items.forEach(([id,pos])=>addSocket(c,model,id,pos));

export function createBiomassGenerator(){
 const c=createAssetContext('biomass-generator',{label:'Biomass Generator',targetHeightMetres:2.85}),{model}=c;
 const m={concrete:material('biomass-concrete','#7a7770'),green:material('biomass-painted-green','#486b53',.55,.12),dark:material('biomass-dark-mechanism','#3b4643',.52,.28),wood:material('biomass-wood-chip','#9b7046'),safety:material('biomass-service-orange','#c97835',.55,.12)};
 const station=addPivot(c,model,'generator-station'),drive=addPivot(c,station,'flywheel-drive-assembly'),feed=addPivot(c,station,'feed-hopper-assembly');
 box(c,station,'grounded-concrete-plinth',[4.5,.25,3.2],[0,.125,0],m.concrete,'foundation');
 box(c,station,'painted-generator-enclosure',[2.25,1.55,1.65],[.25,1.025,.05],m.green,'generator-enclosure');
 box(c,station,'dark-side-service-panel',[.08,.82,1.08],[-.91,1.05,.08],m.dark,'service-panel');
 box(c,feed,'square-feed-hopper',[1.05,.9,1.05],[-1.3,1.15,-.15],m.green,'feed-system');
 const funnel=mesh(c,feed,'hopper-funnel',new THREE.ConeGeometry(.72,.42,4,1,true),m.green,'feed-system');funnel.position.set(-1.3,.63,-.15);funnel.rotation.y=Math.PI/4;
 cylinder(c,station,'short-exhaust-stack',.18,1.35,8,[.72,2.1,.2],m.dark,'exhaust');
 cylinder(c,station,'exhaust-cap',.28,.12,8,[.72,2.81,.2],m.safety,'exhaust');
 const wheel=cylinder(c,drive,'visible-flywheel',.52,.18,10,[1.53,.94,.02],m.safety,'drive');wheel.rotation.z=Math.PI/2;
 const belt=box(c,drive,'simple-belt-guard',[.22,.72,.9],[1.34,.95,.02],m.dark,'drive');belt.rotation.z=-.25;
 box(c,station,'wood-chip-intake-bin',[.95,.58,.85],[-1.8,.54,1.05],m.wood,'feed-system');
 for(const [i,x] of [[1,-2.02],[2,2.02]])cylinder(c,station,`service-bollard-${i}`,.1,.74,7,[x,.62,1.2],m.safety,'safety');
 sockets(c,model,[['ground',[0,0,0]],['terrain',[0,0,0]],['fuel-intake',[-1.8,.55,1.05]],['power-output',[1.25,1.1,-.86]],['service',[-1,1.05,.05]],['exhaust',[.72,2.82,.2]],['interaction',[1.53,.94,.02]],['adjacency-left',[-2.5,.1,0]],['adjacency-right',[2.5,.1,0]],['adjacency-front',[0,.1,1.8]],['adjacency-rear',[0,.1,-1.8]]]);
 addCollider(c,station,'concrete-plinth','box',[0,.125,0],{width:4.5,height:.25,depth:3.2,isTrigger:false});addCollider(c,station,'generator-enclosure','box',[.25,1.025,.05],{width:2.25,height:1.55,depth:1.65,isTrigger:false});addCollider(c,feed,'feed-hopper','box',[-1.3,1.15,-.15],{width:1.05,height:.9,depth:1.05,isTrigger:false});addCollider(c,drive,'drive-zone','cylinder',[1.53,.94,.02],{radius:.62,height:.4,axis:'z',isTrigger:true});
 return finish(c,['grounded concrete plinth','green generator enclosure','feed hopper and wood-chip bin','short exhaust stack','visible flywheel drive'],[-7.4,5.2,7.8]);
}

export function createGeothermalPlant(){
 const c=createAssetContext('geothermal-plant',{label:'Geothermal Plant',targetHeightMetres:3.7}),{model}=c;
 const m={concrete:material('geothermal-concrete','#797a74'),turbine:material('geothermal-turbine-charcoal','#3e4c4d',.5,.3),pipe:material('geothermal-copper-pipe','#a56d47',.55,.2),teal:material('geothermal-service-teal','#4a7574',.58,.15),safety:material('geothermal-safety-amber','#c58638',.52,.12)};
 const plant=addPivot(c,model,'geothermal-plant-station'),steam=addPivot(c,plant,'steam-pipe-network'),turbine=addPivot(c,plant,'turbine-housing');
 box(c,plant,'grounded-concrete-platform',[5.2,.3,4.25],[0,.15,0],m.concrete,'foundation');
 const core=cylinder(c,turbine,'central-turbine-housing',.82,2.25,10,[.25,1.42,.1],m.turbine,'turbine');core.rotation.z=Math.PI/2;
 box(c,turbine,'turbine-end-cap',[.28,1.35,1.55],[1.33,1.42,.1],m.teal,'turbine');
 cylinder(c,plant,'short-cooling-tower',.63,2.6,8,[-1.65,1.6,-.85],m.concrete,'cooling');
 cylinder(c,plant,'cooling-tower-top',.78,.22,8,[-1.65,2.93,-.85],m.teal,'cooling');
 for(const [i,x,z] of [[1,-.75,-1.12],[2,.95,-1.05]]){const pipe=cylinder(c,steam,`thick-steam-pipe-${i}`,.22,2.3,8,[x,1.45,z],m.pipe,'steam-pipes');const elbow=mesh(c,steam,`angular-pipe-elbow-${i}`,new THREE.TorusGeometry(.45,.15,4,8,Math.PI/2),m.pipe,'steam-pipes');elbow.position.set(x,2.55,z+.32);elbow.rotation.y=i===1?0:Math.PI;pipe.rotation.z=.04*(i===1?-1:1);}
 box(c,plant,'small-control-cabinet',[.85,1.35,.56],[1.72,.98,1.28],m.teal,'controls');
 for(let i=0;i<4;i++){const x=-2+i*1.05;cylinder(c,plant,`narrow-safety-post-${i+1}`,.06,.7,6,[x,.65,1.78],m.safety,'railings');if(i<3)box(c,plant,`safety-rail-${i+1}`,[1.05,.07,.07],[x+.525,.9,1.78],m.safety,'railings');}
 sockets(c,model,[['ground',[0,0,0]],['terrain',[0,0,0]],['steam-inlet',[-.75,1.4,-1.12]],['steam-outlet',[.95,1.4,-1.05]],['power-output',[1.72,1.1,1.28]],['service',[1.72,.98,1.28]],['cooling',[-1.65,2.93,-.85]],['interaction',[.25,1.42,.1]],['adjacency-left',[-2.85,.1,0]],['adjacency-right',[2.85,.1,0]],['adjacency-front',[0,.1,2.3]],['adjacency-rear',[0,.1,-2.3]]]);
 addCollider(c,plant,'concrete-platform','box',[0,.15,0],{width:5.2,height:.3,depth:4.25,isTrigger:false});addCollider(c,turbine,'turbine-housing','box',[.25,1.42,.1],{width:2.25,height:1.65,depth:1.65,isTrigger:false});addCollider(c,plant,'cooling-tower','cylinder',[-1.65,1.6,-.85],{radius:.65,height:2.6,axis:'y',isTrigger:false});addCollider(c,plant,'steam-service-zone','box',[0,1.35,-1.1],{width:2.4,height:1.5,depth:.7,isTrigger:true});
 return finish(c,['grounded concrete station','central turbine housing','two angular steam pipes','short cooling tower','control cabinet and safety rail'],[-8.1,5.9,8.5]);
}

export function createBatteryBank(){
 const c=createAssetContext('battery-bank',{label:'Battery Bank',targetHeightMetres:2.45}),{model}=c;
 const m={concrete:material('battery-concrete','#858783'),navy:material('battery-cabinet-navy','#415c6b',.55,.14),dark:material('battery-panel-charcoal','#303b3d',.5,.22),orange:material('battery-coupler-orange','#d1843d',.55,.12),metal:material('battery-tray-metal','#697171',.5,.26)};
 const bank=addPivot(c,model,'battery-bank-station'),cabinets=addPivot(c,bank,'battery-cabinet-row'),service=addPivot(c,bank,'inverter-service');
 box(c,bank,'grounded-concrete-base',[5.5,.26,2.6],[0,.13,0],m.concrete,'foundation');
 for(const [i,x] of [[1,-1.52],[2,0],[3,1.52]]){box(c,cabinets,`industrial-battery-cabinet-${i}`,[1.1,1.85,.95],[x,1.185,-.2],m.navy,'battery-cabinets');box(c,cabinets,`dark-front-panel-${i}`,[.88,.72,.035],[x,1.32,.295],m.dark,'battery-cabinets');const coupler=cylinder(c,cabinets,`orange-cable-coupler-${i}`,.12,.08,7,[x,1.95,.36],m.orange,'cable-couplers');coupler.rotation.x=Math.PI/2;}
 box(c,service,'side-inverter-cabinet',[.9,1.38,.68],[-2.3,.95,.65],m.metal,'inverter');
 box(c,service,'raised-maintenance-cable-tray',[4.25,.13,.22],[0,2.18,-.1],m.metal,'cable-tray');
 for(const [i,x] of [[1,-2.3],[2,2.3]])cylinder(c,bank,`slim-safety-bollard-${i}`,.1,.76,7,[x,.64,1.02],m.orange,'safety');
 sockets(c,model,[['ground',[0,0,0]],['terrain',[0,0,0]],['power-input',[-2.3,.95,.65]],['power-output',[2.1,1.2,.32]],['service',[-2.3,.95,.65]],['battery-access',[0,1.3,.34]],['cable-tray',[0,2.18,-.1]],['adjacency-left',[-3,.1,0]],['adjacency-right',[3,.1,0]],['adjacency-front',[0,.1,1.5]],['adjacency-rear',[0,.1,-1.5]]]);
 addCollider(c,bank,'concrete-base','box',[0,.13,0],{width:5.5,height:.26,depth:2.6,isTrigger:false});addCollider(c,cabinets,'battery-cabinet-row','box',[0,1.185,-.2],{width:4.15,height:1.85,depth:.95,isTrigger:false});addCollider(c,service,'inverter-cabinet','box',[-2.3,.95,.65],{width:.9,height:1.38,depth:.68,isTrigger:false});addCollider(c,cabinets,'battery-access-zone','box',[0,1.25,.55],{width:4.3,height:1.5,depth:.55,isTrigger:true});
 return finish(c,['grounded concrete base','three navy battery cabinets','dark front panels and orange cable couplers','side inverter cabinet','raised cable tray'],[-7.5,4.9,7.5]);
}

export function createMicrogrid(){
 const c=createAssetContext('microgrid',{label:'Microgrid',targetHeightMetres:3.25}),{model}=c;
 const m={concrete:material('microgrid-concrete','#858784'),dark:material('microgrid-control-charcoal','#364344',.5,.25),teal:material('microgrid-battery-teal','#4d7071',.56,.15),metal:material('microgrid-mast-metal','#596264',.48,.3),orange:material('microgrid-safety-orange','#d18238',.55,.12)};
 const grid=addPivot(c,model,'microgrid-station'),mast=addPivot(c,grid,'utility-mast'),service=addPivot(c,grid,'inverter-service');
 box(c,grid,'grounded-microgrid-foundation',[4.9,.26,3.35],[0,.13,0],m.concrete,'foundation');
 box(c,service,'dark-control-inverter-cabinet',[1.25,1.6,.8],[-1.2,.93,.35],m.dark,'inverter');
 for(const [i,x] of [[1,.25],[2,1.48]]){box(c,grid,`compact-battery-cabinet-${i}`,[.92,1.38,.75],[x,.82,.18],m.teal,'battery-cabinets');box(c,grid,`battery-front-panel-${i}`,[.68,.52,.035],[x,.92,.58],m.dark,'battery-cabinets');}
 cylinder(c,mast,'triangular-mast-center',.09,2.85,6,[1.4,1.68,-.95],m.metal,'mast');
 for(const [i,x] of [[1,.72],[2,2.08]]){const leg=box(c,mast,`mast-leg-${i}`,[.1,2.45,.1],[x,1.23,-.95],m.metal,'mast');leg.rotation.z=i===1?.28:-.28;}
 box(c,mast,'mast-crossbar',[2.05,.13,.14],[1.4,2.83,-.95],m.metal,'mast');
 for(const [i,x] of [[1,-1.15],[2,.2],[3,1.5]]){const conduit=box(c,service,`exposed-service-conduit-${i}`,[.12,.12,1.65],[x,.48,-.55],m.orange,'conduits');conduit.rotation.y=.25;}
 for(const [i,x,z] of [[1,-2,-1.2],[2,2,-1.2],[3,-2,1.2],[4,2,1.2]])cylinder(c,grid,`low-safety-post-${i}`,.08,.62,6,[x,.57,z],m.orange,'safety');
 sockets(c,model,[['ground',[0,0,0]],['terrain',[0,0,0]],['grid-inlet',[1.4,2.83,-.95]],['power-output',[-1.2,.93,.35]],['battery-service',[.85,.82,.18]],['control',[-1.2,.93,.35]],['service',[-1.2,.93,.35]],['adjacency-left',[-2.7,.1,0]],['adjacency-right',[2.7,.1,0]],['adjacency-front',[0,.1,1.85]],['adjacency-rear',[0,.1,-1.85]]]);
 addCollider(c,grid,'microgrid-foundation','box',[0,.13,0],{width:4.9,height:.26,depth:3.35,isTrigger:false});addCollider(c,service,'inverter-cabinet','box',[-1.2,.93,.35],{width:1.25,height:1.6,depth:.8,isTrigger:false});addCollider(c,grid,'battery-cabinet-row','box',[.86,.82,.18],{width:2.2,height:1.38,depth:.75,isTrigger:false});addCollider(c,mast,'mast-clearance','box',[1.4,1.68,-.95],{width:2.05,height:2.85,depth:.5,isTrigger:true});
 return finish(c,['grounded concrete foundation','dark inverter cabinet','two compact battery cabinets','triangular utility mast','crossbar and exposed service conduits'],[-7.5,5.4,7.8]);
}

export function createAutomatedPowerStation(){
 const c=createAssetContext('automated-power-station',{label:'Automated Power Station',targetHeightMetres:3.9}),{model}=c;
 const m={concrete:material('station-concrete','#7c7e7a'),green:material('station-transformer-green','#4d6658',.55,.15),dark:material('station-switchgear-charcoal','#374345',.5,.27),metal:material('station-busbar-metal','#687173',.48,.3),yellow:material('station-warning-yellow','#c58a38',.55,.1)};
 const station=addPivot(c,model,'automated-station'),switchgear=addPivot(c,station,'switching-frame'),transformer=addPivot(c,station,'transformer-housing');
 box(c,station,'grounded-station-pad',[5.9,.3,4.4],[0,.15,0],m.concrete,'foundation');
 box(c,transformer,'tall-transformer-housing',[2.05,2.45,1.5],[0,1.38,-.1],m.green,'transformer');
 box(c,transformer,'transformer-dark-front',[1.42,.86,.05],[0,1.3,.68],m.dark,'transformer');
 for(const [i,x] of [[1,-2.08],[2,2.08]])box(c,station,`side-electrical-cabinet-${i}`,[.9,1.6,.72],[x,.95,.15],m.dark,'electrical-cabinets');
 box(c,switchgear,'high-voltage-switching-frame',[3.6,.14,.14],[0,3.1,-1.2],m.metal,'switchgear');
 for(const [i,x] of [[1,-1.15],[2,0],[3,1.15]]){cylinder(c,switchgear,`insulator-post-${i}`,.14,.82,7,[x,2.68,-1.2],m.yellow,'switchgear');const bar=box(c,switchgear,`overhead-bus-bar-${i}`,[.18,.11,2.45],[x,3.05,-.05],m.metal,'switchgear');bar.rotation.x=.06;}
 for(let i=0;i<4;i++){const x=-2.3+i*1.5;cylinder(c,station,`fence-post-${i+1}`,.055,.72,6,[x,.62,1.78],m.yellow,'safety-fence');if(i<3)box(c,station,`safety-fence-rail-${i+1}`,[1.5,.07,.06],[x+.75,.86,1.78],m.yellow,'safety-fence');}
 sockets(c,model,[['ground',[0,0,0]],['terrain',[0,0,0]],['grid-inlet',[0,3.1,-1.2]],['grid-outlet',[1.15,3.05,-.05]],['transformer',[0,1.38,-.1]],['control',[2.08,.95,.15]],['service',[2.08,.95,.15]],['safety-access',[0,.6,1.78]],['adjacency-left',[-3.2,.1,0]],['adjacency-right',[3.2,.1,0]],['adjacency-front',[0,.1,2.3]],['adjacency-rear',[0,.1,-2.3]]]);
 addCollider(c,station,'station-pad','box',[0,.15,0],{width:5.9,height:.3,depth:4.4,isTrigger:false});addCollider(c,transformer,'transformer-housing','box',[0,1.38,-.1],{width:2.05,height:2.45,depth:1.5,isTrigger:false});addCollider(c,station,'electrical-cabinet-row','box',[0,.95,.15],{width:5.1,height:1.6,depth:.72,isTrigger:false});addCollider(c,switchgear,'high-voltage-clearance','box',[0,2.75,-.7],{width:3.8,height:1.2,depth:1.4,isTrigger:true});
 return finish(c,['grounded substation pad','tall transformer housing','two electrical cabinets','switching frame with three insulators','overhead bus bars and safety fence'],[-8.7,6.1,8.8]);
}
