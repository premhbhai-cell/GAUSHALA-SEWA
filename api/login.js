const crypto = require('crypto');
const { COOKIE, createSession, json } = require('../lib/admin-auth');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const email = String(req.body && req.body.email || '').trim().toLowerCase();
    const password = String(req.body && req.body.password || '');
    const expectedEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const expectedPassword = String(process.env.ADMIN_PASSWORD || '');
    if (!expectedEmail || !expectedPassword || !process.env.SESSION_SECRET) {
      return json(res, 503, { error: 'Vercel setup incomplete: set ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET, then redeploy.' });
    }
    const a = Buffer.from(password);
    const b = Buffer.from(expectedPassword);
    const passwordOK = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (email !== expectedEmail || !passwordOK) return json(res, 401, { error: 'Email or password is incorrect.' });
    const value = createSession(expectedEmail);
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[admin-login]', e);
    return json(res, 500, { error: 'Admin login server error: ' + (e.message || 'unknown error') });
  }
};
