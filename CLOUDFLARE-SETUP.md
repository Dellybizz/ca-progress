# Cloudflare Workers staging setup

The existing Vercel deployment remains supported. Cloudflare uses separate scripts so staging can be tested before DNS is changed.

## Required Cloudflare build variables and secrets

Copy the values from the current Vercel project without exposing them in Git:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

## Commands

- `npm run build` — existing Next.js/Vercel build
- `npm run cf:build` — generate the Cloudflare Worker
- `npm run cf:preview` — local Workers-runtime preview
- `npm run cf:check` — Cloudflare dry-run validation
- `npm run cf:deploy` — deploy after Cloudflare authentication

Do not connect the production custom domain until login, progress saving, admin access and Razorpay webhooks pass on the `workers.dev` staging URL.
