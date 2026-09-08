import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Tiny constant-surface atlas preserves each part's albedo, roughness, metalness
 * and emissive response while drawing the complete structure with one material.
 * Geometry carries the fine facet shading. Textures do not replace construction.
 */
export function atlasStructure(buckets){
 const surfaces=[...buckets.values()],columns=Math.ceil(Math.sqrt(surfaces.length)),rows=Math.ceil(surfaces.length/columns),cell=4,width=columns*cell,height=rows*cell;
 const base=new Uint8Array(width*height*4),orm=new Uint8Array(width*height*4),emission=new Uint8Array(width*height*4),geometries=[];
 for(let i=0;i<surfaces.length;i++){
  const {material:m,geometries:chunks}=surfaces[i],x=(i%columns)*cell,y=Math.floor(i/columns)*cell;
  const albedo=m.color.clone().convertLinearToSRGB(),glow=m.emissive.clone().multiplyScalar(m.emissiveIntensity).convertLinearToSRGB();
  for(let v=y;v<y+cell;v++)for(let u=x;u<x+cell;u++){
   const at=(v*width+u)*4;
   base.set([...albedo.toArray().map(c=>Math.round(THREE.MathUtils.clamp(c,0,1)*255)),255],at);
   orm.set([255,Math.round(m.roughness*255),Math.round(m.metalness*255),255],at);
   emission.set([...glow.toArray().map(c=>Math.round(THREE.MathUtils.clamp(c,0,1)*255)),255],at);
  }
  for(const g of chunks){const count=g.attributes.position.count,uv=new Float32Array(count*2);for(let v=0;v<count;v++){uv[v*2]=(x+cell/2)/width;uv[v*2+1]=(y+cell/2)/height;}g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometries.push(g);}
  m.dispose();
 }
 function texture(data,name,srgb){const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);t.name=name;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t;}
 const map=texture(base,'Structure albedo',true),ormMap=texture(orm,'Structure roughness metalness',false),emissiveMap=texture(emission,'Structure emissive',true);
 const material=new THREE.MeshStandardMaterial({name:'Structure surface atlas',map,roughnessMap:ormMap,metalnessMap:ormMap,roughness:1,metalness:1,emissiveMap,emissive:0xffffff,emissiveIntensity:1,vertexColors:true,flatShading:true,side:THREE.FrontSide});
 const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();
 if(!geometry){for(const t of [map,ormMap,emissiveMap])t.dispose();material.dispose();throw new Error('Structure surface attributes cannot be merged');}
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Detailed structure surfaces';mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
