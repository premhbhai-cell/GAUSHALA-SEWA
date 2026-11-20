const crypto = require('crypto');
const COOKIE = 'gaushala_admin';

function sign(value) {
  const secret = process.env.SESSION_SECRET;
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
    return payload.email === String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
      && payload.exp > Date.now();
  } catch (_) { return false; }
}
function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}
module.exports = { COOKIE, createSession, hasValidSession, json };
