import * as THREE from 'three';

/** Preview-only smoke. Exported assets retain metre-scale emitter sockets. */
export function createStructureSmoke(model){
 const root=new THREE.Group();root.name='Chimney smoke preview';root.visible=false;
 const sockets=model.userData.effectSockets||[],count=sockets.length*18;
 const positions=new Float32Array(count*3),phases=new Float32Array(count);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('phase',new THREE.BufferAttribute(phases,1));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{pixelRatio:{value:Math.min(globalThis.devicePixelRatio||1,2)}},
  vertexShader:'attribute float phase; varying float life; uniform float pixelRatio; void main(){life=phase; vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_PointSize=clamp((22.0+phase*75.0)*pixelRatio/max(1.0,-p.z*.13),1.0,150.0);}',
  fragmentShader:'varying float life; void main(){float r=length(gl_PointCoord-vec2(.5))*2.0; float a=(1.0-smoothstep(.25,1.0,r))*.11*sin(life*3.14159265); gl_FragColor=vec4(.55,.53,.49,a);}',
 });
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;root.add(points);let time=0;
 return {root,
  update(delta,enabled){root.visible=enabled&&count>0;if(!root.visible)return;time+=Math.min(delta,.1);
   sockets.forEach((socket,s)=>{for(let i=0;i<18;i++){const j=s*18+i,t=(i/18+time*.12)%1;phases[j]=t;positions.set([socket.position[0]+t*t*.7+Math.sin(i*2.4+time)*t*.13,socket.position[1]+t*2.5,socket.position[2]+Math.cos(i*1.7+time*.4)*t*.15],j*3);}});
   geometry.attributes.position.needsUpdate=true;geometry.attributes.phase.needsUpdate=true;
  },
  dispose(){root.removeFromParent();geometry.dispose();material.dispose();},
 };
}
