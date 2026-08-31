# Phoenix production deployment

## What is ready in the codebase

- Tier 1 is established only by a confirmed email address. The API refuses to provision an application account until that email is confirmed.
- Registration requires at least 12 characters with a lowercase letter, uppercase letter, digit, and special character.
- The browser applies a 60-second resend lock for email and SMS codes. Supabase remains the authoritative rate limiter for authentication requests.
- Tier 2 is wired to Supabase Phone Login. It becomes active after an SMS provider is configured.
- Tier 3 is intentionally unavailable. Phoenix does not offer a document upload or identity-review path in this deployment.
- Phoenix Assist is a site-wide chat widget. With no `OPENAI_API_KEY`, it provides the built-in safe guidance instead of calling an AI provider.
- The authenticated contact form delivers to `phoenixhandel@protonmail.com` only when `RESEND_API_KEY` and `SUPPORT_FROM_EMAIL` are configured on the API server. The key never belongs in Vite or the browser.

## Render Blueprint

[`render.yaml`](../render.yaml) creates three Frankfurt resources:

1. `phoenix-web` — Vite static site at `phoenixhandel.com`.
2. `phoenix-api` — Express API at `api.phoenixhandel.com`.
3. `phoenix-db` — PostgreSQL, connected to the API through Render's private connection string.

The API build applies database migrations before each deploy. The static-site rewrite is included so a direct visit to any React route works.

## Required values when creating the Blueprint

Render will ask for each value marked `sync: false`. Use the production values only; never commit them.

| Resource | Variable | Value |
| --- | --- | --- |
| `phoenix-api` | `CORS_ORIGIN` | `https://phoenixhandel.com` |
| `phoenix-api` | `SUPABASE_URL` | Your Supabase project URL |
| `phoenix-api` | `SUPABASE_ANON_KEY` | The Supabase browser/publishable key |
| `phoenix-api` | `OPENAI_API_KEY` | A server-side OpenAI API key, if enabling AI answers |
| `phoenix-web` | `VITE_API_BASE_URL` | `https://api.phoenixhandel.com` |
| `phoenix-web` | `VITE_SUPABASE_URL` | Your Supabase project URL |
| `phoenix-web` | `VITE_SUPABASE_ANON_KEY` | The Supabase browser/publishable key |
| `phoenix-web` | `VITE_LOGO_DEV_PUBLISHABLE_KEY` | The existing Logo.dev publishable key |

Do not add Stripe Identity variables while Tier 3 is out of service.

## Supabase configuration that requires dashboard access

### Email and redirects

1. Complete the Resend–Supabase integration's **Ready to send** step.
2. Keep **Confirm email** enabled.
3. Set Site URL to `https://phoenixhandel.com`.
4. Add `https://phoenixhandel.com/auth/callback` to Redirect URLs.
5. In **Authentication → Email Templates → Confirm signup**, use [`confirm-signup.html`](../apps/web/email-templates/confirm-signup.html). It must retain `{{ .Token }}` for the eight-digit code.
6. Send one real test email to confirm it arrives from `Phoenix <security@phoenixhandel.com>`.

### Tier 2 SMS

1. In **Authentication → Providers**, enable **Phone**.
2. Configure a supported SMS provider. Supabase currently documents MessageBird, Twilio, Vonage, and community-supported TextLocal for hosted projects. Choose based on the countries you will actually serve and their current delivery price.
3. Add the provider credentials in Supabase—never in the Phoenix browser bundle.
4. Enable CAPTCHA before allowing public SMS delivery.
5. Send and verify a test code on a real phone number. The application then shows Tier 2 as complete.

### Supabase authentication rate limits

Open **Authentication → Rate Limits** and set a conservative launch policy. A practical starting point is 10 for anonymous users, email sent, SMS sent, verification requests, and OTP requests. Supabase's own per-user resend windows should remain at 60 seconds or longer. Revisit the values after observing legitimate traffic and provider costs.

## DNS at Njalla

After Render creates both services, add the exact DNS records Render displays for:

- `phoenixhandel.com` → `phoenix-web`
- `api.phoenixhandel.com` → `phoenix-api`

Do not remove the Resend SPF/DKIM records. Remove conflicting `AAAA` records while validating Render, then verify both domains in Render. Render provisions and renews TLS automatically once verification succeeds.

## Production acceptance test

Before announcing the service, test from a browser outside the development machine:

1. Visit `https://phoenixhandel.com`, create a new account, and confirm the eight-digit email code.
2. Confirm all protected routes redirect until the email is verified.
3. Confirm a weak password is rejected and a policy-compliant password succeeds.
4. Confirm a resend control is disabled for 60 seconds and Supabase returns `429` when its configured limit is exceeded.
5. Complete a real Tier 2 phone verification after the provider is enabled.
6. Verify Tier 3 displays as temporarily unavailable and does not accept documents.
7. Check `https://api.phoenixhandel.com/api/health`, live market prices, and Phoenix Assist both with and without the AI key.

## External references

Supabase documents phone provider setup and its default OTP interval in its [Phone Login guide](https://supabase.com/docs/guides/auth/phone-login), and authentication quotas in its [Rate Limits guide](https://supabase.com/docs/guides/auth/rate-limits). Render documents Blueprint fields and migrations in its [Blueprint reference](https://render.com/docs/blueprint-spec), and custom-domain/TLS setup in its [Custom Domains guide](https://render.com/docs/custom-domains).
