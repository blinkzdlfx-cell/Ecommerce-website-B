# Security Setup (Cloudflare Worker + Firebase Auth + Paystack)

This setup removes the Firebase Functions dependency (so no Blaze requirement).

## 1) Worker folder

Backend code is in `cloudflare-worker/src/index.js`.

## 2) Install and login (one time)

```bash
cd cloudflare-worker
npm install
npx.cmd --yes wrangler login
npx.cmd --yes wrangler whoami
```

## 3) Set Worker secrets

Run these commands in `cloudflare-worker`:

```bash
npx.cmd --yes wrangler secret put PAYSTACK_SECRET_KEY
npx.cmd --yes wrangler secret put PAYSTACK_PUBLIC_KEY
npx.cmd --yes wrangler secret put PAYSTACK_WEBHOOK_SECRET
npx.cmd --yes wrangler secret put FIREBASE_WEB_API_KEY
npx.cmd --yes wrangler secret put ADMIN_OWNER_EMAILS
```

Use these values:

- `PAYSTACK_SECRET_KEY`: your Paystack secret key
- `PAYSTACK_PUBLIC_KEY`: your Paystack public key
- `PAYSTACK_WEBHOOK_SECRET`: your Paystack webhook signing secret
- `FIREBASE_WEB_API_KEY`: from `js/firebase-config.js` (`apiKey`)
- `ADMIN_OWNER_EMAILS`: comma-separated admin emails (example: `you@gmail.com,team@company.com`)

Optional (recommended if your Firebase project id differs from default):

```bash
npx.cmd --yes wrangler secret put FIREBASE_PROJECT_ID
```

## 4) Allowed frontend origins

Edit `cloudflare-worker/wrangler.toml` and set `ALLOWED_ORIGINS` to your real frontend domains.

Local default is:

`http://127.0.0.1:5500,http://localhost:5500`

## 5) Deploy Worker

```bash
npx.cmd --yes wrangler deploy
```

Copy the deployed Worker URL (example: `https://beulah-payments-api.<subdomain>.workers.dev`).

## 6) Deploy frontend to Cloudflare Pages

From repo root (PowerShell):

```powershell
$dist = "pages-dist"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist | Out-Null
Copy-Item *.html $dist
Copy-Item css,js,images $dist -Recurse

# one-time project create
npx.cmd --yes wrangler pages project create beulah-foods-store --production-branch main

# deploy
npx.cmd --yes wrangler pages deploy pages-dist --project-name beulah-foods-store --branch main
```

Frontend URL example:

`https://beulah-foods-store.pages.dev`

## 7) Connect frontend to Worker

Open `js/backend-config.js` and replace:

`REPLACE_WITH_YOUR_WORKER_URL`

with your Worker URL.

## 8) Set CORS allowed origins

In `cloudflare-worker/wrangler.toml`, set:

`ALLOWED_ORIGINS="http://127.0.0.1:5500,http://localhost:5500,https://beulah-foods-store.pages.dev"`

Then redeploy Worker.

## 9) Set Paystack webhook URL

In Paystack dashboard, set webhook URL to:

`https://<your-worker-domain>/paystackWebhook`

## 10) Firebase auth domain allowlist

In Firebase Console -> Authentication -> Settings -> Authorized domains, add:

- `beulah-foods-store.pages.dev`
- your custom domain later (for example `beulahfoods.com`)

## 11) What is secured now

- Price/totals are recalculated on backend (`createCheckoutSession`)
- Payment verification uses secret key on backend (`confirmCheckoutPayment`)
- Receipt is loaded from backend verification (`getOrderStatus`)
- Admin orders endpoint is restricted to `ADMIN_OWNER_EMAILS` (`adminListOrders`)

## 12) Firebase rules still needed

Publish `firestore.rules` for user settings security:

- only owner can read/write `users/{uid}/settings/profile`
- `products/{productId}` read is public, write is admin-only (`admin` custom claim or whitelisted admin emails in rules)
