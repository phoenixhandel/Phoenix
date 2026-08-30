# Account Session and Settings Design

## Goal

Make Phoenix behave like a coherent, secure account application: an email-confirmed session has one source of truth across every route, users can manage their account preferences, portfolio values use a selected fiat display currency, and support requests are delivered safely to the Phoenix inbox.

## Constraints

- Supabase remains the authority for authentication, password changes, email changes, token refresh, and sign-out.
- A confirmed email remains mandatory for every protected product route and API call.
- The PostgreSQL application user record remains the authority for Phoenix roles, account state, balance ownership, and currency preference.
- Account API calls must use the current Supabase access token; no page may infer authentication from a stale, page-local browser value.
- EUR is the initial display currency for every existing and new account.
- Wallet amounts remain exact asset quantities. Fiat values are display-only estimates derived from the current market reference and are never written to the ledger.
- No private credentials are exposed to the browser. Support mail uses a server-only Resend API credential.
- The ledger and audit trail remain immutable. Removing the reason field means removing editable free-text input, not erasing accountability.

## Session Architecture

`AuthSessionProvider` wraps the router and owns the one verified-session state for the browser. It initializes from `supabase.auth.getSession()` and listens to `onAuthStateChange`, exposing a pending, anonymous, unverified, or verified state plus the current access token.

`RequireVerifiedSession` consumes that provider instead of reading a custom local-storage token. It renders a loading state while Supabase resolves and redirects any anonymous or unverified state to the appropriate login/verification path. A `PublicOnlyRoute` sends verified sessions from `/`, `/login`, `/register`, and password-reset pages to `/account`.

The workspace logo points to `/account`; public/auth-page logos point to `/`. This preserves the mental model that the Phoenix workspace home is the account overview and the marketing landing page is for signed-out visitors.

The legacy `phoenix_access_token` value is retained only as a compatibility cache while all account data fetches move to a shared `getAccessToken()` helper backed by the current Supabase session. Sign-out clears both the provider state and the compatibility value.

## Settings and Preferences

Add `display_currency` to `users`, as a three-character value constrained to `EUR`, `USD`, or `GBP` and defaulting to `EUR`. The settings API exposes:

- `GET /api/me/settings` for the authenticated user’s email, verification state, and display currency.
- `PATCH /api/me/settings` for a validated display-currency update.

The settings screen contains:

- display-currency selection;
- password change with live strength requirements and Supabase authenticated update;
- email-change initiation with an explicit confirmation-pending notice; the provisioning path synchronizes the application record after Supabase confirms the new address;
- a support form with an explicit privacy reminder and delivery result;
- links to verification and the AI assistant.

For sensitive password updates, the browser must first have an active verified session. It does not send the current password to the Phoenix API; Supabase handles password policy and the update directly.

## Portfolio Valuation

The portfolio API receives a display-currency preference and returns each enabled asset with its exact quantity and a display-only fiat valuation. The server derives EUR reference prices from the existing USDT market references plus the live EUR/USDT conversion; USDT is treated as one USD. USD and GBP use their respective conversion references. A market-reference failure leaves the asset amount available and marks the valuation unavailable instead of inventing a price.

The portfolio UI formats the selected fiat amount as the prominent figure and the exact crypto amount as the faint secondary figure. The same formatting helper is reused for account portfolio cards and trading availability views where a fiat value is shown.

## Support Delivery

`POST /api/me/support-requests` requires a verified session, validates a short subject and bounded message, applies the existing support rate limit, and sends a plain-text support email through Resend to `phoenixhandel@protonmail.com`. The sender address and inbox are server configuration with secure defaults. The outbound message includes the authenticated account email and user ID for context; it does not include access tokens, passwords, one-time codes, or uploaded files.

If the Resend credential is absent, the API returns a clear `SUPPORT_DELIVERY_UNAVAILABLE` response and the UI says delivery is temporarily unavailable. Production delivery requires a `RESEND_API_KEY` environment value on the VPS.

## Audit UX

Administrator balance actions no longer accept a `reason` field in the UI or request schema. The immutable audit event stores the action, target, transaction identifier, and structured balance metadata; its required database reason field receives the fixed server-side value `ADMINISTRATOR_ACTION`. Audit responses no longer expose a reason column.

## Verification

Tests cover the shared session route policy, authenticated-home redirect, sign-out behavior, current-token retrieval, currency-settings authorization and validation, valuation fallback behavior, safe support request validation/delivery, and balance changes without client-supplied audit reasons. Existing authentication, provisioning, portfolio, ledger, admin, and market tests must remain green.

## Deployment

Apply the database migration first through the existing production container migration flow. Then deploy the API and web image, run the live health endpoint, verify a signed-in user can move among `/`, `/account`, and `/settings` without losing session state, and confirm a support request reaches the configured inbox after the Resend API key has been added.
