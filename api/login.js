const crypto = require('crypto');
const { COOKIE, env, missingAuthEnv, createSession, json } = require('../lib/admin-auth');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const missing = missingAuthEnv();
    if (missing.length) {
      return json(res, 503, {
        error: 'Vercel me ye variable(s) set nahi hain ya is deployment tak nahi pahunche: ' + missing.join(', ') +
          '. Settings -> Environment Variables me Production tick karke add karein, phir Redeploy karein.'
      });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
    const email = String(body && body.email || '').trim().toLowerCase();
    const password = String(body && body.password || '').trim();
    const expectedEmail = env('ADMIN_EMAIL').toLowerCase();
    const expectedPassword = env('ADMIN_PASSWORD');
    const a = Buffer.from(password);
    const b = Buffer.from(expectedPassword);
    const passwordOK = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (email !== expectedEmail || !passwordOK) return json(res, 401, { error: 'Email ya password galat hai.' });
    const value = createSession(expectedEmail);
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[admin-login]', e);
    return json(res, 500, { error: 'Admin login server error: ' + (e.message || 'unknown error') });
  }
};
