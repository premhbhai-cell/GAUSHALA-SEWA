const { hasValidSession, json } = require('../lib/admin-auth');
module.exports = function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  return hasValidSession(req) ? json(res, 200, { ok: true }) : json(res, 401, { error: 'Not logged in' });
};
