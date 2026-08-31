# Phoenix production deployment

## What is ready in the codebase

- Tier 1 is established only by a confirmed email address. The API refuses to provision an application account until that email is confirmed.
- Registration requires at least 12 characters with a lowercase letter, uppercase letter, digit, and special character.
- The browser applies a 60-second resend lock for email and SMS codes. Supabase remains the authoritative rate limiter for authentication requests.
- Tier 2 changes the phone number on the authenticated Supabase account, then confirms its `phone_change` code. It becomes active after an SMS provider is configured.
- Registration and password login require Cloudflare Turnstile. The secret is held only by Supabase; Phoenix receives only the public widget key at build time.
- Tier 3 is intentionally unavailable. Phoenix does not offer a document upload or identity-review path in this deployment.
- Phoenix Assist is a site-wide chat widget. With no `OPENAI_API_KEY`, it provides the built-in safe guidance instead of calling an AI provider.
- The authenticated contact form delivers to `phoenixhandel@protonmail.com` only when `RESEND_API_KEY` and `SUPPORT_FROM_EMAIL` are configured on the API server. The key never belongs in Vite or the browser.

## VPS Docker Compose deployment

The live deployment runs from `/opt/Phoenix` on the VPS. Rebuild and recreate only the web container after changing public Vite configuration:

```bash
cd /opt/Phoenix
docker compose --env-file .env.production -f docker-compose.production.yml build web
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps --force-recreate web
```

The API and PostgreSQL services remain on the private Compose network; Caddy serves the public React application and `/api` requests.

## Required VPS configuration

Set these values in `/opt/Phoenix/.env.production`. Use production values only; never commit that file.

| Service | Variable | Value |
| --- | --- | --- |
| `api` | `CORS_ORIGIN` | `https://phoenixhandel.com` |
| `api` | `SUPABASE_URL` | Your Supabase project URL |
| `api` | `SUPABASE_ANON_KEY` | The Supabase browser/publishable key |
| `api` | `OPENAI_API_KEY` | A server-side OpenAI API key, if enabling AI answers |
| `web` | `VITE_SUPABASE_URL` | Your Supabase project URL |
| `web` | `VITE_SUPABASE_ANON_KEY` | The Supabase browser/publishable key |
| `web` | `VITE_LOGO_DEV_PUBLISHABLE_KEY` | The existing Logo.dev publishable key |
| `web` | `VITE_TURNSTILE_SITE_KEY` | The public `0x...` site key for `phoenixhandel.com` |

Do not add Stripe Identity variables while Tier 3 is out of service.

## Supabase configuration that requires dashboard access

### Email and redirects

1. Complete the Resend–Supabase integration's **Ready to send** step.
2. Keep **Confirm email** enabled.
3. Set Site URL to `https://phoenixhandel.com`.
4. Add `https://phoenixhandel.com/auth/callback` to Redirect URLs.
5. In **Authentication → Email Templates → Confirm signup**, use [`confirm-signup.html`](../apps/web/email-templates/confirm-signup.html). It must retain `{{ .Token }}` for the eight-digit code.
6. Send one real test email to confirm it arrives from `Phoenix <security@phoenixhandel.com>`.

### CAPTCHA

1. In Cloudflare Turnstile, create a managed widget for `phoenixhandel.com` and add any development hostname used for local testing.
2. Put the public site key in the VPS `.env.production` as `VITE_TURNSTILE_SITE_KEY=0x...`, then rebuild the `web` service.
3. In **Supabase → Authentication → Bot and Abuse Protection**, enable CAPTCHA, choose Cloudflare Turnstile, and add the matching secret key there.
4. Never add the Turnstile secret to Phoenix source, Docker Compose, Vite, or the VPS `.env.production`.
5. Test a new registration and a password login. Both must show a completed security check before Supabase receives the request.

### Tier 2 SMS

1. In **Authentication → Providers**, enable **Phone**.
2. Configure a supported SMS provider. Supabase currently documents MessageBird, Twilio, Vonage, and community-supported TextLocal for hosted projects. Choose based on the countries you will actually serve and their current delivery price.
3. Add the provider credentials in Supabase—never in the Phoenix browser bundle.
4. Send and verify a test code on a real phone number while signed in. Confirm it is a `phone_change` verification for the existing account, rather than a passwordless phone login.

### Supabase authentication rate limits

Open **Authentication → Rate Limits** and set a conservative launch policy. A practical starting point is 10 for anonymous users, email sent, SMS sent, verification requests, and OTP requests. Supabase's own per-user resend windows should remain at 60 seconds or longer. Revisit the values after observing legitimate traffic and provider costs.

## DNS at Njalla

Point the domain at the VPS and preserve the Resend SPF/DKIM records:

- `phoenixhandel.com` → the VPS public IPv4 address
- `www.phoenixhandel.com` → the same address, if used

Do not remove the Resend SPF/DKIM records. Caddy provisions and renews TLS automatically after the A record resolves to the VPS.

## Production acceptance test

Before announcing the service, test from a browser outside the development machine:

1. Visit `https://phoenixhandel.com`, complete the CAPTCHA, create a new account, and confirm the eight-digit email code.
2. Confirm all protected routes redirect until the email is verified.
3. Confirm a weak password is rejected, a policy-compliant password succeeds, and password login also requires CAPTCHA.
4. Confirm a resend control is disabled for 60 seconds and Supabase returns `429` when its configured limit is exceeded.
5. Complete a real Tier 2 phone change after the provider is enabled; the existing email session must remain active.
6. Verify Tier 3 displays as temporarily unavailable and does not accept documents.
7. Check `https://phoenixhandel.com/api/health`, live market prices, Phoenix Assist, and the absence of Google/Apple sign-in controls.

## External references

Supabase documents CAPTCHA setup in its [CAPTCHA guide](https://supabase.com/docs/guides/auth/auth-captcha), phone provider setup and its default OTP interval in its [Phone Login guide](https://supabase.com/docs/guides/auth/phone-login), and authentication quotas in its [Rate Limits guide](https://supabase.com/docs/guides/auth/rate-limits).
