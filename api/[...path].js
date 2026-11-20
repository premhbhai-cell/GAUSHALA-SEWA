const crypto = require('crypto');
const { env } = require('../lib/admin-auth');
const { fixPage, fixSettings } = require('../lib/legacy-fix');

const COOKIE = 'gaushala_admin';
const GH_API = 'https://api.github.com';
const owner = () => env('GITHUB_OWNER');
const repo = () => env('GITHUB_REPO');
const branch = () => env('GITHUB_BRANCH') || 'main';
const token = () => env('GITHUB_TOKEN');

function send(res, status, data, extra={}) {
  res.status(status).set({...extra, 'Cache-Control':'no-store'}).json(data);
}
function sign(value) {
  return crypto.createHmac('sha256', env('SESSION_SECRET')).update(value).digest('base64url');
}
function makeSession(email) {
  const payload = Buffer.from(JSON.stringify({email, exp:Date.now()+7*24*60*60*1000})).toString('base64url');
  return payload+'.'+sign(payload);
}
function validSession(req) {
  const raw = (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  if (!raw) return false;
  const value = decodeURIComponent(raw.slice(COOKIE.length+1));
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a=Buffer.from(signature), b=Buffer.from(expected);
  if (a.length!==b.length || !crypto.timingSafeEqual(a,b)) return false;
  try { const p=JSON.parse(Buffer.from(payload,'base64url').toString()); return p.exp>Date.now() && p.email===env('ADMIN_EMAIL').toLowerCase(); } catch { return false; }
}
function requireAdmin(req,res) {
  if (!validSession(req)) { send(res,401,{error:'Login required. Please log in again.'}); return false; }
  return true;
}
async function gh(path, options={}) {
  if(!token()||!owner()||!repo()){const e=new Error('GitHub setup baaki hai: Vercel me GITHUB_TOKEN, GITHUB_OWNER aur GITHUB_REPO add karke Redeploy karein.');e.status=503;e.missingGithub=true;throw e;}
  const r=await fetch(`${GH_API}/repos/${owner()}/${repo()}/contents/${path}`,{
    ...options, headers:{'Authorization':`Bearer ${token()}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) { const e=new Error(data.message||`GitHub API error ${r.status}`); e.status=r.status; throw e; }
  return data;
}
async function putFile(path, contentBase64, message, contentType='text') {
  let sha;
  try { const old=await gh(path); sha=old.sha; } catch(e) { if(e.status!==404) throw e; }
  return gh(path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    message, content:contentBase64, branch:branch(), ...(sha?{sha}:{})
  })});
}
function safeId(s) { return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100); }
module.exports = async (req,res) => {
  const route=Array.isArray(req.query.path)?req.query.path.join('/'):String(req.query.path||'');
  try {
    if (req.method==='OPTIONS') return res.status(204).end();
    if (route==='login' && req.method==='POST') {
      const email=String(req.body?.email||'').trim().toLowerCase();
      const password=String(req.body?.password||'');
      const adminEmail=env('ADMIN_EMAIL').toLowerCase();
      const adminPassword=env('ADMIN_PASSWORD');
      if(!adminEmail||!adminPassword||!env('SESSION_SECRET')) return send(res,503,{error:'Admin environment variables are not configured.'});
      const pa=Buffer.from(password), pb=Buffer.from(adminPassword);
      const passOk=pa.length===pb.length && crypto.timingSafeEqual(pa,pb);
      if(email!==adminEmail || !passOk) return send(res,401,{error:'Email ya password galat hai.'});
      res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(makeSession(adminEmail))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
      return send(res,200,{ok:true});
    }
    if(route==='logout' && req.method==='POST') {
      res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
      return send(res,200,{ok:true});
    }
    if(route==='me' && req.method==='GET') return validSession(req)?send(res,200,{ok:true}):send(res,401,{error:'Not logged in'});
    if(route==='content' && req.method==='GET') {
      const type=String(req.query.type||'');
      const id=safeId(req.query.id||'');
      const file=type==='settings'?'content/cms/settings.json':type==='page'&&id?`content/cms/pages/${id}.json`:null;
      if(!file) return send(res,400,{error:'Invalid content request'});
      try {
        const result=await gh(file);
        const decoded=Buffer.from(result.content.replace(/\n/g,''),'base64').toString('utf8');
        let obj={};try{obj=JSON.parse(decoded)}catch{}
        obj=type==='settings'?fixSettings(obj):fixPage(obj);
        return res.status(200).setHeader('Cache-Control','public, max-age=30, stale-while-revalidate=60').json(obj);
      } catch(e) { if(e.status===404||e.missingGithub) return res.status(200).setHeader('Cache-Control','no-store').json({}); throw e; }
    }
    if(!requireAdmin(req,res)) return;
    if(route==='pages' && req.method==='GET') {
      // Read the current CMS page index via GitHub's directory listing.
      try {
        const list=await gh('content/cms/pages');
        const pages=await Promise.all(list.filter(x=>x.name.endsWith('.json')).map(async x=>{
          const f=await gh(`content/cms/pages/${x.name}`);
          let data={};try{data=JSON.parse(Buffer.from(f.content.replace(/\n/g,''),'base64').toString())}catch{}
          return {page:x.name.replace(/\.json$/,''),updated:data.updated||f.last_commit?.author?.date||0};
        }));
        return send(res,200,pages);
      } catch(e) { if(e.status===404)return send(res,200,[]); throw e; }
    }
    if(route==='page' && req.method==='PUT') {
      const id=safeId(req.query.p||'');
      if(!id) return send(res,400,{error:'Invalid page id'});
      const payload={html:String(req.body?.html||''),updated:Date.now()};
      await putFile(`content/cms/pages/${id}.json`,Buffer.from(JSON.stringify(payload)).toString('base64'),`CMS: update ${id} page`);
      return send(res,200,{ok:true,updated:payload.updated});
    }
    if(route==='page' && req.method==='DELETE') {
      const id=safeId(req.query.p||''); if(!id)return send(res,400,{error:'Invalid page id'});
      const file=`content/cms/pages/${id}.json`; const old=await gh(file);
      await gh(file,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`CMS: revert ${id} page`,sha:old.sha,branch:branch()})});
      return send(res,200,{ok:true});
    }
    if(route==='settings' && req.method==='GET') {
      try {const f=await gh('content/cms/settings.json');let o={};try{o=JSON.parse(Buffer.from(f.content.replace(/\n/g,''),'base64').toString())}catch{};return send(res,200,fixSettings(o))}
      catch(e){if(e.status===404)return send(res,200,{});throw e;}
    }
    if(route==='settings' && req.method==='PUT') {
      await putFile('content/cms/settings.json',Buffer.from(JSON.stringify(req.body||{})).toString('base64'),'CMS: update site settings');
      return send(res,200,{ok:true});
    }
    if(route==='media-list' && req.method==='GET') {
      try { const list=await gh('uploads/cms'); return send(res,200,list.filter(x=>x.type==='file').map(x=>({url:'/uploads/cms/'+encodeURIComponent(x.name),up:true}))); }
      catch(e) { if(e.status===404)return send(res,200,[]); throw e; }
    }
    if(route==='media' && req.method==='POST') {
      const data=String(req.body?.data||'');
      const match=data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if(!match)return send(res,400,{error:'Only JPEG, PNG and WebP images are supported.'});
      const ext=match[1]==='image/png'?'png':match[1]==='image/webp'?'webp':'jpg';
      const name=`${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
      await putFile(`uploads/cms/${name}`,match[2],`CMS: upload ${name}`);
      return send(res,200,{url:`/uploads/cms/${name}`,name});
    }
    if(route==='media' && req.method==='DELETE') {
      const name=String(req.query.id||'').replace(/[^a-zA-Z0-9._-]/g,''); if(!name)return send(res,400,{error:'Missing media id'});
      const file=`uploads/cms/${name}`,old=await gh(file);
      await gh(file,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`CMS: delete ${name}`,sha:old.sha,branch:branch()})});
      return send(res,200,{ok:true});
    }
    return send(res,404,{error:'API route not found'});
  } catch(e) { console.error('CMS API:',e); return send(res,e.status||500,{error:e.message||'Server error'}); }
};
