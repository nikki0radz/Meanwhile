// Authenticated by the parent Worker. R2 receives ciphertext only.
const SNAP=/^snapshots\/[a-f0-9]{32}\/[0-9]{13}-[a-f0-9]{16}$/;
const CLIP=/^clips\/[a-f0-9]{64}$/;
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function read(request,max){if(Number(request.headers.get('content-length'))>max)throw Error('size');const reader=request.body?.getReader();if(!reader)throw Error('size');let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('size');}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;}
export async function backup(request,env){
 if(!env.BACKUPS)return response({error:'Cloud backup is not configured. Create a private R2 bucket named meanwhile-backups and bind it as BACKUPS to this Worker.'},503);
 const url=new URL(request.url),action=url.pathname.slice('/api/backup/'.length),key=url.searchParams.get('key')||'';
 if(action==='list'){
  const listed=await env.BACKUPS.list({prefix:'meanwhile/snapshots/',limit:1000});
  return response({snapshots:listed.objects.map(o=>({key:o.key.slice('meanwhile/'.length),createdAt:o.uploaded.toISOString(),size:o.size})),truncated:listed.truncated});
 }
 if(!SNAP.test(key)&&!CLIP.test(key))return response({error:'Invalid backup object.'},400);
 const objectKey='meanwhile/'+key;
 if(action==='get'){
  const obj=await env.BACKUPS.get(objectKey);if(!obj)return response({error:'Backup object was not found.'},404);
  return new Response(obj.body,{headers:{'content-type':'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'}});
 }
 if(action==='put'){
  let bytes;try{bytes=await read(request,SNAP.test(key)?8*1024*1024:24*1024*1024+48);}catch{return response({error:'Backup object exceeds the upload limit.'},413);}
  if(bytes.length<48||new TextDecoder().decode(bytes.slice(0,4))!=='MWC1')return response({error:'Only encrypted Meanwhile backups are accepted.'},400);
  // Immutable objects: a second device can never replace a previous snapshot or clip.
  const saved=await env.BACKUPS.put(objectKey,bytes,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/octet-stream'}});
  if(!saved){const existing=await env.BACKUPS.get(objectKey);if(!existing)return response({error:'Backup write was not confirmed.'},409);const old=new Uint8Array(await existing.arrayBuffer());if(old.length!==bytes.length||!old.every((b,i)=>b===bytes[i]))return response({error:'This backup object already exists with different content.'},409);}
  return response({saved:true});
 }
 return response({error:'Unknown backup action.'},404);
}
