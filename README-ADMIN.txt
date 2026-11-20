SHRI KRISHNA KANHAIYA GAUSHALA SEVA — ADMIN PANEL (GITHUB + VERCEL)

The original website pages, design, CSS, JavaScript, images and URL structure are retained.
The Cloudflare Worker/KV dependency has been replaced with Vercel Serverless API routes.
Authentication uses an HttpOnly, Secure, SameSite=Lax signed session cookie. The server checks
the cookie for every protected request. localStorage is NOT used as an authentication store.

PERMANENT SAVING
- Page overrides: content/cms/pages/<page-id>.json
- Site-wide settings: content/cms/settings.json
- Uploaded images: uploads/cms/
- Each save/upload creates a commit in the same GitHub repository.
- Existing Vercel Git integration deploys the repository commit.
- Public pages load shared content from /api/content, so all visitors see the same saved edits.
- No GitHub connect button, browser token entry, Cloudflare Worker or Cloudflare URL is needed.

ONE-TIME VERCEL ENVIRONMENT VARIABLES
In the existing Vercel project, Settings -> Environment Variables, add:

ADMIN_EMAIL       One admin email address
ADMIN_PASSWORD    A strong unique admin password
SESSION_SECRET    Random secret, minimum 32 characters
GITHUB_TOKEN      Fine-grained GitHub token with Contents: Read and write access
GITHUB_OWNER      GitHub account or organization owning the repository
GITHUB_REPO       Exact repository name, without .git
GITHUB_BRANCH     Existing Vercel deployment branch (usually main)

Create the fine-grained token in GitHub Settings -> Developer settings -> Fine-grained personal
access tokens. Restrict it to this one website repository and grant Contents: Read and write.
Do not put the token, password or session secret in any frontend file or commit them to GitHub.

DEPLOYMENT
1. Push this updated project to the SAME GitHub repository and branch already connected to Vercel.
2. Add all seven environment variables above to the existing Vercel project.
3. Redeploy after adding the environment variables.
4. Visit https://YOUR-EXISTING-DOMAIN/admin.html and log in with ADMIN_EMAIL and ADMIN_PASSWORD.
5. Edit a page or site settings and click Save. A successful save creates a GitHub commit.
6. Vercel must finish its deployment before the updated static page is visible publicly.
7. Use the same login credentials on every device/browser.

NOTES
- This ZIP cannot configure your Vercel account or GitHub repository remotely. The one-time env vars and push are required.
- The GitHub token is stored only in Vercel server-side environment variables.
- Uploaded images are resized by the existing editor before upload. Vercel request-size limits still apply.
- A successful save response confirms the GitHub write, not completion of Vercel deployment.
- Old unsynced localStorage drafts are not automatically imported.

TROUBLESHOOTING LOGIN HTTP 500
- Check Vercel -> Project -> Deployments -> latest deployment -> Functions/Runtime Logs.
- Confirm api/login.js, api/me.js, api/logout.js and lib/admin-auth.js exist at the repository root.
- Confirm ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET are set for Production, then redeploy.
- Open /api/me in a browser: expected response before login is HTTP 401 with {"error":"Not logged in"}.
- If /api/me itself is HTTP 500, the function deployment/runtime logs contain the exact reason.


LOGIN SHOWS "Vercel setup incomplete / variable(s) set nahi hain"  (HTTP 503)
This means the running Vercel deployment cannot see ADMIN_EMAIL, ADMIN_PASSWORD or SESSION_SECRET. The code is fine; the variables are missing for that deployment.
1. Vercel -> your project -> Settings -> Environment Variables.
2. Add the three names EXACTLY (capital letters, underscores, no spaces). Tick Production (and Preview if you use preview URLs).
3. Deployments -> latest -> three dots -> Redeploy. Variables added AFTER a deployment never reach that deployment.
4. Open https://YOUR-SITE/api/health . It must show "loginReady": true. For saving edits it must also show "saveReady": true.
   (It prints only true/false, never your password or token.)
5. Log in with the exact ADMIN_EMAIL and ADMIN_PASSWORD you stored in Vercel.

LOGO / FAVICON / ADDRESS
- Header and footer use images/Logo.png everywhere. Favicon files (favicon.png, favicon-32.png, favicon.ico, apple-touch-icon.png) are made from the same logo.
- Registered address used everywhere: Gaushala, 75, Mayapur Ruppur Badshibag, Behat (Saharanpur), Saharanpur, Behat, Uttar Pradesh, India, 247121
- Older edits already saved in GitHub (content/cms/*.json) are cleaned automatically by lib/legacy-fix.js when pages are served, so the old logo and old Hodal address cannot return.
