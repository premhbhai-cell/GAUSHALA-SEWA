/* Cloudflare Worker: shared admin login + site-wide CMS storage.
   Bind a KV namespace as CMS_KV and add secrets ADMIN_EMAIL, ADMIN_PASSWORD_HASH and ADMIN_PASSWORD_SALT, AUTH_SECRET. */
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const enc = new TextEncoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function sign(value, secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
async function tokenValid(req, env){const t=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!t)return false;const [p,s]=t.split('.');if(!p||!s||s!==await sign(p,env.AUTH_SECRET))return false;try{const v=JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));return v.exp>Date.now()}catch{return false}}
export default { async fetch(req,env){
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 const u=new URL(req.url), path=u.pathname.replace(/^\/+|\/+$/g,'');
 if(!env.CMS_KV||!env.ADMIN_EMAIL||!env.ADMIN_PASSWORD_HASH||!env.ADMIN_PASSWORD_SALT||!env.AUTH_SECRET)return json({error:'Worker setup incomplete. Add KV binding and required secrets.'},503);
 if(path==='health')return json({ok:true,service:'Gaushala CMS'});
 if(path==='api/login'&&req.method==='POST'){
  const b=await req.json();const ip=req.headers.get('CF-Connecting-IP')||'unknown';const attemptKey='login-attempts:'+ip;const attempts=Number(await env.CMS_KV.get(attemptKey)||0);if(attempts>=8)return json({error:'Too many login attempts. 10 minute baad try karein.'},429);const email=String(b.email||'').trim().toLowerCase();const passwordKey=await crypto.subtle.importKey('raw',enc.encode(String(b.password||'')),'PBKDF2',false,['deriveBits']);const derived=await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(env.ADMIN_PASSWORD_SALT.match(/.{1,2}/g).map(x=>parseInt(x,16))),iterations:310000,hash:'SHA-256'},passwordKey,256);const hash=[...new Uint8Array(derived)].map(x=>x.toString(16).padStart(2,'0')).join('');
  let diff=hash.length^env.ADMIN_PASSWORD_HASH.length;for(let i=0;i<Math.max(hash.length,env.ADMIN_PASSWORD_HASH.length);i++)diff|=(hash.charCodeAt(i)||0)^(env.ADMIN_PASSWORD_HASH.charCodeAt(i)||0);if(email!==env.ADMIN_EMAIL.toLowerCase()||diff!==0){await env.CMS_KV.put(attemptKey,String(attempts+1),{expirationTtl:600});return json({error:'Email ya password galat hai.'},401)}await env.CMS_KV.delete(attemptKey);
  const p=btoa(JSON.stringify({sub:email,exp:Date.now()+7*864e5})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');return json({ok:1,token:p+'.'+await sign(p,env.AUTH_SECRET)});
 }
 const publicRead=req.method==='GET'&&(/^content\/settings\.json$/.test(path)||/^content\/[^/]+\.json$/.test(path));
 if(!publicRead&&!await tokenValid(req,env))return json({error:'Login required. Dobara login karein.'},401);
 if(path==='api/me')return json({ok:1});
 if(path==='api/logout')return json({ok:1});
 if(path==='api/pages'&&req.method==='GET'){const l=await env.CMS_KV.list({prefix:'page:'});return json(l.keys.map(k=>({page:k.name.slice(5),updated:k.metadata?.updated||0})));}
 if(path==='api/media'&&req.method==='GET'){const l=await env.CMS_KV.list({prefix:'media:'});return json(await Promise.all(l.keys.map(async k=>({url:'worker-media:'+k.name.slice(6),up:true}))));}
 if(path==='api/upload'&&req.method==='POST'){const b=await req.json(),id=Date.now()+'-'+String(b.name||'image').replace(/[^a-z0-9.-]/gi,'-').slice(0,60);await env.CMS_KV.put('media:'+id,String(b.data||''));return json({url:'worker-media:'+id});}
 if(path.startsWith('api/media/')&&req.method==='DELETE'){await env.CMS_KV.delete('media:'+path.slice(10));return json({ok:1});}
 if(path.startsWith('api/media/')&&req.method==='GET'){const id=path.slice(10);const v=await env.CMS_KV.get('media:'+id);if(!v)return json({error:'Not found'},404);const m=v.match(/^data:([^;,]+);base64,(.+)$/);if(!m)return json({error:'Invalid media'},500);const bin=atob(m[2]);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Response(bytes,{headers:{...cors,'Content-Type':m[1],'Cache-Control':'public,max-age=3600'}})}
 if(path.startsWith('api/page/')&&req.method==='PUT'){const id=path.slice(9);const b=await req.json();await env.CMS_KV.put('page:'+id,JSON.stringify({html:b.html,updated:Date.now()}),{metadata:{updated:Date.now()}});return json({ok:1});}
 if(path.startsWith('api/page/')&&req.method==='DELETE'){await env.CMS_KV.delete('page:'+path.slice(9));return json({ok:1});}
 if(path==='api/settings'&&req.method==='PUT'){const b=await req.json();await env.CMS_KV.put('settings',JSON.stringify(b));return json({ok:1});}
 if(path==='content/settings.json'&&req.method==='GET'){const v=await env.CMS_KV.get('settings');return v?new Response(v,{headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}}):json({});}
 if(path.startsWith('content/')&&req.method==='GET'){const id=path.slice(8).replace(/\.json$/,'');const v=await env.CMS_KV.get('page:'+id);return v?new Response(v,{headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}}):json({});}
 return json({error:'Not found'},404);
}};
