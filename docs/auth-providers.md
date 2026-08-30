# Social sign-in and Tier 2 phone verification

## Google and Apple

The buttons are already present in Phoenix. They will work only after their providers are enabled in **Supabase Dashboard → Authentication → Providers**.

- Google: create an OAuth web application in Google Cloud, then enter its client ID and client secret in Supabase.
- Apple: create a Sign in with Apple Service ID and key in Apple Developer, then enter the Apple details in Supabase.
- Add `https://phoenixhandel.com/auth/callback` to both provider configurations and to Supabase Redirect URLs.

## Tier 2 SMS

Phoenix uses Supabase Phone Login for Tier 2. Enable Phone in Supabase, then configure a supported SMS provider—currently MessageBird, Twilio, Vonage, or community-supported TextLocal. Compare current delivery prices for the countries you will actually serve before choosing one.

Phone confirmation is an optional second contact factor; it never replaces the confirmed email that establishes Tier 1. Apply CAPTCHA and conservative Supabase SMS/OTP quotas before enabling it for public traffic.

Tier 3 identity verification is currently unavailable. Phoenix does not accept identity documents in this deployment.
