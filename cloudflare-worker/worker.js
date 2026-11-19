const API='https://api.github.com';
const cors=(origin)=>({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Vary':'Origin'});
const enc=s=>new TextEncoder().encode(s);
const b64bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const bytesB64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function hmac(secret,data){const k=await crypto.subtle.importKey('raw',enc(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);return bytesB64(await crypto.subtle.sign('HMAC',k,enc(data)));}
async function token(env,email){const payload=btoa(JSON.stringify({email,exp:Date.now()+7*864e5}));return payload+'.'+await hmac(env.SESSION_SECRET,payload)}
async function valid(req,env){const h=req.headers.get('Authorization')||'';const m=h.match(/^Bearer (.+)$/);if(!m)return false;try{const [p,s]=m[1].split('.');if(await hmac(env.SESSION_SECRET,p)!==s)return false;const v=JSON.parse(atob(p));return v.email===env.ADMIN_EMAIL&&v.exp>Date.now()}catch(e){return false}}
function response(data,status,origin,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...cors(origin),...headers}})}
async function gh(env,path,opts={}){const r=await fetch(API+'/repos/'+env.GITHUB_REPO+'/'+path,{...opts,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(opts.headers||{})}});const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch(e){}if(!r.ok&&r.status!==404)throw Error(j.message||'GitHub API error '+r.status);return r.status===404?null:j}
async function readFile(env,path){const f=await gh(env,'contents/'+path+'?ref='+env.GITHUB_BRANCH);if(!f)return null;return JSON.parse(new TextDecoder().decode(b64bytes(f.content.replace(/\n/g,''))))}
async function putFile(env,path,content,message,binary=false){const old=await gh(env,'contents/'+path+'?ref='+env.GITHUB_BRANCH);let data;if(binary)data=content;else data=btoa(unescape(encodeURIComponent(JSON.stringify(content))));return gh(env,'contents/'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,content:data,branch:env.GITHUB_BRANCH,sha:old&&old.sha})})}
async function delFile(env,path){const old=await gh(env,'contents/'+path+'?ref='+env.GITHUB_BRANCH);if(old)await gh(env,'contents/'+path,{method:'DELETE',body:JSON.stringify({message:'admin: delete '+path,sha:old.sha,branch:env.GITHUB_BRANCH})})}
export default {async fetch(req,env){const origin=req.headers.get('Origin')||'';if(origin!==env.ALLOWED_ORIGIN)return new Response('Forbidden',{status:403});if(req.method==='OPTIONS')return new Response(null,{headers:cors(origin)});const u=new URL(req.url),p=u.pathname;
 try{
  if(p==='/api/login'&&req.method==='POST'){const b=await req.json();if(b.email!==env.ADMIN_EMAIL||b.password!==env.ADMIN_PASSWORD)return response({error:'Email ya password galat hai.'},401,origin);const t=await token(env,b.email);return response({ok:true,token:t},200,origin)}
  if(p==='/api/logout')return response({ok:true},200,origin);
  if(!await valid(req,env))return response({error:'Session expired. Dobara login karein.'},401,origin);
  if(p==='/api/me')return response({ok:true},200,origin);
  if(p==='/api/settings'&&req.method==='GET')return response({settings:(await readFile(env,'content/settings.json'))||{}},200,origin);
  if(p==='/api/settings'&&req.method==='PUT'){await putFile(env,'content/settings.json',await req.json(),'admin: update site settings');return response({ok:true},200,origin)}
  if(p==='/api/pages'&&req.method==='GET'){const l=await gh(env,'contents/content?ref='+env.GITHUB_BRANCH)||[];return response(l.filter(x=>x.name.endsWith('.json')&&x.name!=='settings.json').map(x=>({page:x.name.replace(/\.json$/,''),updated:x.last_modified||null})),200,origin)}
  if(p==='/api/page'&&['PUT','DELETE'].includes(req.method)){const page=u.searchParams.get('p')||'';if(!/^[a-z0-9_-]+$/i.test(page))return response({error:'Invalid page'},400,origin);const path='content/'+page+'.json';if(req.method==='DELETE')await delFile(env,path);else{const b=await req.json();await putFile(env,path,{html:b.html,updated:Date.now()},'admin: edit '+page)}return response({ok:true},200,origin)}
  if(p==='/api/media'&&req.method==='GET'){const base=await gh(env,'contents/media.json?ref='+env.GITHUB_BRANCH);let urls=[];if(base&&base.content)try{urls=JSON.parse(new TextDecoder().decode(b64bytes(base.content.replace(/\n/g,''))))}catch(e){}const up=await gh(env,'contents/images/uploads?ref='+env.GITHUB_BRANCH)||[];return response(urls.map(url=>({url,up:false})).concat(up.filter(x=>x.type==='file').map(x=>({url:'images/uploads/'+x.name,up:true}))),200,origin)}
  if(p==='/api/upload'&&req.method==='POST'){const b=await req.json();const match=String(b.data||'').match(/^data:image\/(?:jpeg|png|webp);base64,([\s\S]+)$/);if(!match)return response({error:'Valid image upload karein'},400,origin);const name=Date.now()+'-'+String(b.name||'image').replace(/\.[^.]*$/,'').replace(/[^a-z0-9-]/gi,'-').slice(0,35)+'.jpg';const path='images/uploads/'+name;await putFile(env,path,match[1],'admin: upload '+name,true);return response({url:path},200,origin)}
  if(p==='/api/media'&&req.method==='DELETE'){const f=u.searchParams.get('f')||'';if(!/^[a-z0-9._-]+$/i.test(f))return response({error:'Invalid filename'},400,origin);await delFile(env,'images/uploads/'+f);return response({ok:true},200,origin)}
  return response({error:'Not found'},404,origin);
 }catch(e){return response({error:e.message||'Server error'},500,origin)}
}};
