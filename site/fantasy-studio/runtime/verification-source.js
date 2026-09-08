import {sourceFiles} from '../scripts/manifest.js';

/** Keep the local review server's source requests bounded and report failures. */
export async function fingerprint(){
 const parts=[];
 for(const path of sourceFiles){
  let response;
  try{response=await fetch('/fantasy-studio/'+path);}catch(error){throw new Error('Source capture failed: '+path,{cause:error});}
  if(!response.ok)throw new Error('Source capture failed: '+path+' (HTTP '+response.status+')');
  parts.push(path+'\n'+await response.text());
 }
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parts.join('\n')));
 return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
