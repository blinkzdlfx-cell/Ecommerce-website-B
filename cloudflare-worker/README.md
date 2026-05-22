# Beulah Payments Worker

## Quick start

1. Open terminal in this folder:

```bash
cd cloudflare-worker
```

2. Install and login:

```bash
npm install
npx wrangler login
```

3. Add secrets:

```bash
npx wrangler secret put PAYSTACK_SECRET_KEY
npx wrangler secret put PAYSTACK_PUBLIC_KEY
npx wrangler secret put PAYSTACK_WEBHOOK_SECRET
npx wrangler secret put FIREBASE_WEB_API_KEY
npx wrangler secret put ADMIN_OWNER_EMAILS
```

4. Deploy:

```bash
npx wrangler deploy
```

5. Copy the Worker URL and paste it into:

`js/backend-config.js`

## Endpoints

- `POST /createCheckoutSession`
- `POST /confirmCheckoutPayment`
- `POST /getOrderStatus`
- `POST /adminListOrders`
- `POST /bootstrapAdminAccess`
- `POST /paystackWebhook`
- `GET /health`
