const { env, json } = require('../lib/admin-auth');
// Open https://YOUR-SITE/api/health to see which Vercel variables this deployment can read.
// It reports only true/false - never the values.
module.exports = function handler(req, res) {
  const names = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SESSION_SECRET', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_BRANCH'];
  const set = {};
  names.forEach(n => { set[n] = !!env(n); });
  const loginReady = set.ADMIN_EMAIL && set.ADMIN_PASSWORD && set.SESSION_SECRET;
  const saveReady = set.GITHUB_TOKEN && set.GITHUB_OWNER && set.GITHUB_REPO;
  return json(res, 200, { loginReady, saveReady, variables: set, vercelEnv: process.env.VERCEL_ENV || 'unknown' });
};
