# Admin hierarchy, members and subscriptions setup

## 1. Apply the database upgrade

Open Supabase **SQL Editor**, paste the complete contents of:

`supabase/admin-hierarchy-members-payments.sql`

Run it once. It preserves existing users, progress and subscriptions. The earliest
existing Owner becomes the single Parent Owner.

Then run the complete contents of:

`supabase/moderation-controls.sql`

This adds the protected member-directory fallback, per-channel Moderator
permissions, timed chat blocks and student violation notices.

Finally run:

`supabase/page-elements-editor.sql`

This creates the detailed page-element registry used by the Admin Page Builder.

## 2. Add Vercel server variables

In Vercel → Project → Settings → Environment Variables add:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Project Settings → API → service role key.
- `RAZORPAY_KEY_ID` — Razorpay key ID.
- `RAZORPAY_KEY_SECRET` — Razorpay key secret.
- `RAZORPAY_WEBHOOK_SECRET` — a new secret chosen while creating the webhook.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — the same Razorpay key ID (safe public checkout key).

Never prefix the Supabase service-role key or Razorpay secret with `NEXT_PUBLIC_`.

## 3. Configure Razorpay

Create a webhook in Razorpay with this URL:

`https://caprogress.zanisheluxe.in/api/payments/webhook`

Enable the `payment.captured` event and enter the same webhook secret stored in
`RAZORPAY_WEBHOOK_SECRET`. Start with Razorpay Test Mode and test one purchase.

## 4. Set plan prices

Open `/admin` → **Plans**, set monthly prices for Pro/Premium and save. Users can
then open `/pricing` from Settings and purchase a plan.

## Role rules

- Parent Owner: exactly one; can manage Owners, Admins and Moderators.
- Owner: can manage Admins and Moderators, never another Owner.
- Admin and Moderator: cannot grant or remove administrator access.
- Nobody can change or remove their own role.
- Parent ownership can only change through the protected transfer control.
