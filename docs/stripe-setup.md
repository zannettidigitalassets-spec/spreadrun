# Stripe / billing setup (SecondRing)

Env vars (Vercel, set per environment; use test-mode values for Preview):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_SHOP` (flat $19 / $29 monthly prices)
- `SUPABASE_SERVICE_KEY` (and optional `SUPABASE_URL`), `RESEND_API_KEY`, optional `SITE_URL`

Webhook endpoint: `/api/stripe-webhook`, events: `checkout.session.completed`,
`customer.subscription.created|updated|deleted`, `invoice.payment_failed`.
API version is pinned in `api/_lib/clients.js` (`STRIPE_API_VERSION`); the webhook endpoint in the
dashboard should use the same version.

Run `supabase/migrations/20260930_profiles_billing_columns.sql` before deploying.
Billing endpoints require `Authorization: Bearer <supabase access token>`; identity is never taken from the body.
