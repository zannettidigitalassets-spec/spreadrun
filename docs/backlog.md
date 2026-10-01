# SecondRing build backlog

## Post-trial / post-cancellation data retention timer
Terms and Privacy currently say only "we may delete your data after your trial or subscription ends" (no promised window).
Build a real retention clock before promising a number:
- Record when access ends (trial_ends_at passes without subscription, or customer.subscription.deleted).
- Scheduled job (Vercel cron) that deletes or anonymizes conversations, messages, phone_numbers and settings after N days (target: 30), and emails a warning beforehand.
- Cancel the clock when the user resubscribes.
- Only then update the legal pages and the in-app expired/paywall copy to state the window.

## Other
- Live-mode Solo/Shop products and price IDs for Production.
- Stripe Customer Portal configuration (test, then live).
- Remove dormant real-estate code and leftover buy.stripe.com links.
