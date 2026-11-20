SHREEKRISHNA KANHAIYA GAUSHALA — ADMIN PANEL

Admin page: /admin.html

Shared login + shared edits require the Cloudflare Worker backend included in this ZIP. After the one-time setup, the same admin email/password works on every phone, laptop and browser. Page edits, site settings and uploaded media are stored centrally in Cloudflare KV. GitHub connection/token is NOT required; the editor will not ask to connect GitHub.

ONE-TIME CLOUDFLARE SETUP
1) Install Node.js, then run: npm install -g wrangler
2) In this project folder run: npx wrangler login
3) Create shared storage: npx wrangler kv namespace create GAUSHALA_CMS
4) Copy the returned namespace id into wrangler.toml, replacing PASTE_YOUR_KV_NAMESPACE_ID_HERE.
5) Set the admin email:
   npx wrangler secret put ADMIN_EMAIL
   Enter the email address you want to use (the email shown on your existing login screen can be used).
6) Create a strong new admin password and generate its PBKDF2 hash. In the project terminal run this Node command, replacing YOUR_NEW_PASSWORD:
   node -e "const c=require('crypto');const p='YOUR_NEW_PASSWORD';const s=c.randomBytes(16);console.log('SALT='+s.toString('hex'));console.log('HASH='+c.pbkdf2Sync(p,s,310000,32,'sha256').toString('hex'));"
   Copy the printed SALT and HASH values. Set each as a Cloudflare secret:
   npx wrangler secret put ADMIN_PASSWORD_SALT
   npx wrangler secret put ADMIN_PASSWORD_HASH
7) Set a long random signing secret:
   npx wrangler secret put AUTH_SECRET
   Enter a unique random value of at least 32 characters.
8) Deploy: npx wrangler deploy
9) Copy the Worker URL shown after deployment into scripts/cms-config.js:
   window.CMS_WORKER_URL = 'https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev';
10) Upload/push the updated website files to your existing hosting.

After deployment, open https://YOUR-DOMAIN/admin.html and log in using ADMIN_EMAIL and the new password. Repeat login on each device; all saved content syncs automatically.

NOTES
- Worker KV stores CMS page overrides, settings and uploaded image data. The original website design/assets remain in this repository.
- Existing browser-only CMS drafts are not automatically imported. Save/export any important unsynced edits before switching.
- Cloudflare Worker and KV must remain deployed for admin login and shared editing to work.
- Never publish ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT or AUTH_SECRET. They belong only in Cloudflare Worker Secrets.
