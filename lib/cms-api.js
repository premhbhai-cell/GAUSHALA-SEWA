// Shared CMS logic. Every file in /api (page.js, pages.js, settings.js, media.js ...) is a tiny
// wrapper around makeHandler('<route>'), so NO dynamic [...path] route is needed on Vercel.
const crypto = require('crypto');
const { env, hasValidSession } = require('./admin-auth');
const { fixPage, fixSettings } = require('./legacy-fix');

const GH_API = 'https://api.github.com';
const owner = () => env('GITHUB_OWNER');
const repo = () => env('GITHUB_REPO');
const branch = () => env('GITHUB_BRANCH') || 'main';
const token = () => env('GITHUB_TOKEN');

// Vercel's res has NO .set() (that is Express) - only setHeader/status/json/send.
function send(res, status, data, extra) {
  const headers = Object.assign({}, extra || {}, { 'Cache-Control': 'no-store' });
  Object.keys(headers).forEach(k => res.setHeader(k, headers[k]));
  res.status(status).json(data);
}
function requireAdmin(req, res) {
  if (!hasValidSession(req)) { send(res, 401, { error: 'Login required. Please log in again.' }); return false; }
  return true;
}

function setupError() {
  const missing = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'].filter(n => !env(n));
  if (!missing.length) return null;
  const e = new Error('GitHub setup baaki hai. Vercel -> Settings -> Environment Variables me ye add karein: ' + missing.join(', ') + ' (Production tick karke), phir Redeploy karein.');
  e.status = 503; e.missingGithub = true; e.mine = true; return e;
}
// Turns a GitHub failure into a clear message. Never reuse GitHub's 401 as our status
// (the panel would think "login expired").
function githubFailure(status, apiMessage) {
  const base = 'GitHub error ' + status + (apiMessage ? ' (' + apiMessage + ')' : '') + '. ';
  let hint = 'GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO / GITHUB_BRANCH check karein.';
  if (status === 401) hint = 'GITHUB_TOKEN galat ya expire hai. Naya token banakar Vercel me daalein aur Redeploy karein.';
  else if (status === 403) hint = 'Token ko is repo par "Contents: Read and write" permission chahiye (ya GitHub rate-limit hai).';
  else if (status === 404) hint = 'Repo ya branch nahi mila, ya token is repo ke liye allowed nahi hai. GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH sahi hain? Token me ye repo select hai?';
  else if (status === 409 || status === 422) hint = 'Do changes ek saath takra gaye. Ek baar phir Save dabayein.';
  const e = new Error(base + hint);
  e.status = status === 409 || status === 422 ? 409 : 502; e.ghStatus = status; e.mine = true; return e;
}
function ghHeaders(accept, extra) {
  return Object.assign({ 'Authorization': 'Bearer ' + token(), 'Accept': accept, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'gaushala-cms' }, extra || {});
}
async function gh(path, options) {
  options = options || {};
  const bad = setupError(); if (bad) throw bad;
  const isGet = !options.method || String(options.method).toUpperCase() === 'GET';
  const u = GH_API + '/repos/' + owner() + '/' + repo() + '/contents/' + path + (isGet ? '?ref=' + encodeURIComponent(branch()) : '');
  const r = await fetch(u, Object.assign({}, options, { headers: ghHeaders('application/vnd.github+json', options.headers) }));
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = githubFailure(r.status, data && data.message); e.notFound = r.status === 404; throw e; }
  return data;
}
// Raw read: works for files above GitHub JSON API's 1MB limit.
async function ghBuffer(path) {
  const bad = setupError(); if (bad) throw bad;
  const r = await fetch(GH_API + '/repos/' + owner() + '/' + repo() + '/contents/' + path + '?ref=' + encodeURIComponent(branch()), { headers: ghHeaders('application/vnd.github.raw+json') });
  if (!r.ok) { const d = await r.json().catch(() => ({})); const e = githubFailure(r.status, d && d.message); e.notFound = r.status === 404; throw e; }
  return Buffer.from(await r.arrayBuffer());
}
async function readJson(path) {
  const buf = await ghBuffer(path);
  try { return JSON.parse(buf.toString('utf8')); } catch (_) { return {}; }
}
async function putFileOnce(path, contentBase64, message) {
  let sha;
  try { sha = (await gh(path)).sha; } catch (e) { if (!e.notFound) throw e; }
  return gh(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ message, content: contentBase64, branch: branch() }, sha ? { sha } : {})) });
}
async function putFile(path, contentBase64, message) {
  try { return await putFileOnce(path, contentBase64, message); }
  catch (e) { if (e.ghStatus === 409 || e.ghStatus === 422) return putFileOnce(path, contentBase64, message); throw e; } // retry once on sha conflict
}
async function deleteFile(path, message) {
  let old; try { old = await gh(path); } catch (e) { if (e.notFound) return false; throw e; }
  await gh(path, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sha: old.sha, branch: branch() }) });
  return true;
}
function bodyOf(req) {
  let b = req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}
function safeId(s) { return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100); }
function q(req, k) { const v = req.query && req.query[k]; return Array.isArray(v) ? v[0] : v; }

const routes = {
  async 'media-file'(req, res) {
    if (req.method !== 'GET') return false;
    const name = String(q(req, 'name') || '').replace(/[^a-zA-Z0-9._-]/g, '');
    const ext = (name.split('.').pop() || '').toLowerCase();
    const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (!name || !types[ext]) return send(res, 400, { error: 'Invalid image' });
    try {
      const buf = await ghBuffer('uploads/cms/' + name);
      res.setHeader('Content-Type', types[ext]);
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      return res.status(200).send(buf);
    } catch (e) { if (e.notFound) return send(res, 404, { error: 'Image not found' }); throw e; }
  },
  async content(req, res) {
    if (req.method !== 'GET') return false;
    const type = String(q(req, 'type') || ''), id = safeId(q(req, 'id'));
    const file = type === 'settings' ? 'content/cms/settings.json' : type === 'page' && id ? 'content/cms/pages/' + id + '.json' : null;
    if (!file) return send(res, 400, { error: 'Invalid content request' });
    try {
      let obj = await readJson(file);
      obj = type === 'settings' ? fixSettings(obj) : fixPage(obj);
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      return res.status(200).json(obj);
    } catch (e) {
      if (e.notFound || e.missingGithub) { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json({}); }
      throw e;
    }
  },
  async pages(req, res) {
    if (req.method !== 'GET') return false;
    if (!requireAdmin(req, res)) return true;
    try {
      const list = await gh('content/cms/pages');
      const pages = await Promise.all(list.filter(x => /\.json$/.test(x.name)).map(async x => {
        let d = {}; try { d = await readJson('content/cms/pages/' + x.name); } catch (_) {}
        return { page: x.name.replace(/\.json$/, ''), updated: d.updated || 0 };
      }));
      return send(res, 200, pages);
    } catch (e) { if (e.notFound || e.missingGithub) return send(res, 200, []); throw e; }
  },
  async page(req, res) {
    if (req.method !== 'PUT' && req.method !== 'DELETE') return false;
    if (!requireAdmin(req, res)) return true;
    const id = safeId(q(req, 'p'));
    if (!id) return send(res, 400, { error: 'Invalid page id' });
    const file = 'content/cms/pages/' + id + '.json';
    if (req.method === 'PUT') {
      const html = bodyOf(req).html;
      if (typeof html !== 'string' || !html.trim()) return send(res, 400, { error: 'Page ka content khali hai, save nahi kiya.' });
      const payload = { html, updated: Date.now() };
      await putFile(file, Buffer.from(JSON.stringify(payload)).toString('base64'), 'CMS: update ' + id + ' page');
      return send(res, 200, { ok: true, updated: payload.updated });
    }
    await deleteFile(file, 'CMS: revert ' + id + ' page');
    return send(res, 200, { ok: true });
  },
  async settings(req, res) {
    if (req.method !== 'GET' && req.method !== 'PUT') return false;
    if (!requireAdmin(req, res)) return true;
    if (req.method === 'GET') {
      try { return send(res, 200, fixSettings(await readJson('content/cms/settings.json'))); }
      catch (e) { if (e.notFound || e.missingGithub) return send(res, 200, {}); throw e; }
    }
    await putFile('content/cms/settings.json', Buffer.from(JSON.stringify(bodyOf(req))).toString('base64'), 'CMS: update site settings');
    return send(res, 200, { ok: true });
  },
  async 'media-list'(req, res) {
    if (req.method !== 'GET') return false;
    if (!requireAdmin(req, res)) return true;
    try {
      const list = await gh('uploads/cms');
      return send(res, 200, list.filter(x => x.type === 'file').map(x => ({ url: '/uploads/cms/' + encodeURIComponent(x.name), up: true })));
    } catch (e) { if (e.notFound || e.missingGithub) return send(res, 200, []); throw e; }
  },
  async media(req, res) {
    if (req.method !== 'POST' && req.method !== 'DELETE') return false;
    if (!requireAdmin(req, res)) return true;
    if (req.method === 'POST') {
      const data = String(bodyOf(req).data || '');
      const m = data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return send(res, 400, { error: 'Only JPEG, PNG and WebP images are supported.' });
      const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
      const name = Date.now() + '-' + crypto.randomBytes(5).toString('hex') + '.' + ext;
      await putFile('uploads/cms/' + name, m[2], 'CMS: upload ' + name);
      return send(res, 200, { url: '/uploads/cms/' + name, name });
    }
    const name = String(q(req, 'id') || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!name) return send(res, 400, { error: 'Missing media id' });
    await deleteFile('uploads/cms/' + name, 'CMS: delete ' + name);
    return send(res, 200, { ok: true });
  }
};

function makeHandler(route) {
  return async function handler(req, res) {
    try {
      if (req.method === 'OPTIONS') return res.status(204).end();
      const result = await routes[route](req, res);
      if (result === false) return send(res, 405, { error: 'Method ' + req.method + ' is not allowed on /api/' + route });
    } catch (e) {
      console.error('[CMS ' + route + ']', e);
      if (res.headersSent) return;
      const status = Number(e && e.status) >= 400 && Number(e.status) < 600 ? Number(e.status) : 500;
      return send(res, status, { error: (e && e.message) || 'Server error' });
    }
  };
}
module.exports = { makeHandler, gh, ghBuffer, githubFailure, setupError, branch, owner, repo, token, ghHeaders, GH_API };
