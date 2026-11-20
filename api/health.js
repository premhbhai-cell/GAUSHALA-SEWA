const { env, json } = require('../lib/admin-auth');
const { GH_API, ghHeaders, branch, owner, repo } = require('../lib/cms-api');
// Open https://YOUR-SITE/api/health            -> which Vercel variables this deployment can read (true/false only)
// Open https://YOUR-SITE/api/health?deep=1     -> also tests the real GitHub connection (token, repo, branch, write access)
module.exports = async function handler(req, res) {
  const names = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SESSION_SECRET', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_BRANCH'];
  const set = {};
  names.forEach(n => { set[n] = !!env(n); });
  const loginReady = set.ADMIN_EMAIL && set.ADMIN_PASSWORD && set.SESSION_SECRET;
  const saveReady = set.GITHUB_TOKEN && set.GITHUB_OWNER && set.GITHUB_REPO;
  const out = { loginReady, saveReady, variables: set, vercelEnv: process.env.VERCEL_ENV || 'unknown', apiFiles: 'ok' };
  const deep = String((req.query && req.query.deep) || '') === '1';
  if (deep) {
    if (!saveReady) out.github = 'GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO Vercel me set nahi hain.';
    else {
      try {
        const base = GH_API + '/repos/' + owner() + '/' + repo();
        const r = await fetch(base, { headers: ghHeaders('application/vnd.github+json') });
        const d = await r.json().catch(() => ({}));
        if (r.status === 401) out.github = 'FAIL: GITHUB_TOKEN galat ya expire hai.';
        else if (r.status === 404) out.github = 'FAIL: repo nahi mila. GITHUB_OWNER/GITHUB_REPO galat hain ya token is repo ko access nahi kar sakta.';
        else if (!r.ok) out.github = 'FAIL: GitHub ne ' + r.status + ' diya (' + (d.message || '') + ').';
        else {
          const b = await fetch(base + '/branches/' + encodeURIComponent(branch()), { headers: ghHeaders('application/vnd.github+json') });
          if (!b.ok) out.github = 'FAIL: branch "' + branch() + '" nahi mili. GITHUB_BRANCH sahi likhein (default branch: ' + d.default_branch + ').';
          else if (d.permissions && d.permissions.push === false) out.github = 'FAIL: token ke paas write permission nahi hai. "Contents: Read and write" do.';
          else out.github = 'OK: repo ' + d.full_name + ', branch ' + branch() + ' - save kaam karega.';
        }
      } catch (e) { out.github = 'FAIL: GitHub se connect nahi ho paya: ' + e.message; }
    }
  }
  return json(res, 200, out);
};
