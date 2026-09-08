import * as THREE from 'three';
/** Export moving environment details as standard transform tracks, without including the stage. */
export function bakeLivingClips(root,update,names=root.userData.clips||[]){
 const nodes=[];root.traverse(node=>{if(node.userData.motion)nodes.push(node);});if(!nodes.length)return [];
 const clips=[],frames=96,duration=4,times=Array.from({length:frames+1},(_,i)=>i/frames*duration);
 for(const name of names){
  const samples=nodes.map(node=>({node,position:[],quaternion:[],scale:[]}));
  for(const t of times){update(t,name);for(const sample of samples){sample.position.push(...sample.node.position.toArray());sample.quaternion.push(...sample.node.quaternion.toArray());sample.scale.push(...sample.node.scale.toArray());}}
  // Settle the final quarter-second into the first pose for a seamless reusable loop.
  for(const sample of samples)for(let i=frames-6;i<=frames;i++){
   const p=(i-(frames-6))/6,w=p*p*(3-2*p);
   for(const property of ['position','scale'])for(let j=0;j<3;j++)sample[property][i*3+j]=THREE.MathUtils.lerp(sample[property][i*3+j],sample[property][j],w);
   const q=new THREE.Quaternion().fromArray(sample.quaternion,i*4).slerp(new THREE.Quaternion().fromArray(sample.quaternion,0),w);q.toArray(sample.quaternion,i*4);
  }
  const tracks=[];
  for(const s of samples)for(const[property,n]of [['position',3],['quaternion',4],['scale',3]]){
   if(!s[property].some((value,i)=>Math.abs(value-s[property][i%n])>1e-7))continue;
   const Track=property==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
   tracks.push(new Track(`${s.node.uuid}.${property}`,times,s[property]));
  }
  if(tracks.length)clips.push(new THREE.AnimationClip(name,duration,tracks));
 }
 update(0,names[0]||'idle');return clips;
}
