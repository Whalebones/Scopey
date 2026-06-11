# Scopey SaaS

Scopey is a simple commission tracker and client manager built for freelancers and independent creators. It includes Supabase authentication, commission tracking, and Stripe plan upgrades.

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
- `SUPABASE_STORAGE_BUCKET` (optional, defaults to `scopey-uploads`)
- `FRONTEND_URL`
- `PORT` (optional, defaults to `3000`)

### 3. Add collaboration tables
Run `supabase-schema.sql` in the Supabase SQL editor to add:

- project lifecycle and agreement fields on `projects`
- `client_email` on `projects` so project links can be addressed to the client
- `freelancer_profiles` for business profile names, profile images and client-facing brand details
- `project_payments` for deposits, milestones, final balances and manual/Stripe payment tracking
- `suggestions` for client-submitted changes, inspiration and alteration requests
- `project_updates` for freelancer progress updates and client notes

Create a public Supabase Storage bucket named `scopey-uploads`, or set
`SUPABASE_STORAGE_BUCKET` to another bucket name.

### 4. Start the backend
npm start

Set `PORT` in `.env` if you want to run the backend somewhere other than
`http://localhost:3000`.

### 5. Run the frontend
Serve the frontend from a local static server for best results:

- `npx serve .`
- or use Live Server in VS Code

Then open the frontend URL and sign in using your Supabase email flow.

### 6. Start Stripe webhook listener (development)
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
- Project lifecycle states from draft through client acceptance, final approval and completion
- Client email capture with mail-ready project handoff links
- Project agreement drafting with client acceptance snapshots
- Project payment tracking for deposits, milestones, final balances and manual payments
- Client-submitted suggestions with accept, decline and revised-value flows
- Business profiles with client-facing brand names and profile images
- Project-level currency selection for values and Stripe checkout sessions
- Scoped client links for agreement, scope, payments, changes, suggestions, updates or final approval
- Shared progress/inspiration updates with image uploads
- Free and paid plans with upgrade flow
- Stripe checkout with trial support
- Webhook-driven plan updates
