const crypto = require('crypto');
const COOKIE = 'gaushala_admin';

// Reads a Vercel env var safely: trims spaces/newlines and removes accidental surrounding quotes.
function env(name) {
  let v = String(process.env[name] || '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
  return v;
}
function missingAuthEnv() {
  return ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SESSION_SECRET'].filter(n => !env(n));
}

function sign(value) {
  const secret = env('SESSION_SECRET');
  if (!secret) throw new Error('SESSION_SECRET is missing in Vercel Environment Variables.');
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}
function createSession(email) {
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  })).toString('base64url');
  return payload + '.' + sign(payload);
}
function hasValidSession(req) {
  try {
    const header = req.headers.cookie || '';
    const item = header.split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='));
    if (!item) return false;
    const value = decodeURIComponent(item.slice(COOKIE.length + 1));
    const parts = value.split('.');
    if (parts.length !== 2) return false;
    const expected = sign(parts[0]);
    const a = Buffer.from(parts[1]);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return payload.email === env('ADMIN_EMAIL').toLowerCase()
      && payload.exp > Date.now();
  } catch (_) { return false; }
}
function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}
module.exports = { COOKIE, env, missingAuthEnv, createSession, hasValidSession, json };
