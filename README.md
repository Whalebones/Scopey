# Scopey SaaS

Scopey is a simple commission tracker and client manager built for freelancers and independent creators. It includes Supabase authentication, commission tracking, and Stripe plan upgrades.

## Setup

### 1. Install dependencies
npm install

### 2. Configure environment variables
Copy `.env.example` to `.env` and update the values with your keys.

Required values:
- `PAID_PLANS_ENABLED` (`false` while Scopey is in public beta)
- `STRIPE_SECRET` (required when `PAID_PLANS_ENABLED=true`)
- `STRIPE_WEBHOOK_SECRET` (required when `PAID_PLANS_ENABLED=true`)
- `STRIPE_PRICE_ID_PRO` (required when `PAID_PLANS_ENABLED=true`)
- `STRIPE_PRICE_ID_BUSINESS` (or legacy `STRIPE_PRICE_ID_PRO_PLUS`, required when `PAID_PLANS_ENABLED=true`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_STORAGE_BUCKET` (optional, defaults to `scopey-uploads`)
- `SCOPEY_ADMIN_EMAILS` (comma-separated Supabase account emails that can view launch readiness)
- `FRONTEND_URL`
- `ADDITIONAL_CORS_ORIGINS` (optional comma-separated list for preview/front-end hosts)
- `PORT` (optional, defaults to `3000`)

Optional email delivery:
- `RESEND_API_KEY`
- `EMAIL_FROM`

Automatic client emails are available on Free and paid plans. If `RESEND_API_KEY` is not set, the Email client button will prepare a secure review link and copy it where browser permissions allow, but no email is sent until Resend is configured.

### 3. Add the database schema
Run `supabase-schema.sql` in the Supabase SQL editor. The file creates the core Scopey tables when they do not exist and upgrades older development schemas with the current production fields.

If your Supabase project was created before the newer project collaboration tables had owner policies, run `supabase-rls-policy-update.sql` once after the main schema. It adds the missing RLS policies for suggestions, updates, activity, share links, agreement versions, deliverables and project payments.

It includes:

- core `projects`, `scope_items`, `changes`, `change_payments` and `processed_events` tables
- owner RLS policies for project, scope and change data used by the frontend
- project lifecycle and agreement fields on `projects`
- `client_email` on `projects` so project links can be addressed to the client
- `freelancer_profiles` for business profile names, profile images and client-facing brand details
- `project_payments` for deposits, milestones, final balances and manual/Stripe payment tracking
- `suggestions` for client-submitted changes, inspiration and alteration requests
- `project_updates` for freelancer progress updates and client notes
- `agreement_templates` for reusable agreement terms
- `project_activity` for the project timeline
- `project_share_links` for scoped client links and revocable token foundations
- `content_reports` and `beta_feedback` for policy reports and public beta feedback
- `user_plans` for Free, Pro and Business subscription state

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

- Set `FRONTEND_URL=http://www.scopey.co.uk` so generated client links, email links and checkout redirects use the public site.
- Add `http://www.scopey.co.uk`, `http://scopey.co.uk`, `https://www.scopey.co.uk` and `https://scopey.co.uk` to Supabase Auth URL settings while DNS/SSL settles.
- In Supabase, set the Site URL to `http://www.scopey.co.uk` and add the same variants as redirect URLs.
- Set `SCOPEY_ADMIN_EMAILS` to your own Scopey/Supabase login email. Only those signed-in accounts can view the launch readiness checklist on the public site.
- Keep `PAID_PLANS_ENABLED=false` until Pro and Business checkout is ready to sell publicly.
- Point the bare domain to the same app or redirect it to `www.scopey.co.uk` in your hosting/DNS provider.
- Deploy HTTPS when available, then update `FRONTEND_URL` to `https://www.scopey.co.uk`.
- Keep `SUPABASE_SERVICE_KEY` and Stripe secrets out of source control.

## Features
- Auth with Supabase
- Commission tracking
- Project lifecycle states from draft through client acceptance, final approval and completion
- Client email capture with optional provider-backed sending and mail-ready fallback links
- Access-code protected email links for client project review
- Public beta feedback capture from the landing page, dashboard and client view
- Project edit, archive and delete controls
- Project agreement drafting with client acceptance snapshots
- Locked accepted agreement snapshots with binary PDF agreement export
- Agreement version history when accepted terms are revised
- Reusable agreement templates
- Project payment tracking for deposits, milestones, final balances and manual payments
- Due-date and overdue payment indicators
- Binary PDF invoice/receipt export for project payments
- Client-submitted suggestions with accept, decline and revised-value flows
- Business profiles with client-facing brand names and profile images
- Project-level currency selection for values and Stripe checkout sessions
- Scoped client links for agreement, scope, payments, changes, suggestions, updates or final approval
- Shared progress/inspiration updates with image uploads
- Final deliverables upload and client approval
- Activity timeline and project image gallery
- Free and paid plans with upgrade flow
- Stripe checkout with trial support
- Webhook-driven plan updates

## Plans

Scopey currently supports three plan keys:

- `free`: 1 active project, automatic client emails, scope/suggestions/updates and client review links
- `pro`: unlimited active projects, agreement templates, PDF exports and Stripe checkout
- `business`: Pro plus higher storage limits and room for future team/business controls

Free users can experience the full handoff loop for one active project. Pro is the main solo-freelancer upgrade and is enforced by the backend for multiple active projects, reusable templates, PDF exports and Stripe checkout.
