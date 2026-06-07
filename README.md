# Scopey SaaS

Scopey is a simple commission tracker and client manager built for creative teams. It includes Supabase authentication, commission tracking, and Stripe plan upgrades.

## Setup

### 1. Install dependencies
npm install

### 2. Configure environment variables
Copy `.env.example` to `.env` and update the values with your keys.

Required values:
- `STRIPE_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_PRICE_ID_PRO_PLUS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `FRONTEND_URL`

### 3. Start the backend
npm start

### 4. Run the frontend
Serve the frontend from a local static server for best results:

- `npx serve .`
- or use Live Server in VS Code

Then open the frontend URL and sign in using your Supabase email flow.

### 5. Start Stripe webhook listener (development)
stripe listen --forward-to localhost:3000/webhook

## Notes

- The frontend uses Supabase email login and a public publishable key.
- The backend handles checkout session creation and Stripe webhooks.
- `node_modules` should remain local and should not be committed.

## Production tips

- Deploy the frontend on HTTPS.
- Set `FRONTEND_URL` to your production domain.
- Keep `SUPABASE_SERVICE_KEY` and Stripe secrets out of source control.

## Features
- Auth with Supabase
- Commission tracking
- Free and paid plans with upgrade flow
- Stripe checkout with trial support
- Webhook-driven plan updates
