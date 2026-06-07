# Scopey SaaS (Complete Version)

## Setup

### 1. Install dependencies
npm install express stripe cors @supabase/supabase-js

### 2. Set environment variables

STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_ID_PRO=price_1TfeAZHbHMKHnVYfBiuehzUG
STRIPE_PRICE_ID_PRO_PLUS=price_1TfeCTHbHMKHnVYfuRt8LhVZ

SUPABASE_URL=https://nxqwrlbwnaqntuvcspln.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here

### 3. Run backend
node server.js

### 4. Start Stripe webhook
stripe listen --forward-to localhost:3000/webhook

### 5. Run frontend
Open `index.html` locally, or deploy the frontend to your domain and set `FRONTEND_URL` to `http://scopey.co.uk`.

> For production, use HTTPS if possible: `https://scopey.co.uk`.

## Features
- Auth (Supabase)
- Commission tracking
- Free vs Pro vs Pro+
- Stripe payments + 30-day trial
- Webhooks (auto upgrade / downgrade)
