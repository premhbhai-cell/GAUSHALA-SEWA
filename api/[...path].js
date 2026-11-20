const crypto = require('crypto');
const { env, hasValidSession } = require('../lib/admin-auth');
const { fixPage, fixSettings } = require('../lib/legacy-fix');

const GH_API = 'https://api.github.com';
const owner = () => env('GITHUB_OWNER');
const repo = () => env('GITHUB_REPO');
const branch = () => env('GITHUB_BRANCH') || 'main';
const token = () => env('GITHUB_TOKEN');

// NOTE: Vercel's res object has NO .set() (that is Express). Use setHeader().
function send(res, status, data, extra = {}) {
  const headers = Object.assign({}, extra, { 'Cache-Control': 'no-store' });
  Object.keys(headers).forEach(k => res.setHeader(k, headers[k]));
  res.status(status).json(data);
}
function requireAdmin(req, res) {
  if (!hasValidSession(req)) { send(res, 401, { error: 'Login required. Please log in again.' }); return false; }
  return true;
}
async function gh(path, options={}) {
  if(!token()||!owner()||!repo()){const e=new Error('GitHub setup baaki hai: Vercel me GITHUB_TOKEN, GITHUB_OWNER aur GITHUB_REPO add karke Redeploy karein.');e.status=503;e.missingGithub=true;throw e;}
  const isGet=!options.method||String(options.method).toUpperCase()==='GET';
  const r=await fetch(`${GH_API}/repos/${owner()}/${repo()}/contents/${path}${isGet?'?ref='+encodeURIComponent(branch()):''}`,{
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

// Reads a file's text straight from GitHub (works even above the 1MB limit of the JSON API).
async function ghText(path) {
  if(!token()||!owner()||!repo()){const e=new Error('GitHub setup baaki hai: Vercel me GITHUB_TOKEN, GITHUB_OWNER aur GITHUB_REPO add karke Redeploy karein.');e.status=503;e.missingGithub=true;throw e;}
  const r=await fetch(`${GH_API}/repos/${owner()}/${repo()}/contents/${path}?ref=${encodeURIComponent(branch())}`,{
    headers:{'Authorization':`Bearer ${token()}`,'Accept':'application/vnd.github.raw+json','X-GitHub-Api-Version':'2022-11-28'}
  });
  if(!r.ok){const d=await r.json().catch(()=>({}));const e=new Error(d.message||`GitHub API error ${r.status}`);e.status=r.status;throw e;}
  return Buffer.from(await r.arrayBuffer());
}
async function readJson(path) {
  const buf=await ghText(path);
  try { return JSON.parse(buf.toString('utf8')); } catch (_) { return {}; }
}
function bodyOf(req) {
  let b = req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}
function safeId(s) { return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100); }
module.exports = async (req,res) => {
  const route=Array.isArray(req.query.path)?req.query.path.join('/'):String(req.query.path||'');
  try {
    if (req.method==='OPTIONS') return res.status(204).end();
    if(route==='media-file' && req.method==='GET') {
      const name=String(req.query.name||'').replace(/[^a-zA-Z0-9._-]/g,'');
      const ext=(name.split('.').pop()||'').toLowerCase();
      const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
      if(!name||!types[ext]) return send(res,400,{error:'Invalid image'});
      try {
        const buf=await ghText(`uploads/cms/${name}`);
        res.setHeader('Content-Type',types[ext]);
        res.setHeader('Cache-Control','public, max-age=60, s-maxage=300');
        return res.status(200).send(buf);
      } catch(e) { if(e.status===404) return send(res,404,{error:'Image not found'}); throw e; }
    }
    if(route==='content' && req.method==='GET') {
      const type=String(req.query.type||'');
      const id=safeId(req.query.id||'');
      const file=type==='settings'?'content/cms/settings.json':type==='page'&&id?`content/cms/pages/${id}.json`:null;
      if(!file) return send(res,400,{error:'Invalid content request'});
      try {
        let obj=await readJson(file);
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
          let data={};try{data=await readJson(`content/cms/pages/${x.name}`)}catch{}
          return {page:x.name.replace(/\.json$/,''),updated:data.updated||0};
        }));
        return send(res,200,pages);
      } catch(e) { if(e.status===404)return send(res,200,[]); throw e; }
    }
    if(route==='page' && req.method==='PUT') {
      const id=safeId(req.query.p||'');
      if(!id) return send(res,400,{error:'Invalid page id'});
      const payload={html:String(bodyOf(req).html||''),updated:Date.now()};
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
      try {const o=await readJson('content/cms/settings.json');return send(res,200,fixSettings(o))}
      catch(e){if(e.status===404)return send(res,200,{});throw e;}
    }
    if(route==='settings' && req.method==='PUT') {
      await putFile('content/cms/settings.json',Buffer.from(JSON.stringify(bodyOf(req))).toString('base64'),'CMS: update site settings');
      return send(res,200,{ok:true});
    }
    if(route==='media-list' && req.method==='GET') {
      try { const list=await gh('uploads/cms'); return send(res,200,list.filter(x=>x.type==='file').map(x=>({url:'/uploads/cms/'+encodeURIComponent(x.name),up:true}))); }
      catch(e) { if(e.status===404)return send(res,200,[]); throw e; }
    }
    if(route==='media' && req.method==='POST') {
      const data=String(bodyOf(req).data||'');
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
  } catch(e) {
    console.error('CMS API:',e);
    if (res.headersSent) return;
    const status = Number(e && e.status) >= 400 && Number(e.status) < 600 ? Number(e.status) : 500;
    return send(res, status, { error: (e && e.message) || 'Server error' });
  }
};
