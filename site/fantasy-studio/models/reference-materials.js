import * as THREE from 'three';
const regions={front:[144,10,418,440],side:[695,10,808,440],back:[1080,10,1340,440],warrior:[135,480,400,969],mage:[564,480,850,969],ranger:[1080,480,1370,969]};
const textures={};
export async function loadReferenceSurfaces(){const loader=new THREE.TextureLoader();await Promise.all(Object.keys(regions).map(async k=>{const t=await loader.loadAsync(`./assets/${k}-surface.png`);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=4;textures[k]=t;}));}
const coords=(key,x,y)=>{const[l,t,r,b]=regions[key];return[(x-l)/(r-l),1-(y-t)/(b-t)];};
export function applyReferenceSurfaces(model,kind){model.traverse(o=>{
 if(!o.isMesh)return;const part=o.userData.part,key=o.userData.materialKey;
 if(/crystal|gold|bowstring/.test(key)||/staff|sword|sheath|bow |quiver|arrow|buckle|rivet/i.test(o.name))return;
 const skin=['skin','head','hair'].includes(part),p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=[],mix=[],sideUv=[],backUv=[],weights=[];
 const region=skin?'front':kind==='wizard'?'mage':kind;if(!textures[region])return;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=n.getX(i),ny=n.getY(i);let px,py,alpha=1;
  if(skin){px=292+50.7*x;py=435-50.7*z-5.5*y;}else{const a=-18*Math.PI/180;px=({warrior:255,mage:748,ranger:1190,wizard:748}[kind])+57.4*(x*Math.cos(a)-y*Math.sin(a));py=960-57.4*z-6*y;alpha=THREE.MathUtils.clamp((-ny+.3)*2.8,0,1);}
  uv.push(...coords(region,px,py));mix.push(alpha);
  sideUv.push(...coords('side',754+51*y,435-50.7*z));backUv.push(...coords('back',1214-50.7*x,435-50.7*z+5.5*y));
  if(part==='head'&&y<-.09){weights.push(1,0,0);}else if(skin){let f=Math.max(0,-ny)**4,b=Math.max(0,ny)**4,s=Math.abs(nx)**5,tot=f+b+s;if(tot<.05){f=ny>0?0:1;b=1-f;s=0;tot=1;}weights.push(f/tot,s/tot,b/tot);}else weights.push(1,0,0);
 }
 for(const[k,a,size]of[['refUv',uv,2],['refMix',mix,1],['sideUv',sideUv,2],['backUv',backUv,2],['refWeights',weights,3]])o.geometry.setAttribute(k,new THREE.Float32BufferAttribute(a,size));
 const mat=o.material.clone();mat.vertexColors=false;mat.color.set(0xffffff);mat.roughness=.97;mat.metalness=0;mat.emissive.set(0xffffff);mat.emissiveIntensity=.36;
 const base=o.material.color.clone();mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{refMap:{value:textures[region]},sideMap:{value:textures.side},backMap:{value:textures.back},baseAlbedo:{value:base}});
  shader.vertexShader='attribute vec2 refUv; attribute vec2 sideUv; attribute vec2 backUv; attribute float refMix; attribute vec3 refWeights; varying vec2 vRefUv; varying vec2 vSideUv; varying vec2 vBackUv; varying float vRefMix; varying vec3 vRefWeights;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRefUv=refUv; vSideUv=sideUv; vBackUv=backUv; vRefMix=refMix; vRefWeights=refWeights;');
  shader.fragmentShader='uniform sampler2D refMap; uniform sampler2D sideMap; uniform sampler2D backMap; uniform vec3 baseAlbedo; varying vec2 vRefUv; varying vec2 vSideUv; varying vec2 vBackUv; varying float vRefMix; varying vec3 vRefWeights;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec3 refColor=texture2D(refMap,vRefUv).rgb*vRefWeights.x + texture2D(sideMap,vSideUv).rgb*vRefWeights.y + texture2D(backMap,vBackUv).rgb*vRefWeights.z; diffuseColor.rgb=mix(baseAlbedo,refColor,vRefMix);');
  shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;', 'vec3 outgoingLight = mix(diffuseColor.rgb, totalDiffuse + totalSpecular + totalEmissiveRadiance, 0.12);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;');
 };
 mat.customProgramCacheKey=()=>`reference-${region}-triplanar`;o.material=mat;o.userData.referenceSurface=true;
 });}
