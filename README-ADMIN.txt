SHREEKRISHNA KANHAIYA GAUSHALA — ADMIN PANEL

Admin: /admin.html. Sign in with the server-configured admin email/password.
Pages: edit page text, images, blocks, links and layout. Scanner, Links & Contact: update QR, UPI, contact, bank details and banners. Media Library: upload and manage images.

Donation flow: original donation form remains. Donor enters details and selects Donate Now; the existing modal switches to QR + bank details. It must not open a second form over the payment screen.

Cross-device saving is implemented through the Cloudflare Worker in cloudflare-worker/. Complete the one-time setup in CLOUD-ADMIN-SETUP.txt before using the cloud admin. GitHub credentials are server-side only; the admin panel does not ask users to connect GitHub.
