# CAPTCHA, Phone Verification, and OAuth Removal Design

## Goal

Protect password registration, password sign-in, and account-bound phone verification with Cloudflare Turnstile; remove Google and Apple sign-in from the product surface; and make Tier 2 attach a verified phone number to the authenticated Phoenix account instead of performing a separate passwordless phone sign-in.

## Constraints

- Email-confirmed Supabase sessions remain the sole gate for protected Phoenix routes.
- Turnstile is mandatory in production for registration, password sign-in, and the phone-number send action. A missing public site key prevents submission and gives a configuration error rather than silently bypassing CAPTCHA.
- The Turnstile secret is configured only in Supabase Auth Bot and Abuse Protection. It is never committed, sent to the API, or exposed in Vite.
- `VITE_TURNSTILE_SITE_KEY` is public browser configuration and is passed as a Docker build argument.
- Password reset and email-code resend flows are out of scope for this change.
- Google and Apple UI and OAuth calls are removed. Providers may also be disabled in the Supabase dashboard, but no provider credential is stored in Phoenix.
- Phone verification updates the current authenticated user. It must not create or switch to a separate phone-login account.

## CAPTCHA Architecture

Create a small `TurnstileCaptcha` web component that loads Cloudflare's explicit-render script once, renders a widget from `VITE_TURNSTILE_SITE_KEY`, and reports a short-lived token to its parent. It resets after each attempted protected Auth request because a token is single-use.

`AuthPage` renders the component for `register` and `login` modes. The submit button remains disabled until a token exists. `signUp` receives the token through Supabase's CAPTCHA option, and `signInWithPassword` receives the same option. Reset-password mode remains unchanged.

`PhoneVerificationPage` uses the same component only while sending a phone-change code. The confirmation-code submission does not need a new widget token because it verifies the code issued by the prior protected request.

Add `VITE_TURNSTILE_SITE_KEY` to `.env.example`, `.env.production.example`, the production Compose web build arguments, and the Dockerfile build environment. The production key value is provided by the operator; tests supply a deterministic widget double.

## Account-Bound Phone Verification

Replace `signInWithOtp({ phone })` with `auth.updateUser({ phone }, { captchaToken })`. This sends the verification SMS for the current account's pending phone change. Replace `verifyOtp({ phone, token, type: "sms" })` with `verifyOtp({ phone, token, type: "phone_change" })`.

On success, refresh the Supabase session and provision/synchronize the Phoenix application user without changing the authenticated user identity. The Verification page continues to derive Tier 2 completion from `phone_confirmed_at`.

Phone input remains E.164-only at the UI boundary. The existing 60-second resend cooldown stays in effect. Supabase Phone and an SMS provider are enabled only after the code path is deployed and Cloudflare Turnstile is configured in Supabase.

## OAuth Removal

Remove the Google/Apple copy strings, unavailable-provider messages, `CompanyLogo` import, OAuth handler, divider, and social buttons from `AuthPage`. Remove related tests and replace them with one behavior test proving no Google or Apple sign-in control is rendered in either access mode.

## Error Handling

- Missing Turnstile key or token: show a clear security-check configuration/completion message and do not call Supabase Auth.
- Turnstile script/render failure: show the same safe unavailable state and do not call Supabase Auth.
- Supabase CAPTCHA rejection: preserve the returned error text, reset the widget, and require a fresh token.
- Phone update or `phone_change` verification failure: preserve the active session, show the returned error, and leave Tier 2 incomplete.

## Verification

Tests will prove that registration and login never call Supabase without a CAPTCHA token, pass a token once present, render no social-provider buttons, and use `updateUser` plus `phone_change` for account-bound phone verification. Existing Auth, session, verification, and route-change tests remain green.

## Operator Setup and Deployment

Before deployment, create a Cloudflare Turnstile site for `phoenixhandel.com`. Add its site key to the VPS `.env.production` as `VITE_TURNSTILE_SITE_KEY`; configure the secret key in Supabase Authentication Bot and Abuse Protection; enable Phone and add the chosen SMS provider credentials in Supabase. Rebuild the web image, recreate the web service, run the full frontend tests and build, then manually test registration, password login, and phone change using a real number.
