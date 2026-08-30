# Account Session and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace page-dependent authentication with one verified session, then add account settings, EUR portfolio values, contact delivery, and reason-free audit controls.

**Architecture:** Supabase session state is owned by a React provider; PostgreSQL persists display currency; the API calculates non-ledger portfolio valuations from market references. Sensitive credentials stay in Supabase and Resend delivery remains server-only.

**Tech Stack:** React, Supabase JS, Express, PostgreSQL, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-account-session-settings-design.md`

## Global Constraints

- Confirmed Supabase email is authoritative for protected routes.
- Default display currency is EUR; allowed values are EUR, USD, GBP.
- Fiat values are never ledger entries.
- Client-side audit reasons are removed while immutable audit records remain.

### Task 1: Unify browser authentication

**Files:** `apps/web/src/auth-session.tsx`, `apps/web/src/auth-session.test.tsx`, `apps/web/src/auth-client.ts`, `apps/web/src/app-shell.tsx`, `apps/web/src/App.tsx`, `apps/web/src/WorkspaceShell.tsx`, `apps/web/src/SiteFooter.tsx`.

- [ ] Write failing tests proving a confirmed Supabase session redirects `/` to `/account`, an anonymous session stays on the landing page, and the workspace mark links to `/account`.
- [ ] Run `corepack pnpm --dir apps/web test -- auth-session.test.tsx` and observe the missing-provider failure.
- [ ] Create `AuthSessionProvider` from `getSession()` plus `onAuthStateChange`; expose pending/anonymous/unverified/verified state and an access token.
- [ ] Make `RequireVerifiedSession` and public-only routes consume the provider. Add `getAccessToken()` and preserve legacy local storage only as compatibility cache.
- [ ] Re-run the focused test and commit `fix: unify verified browser sessions`.

### Task 2: Persist settings and show fiat valuation

**Files:** `database/migrations/0006_account_settings.sql`, `database/core-schema.test.ts`, `apps/api/src/settings/routes.ts`, `apps/api/src/settings/routes.test.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/portfolio/routes.ts`, `apps/api/src/portfolio/routes.test.ts`, `apps/web/src/AccountPage.tsx`, `apps/web/src/AccountPage.test.tsx`.

- [ ] Write failing API tests for default EUR, validated PATCH currency updates, and nullable valuation references that preserve exact balance amounts.
- [ ] Run focused API tests; expected failure is absent route/schema fields.
- [ ] Add `users.display_currency varchar(3) NOT NULL DEFAULT 'EUR' CHECK (display_currency IN ('EUR','USD','GBP'))`, GET/PATCH settings routes, and portfolio valuation payloads based on the existing market service.
- [ ] Write a failing UI test that expects a prominent fiat amount and faint exact crypto quantity.
- [ ] Implement settings selection and `Intl.NumberFormat` portfolio presentation; run focused API/web tests and commit `feat: add account settings and portfolio valuations`.

### Task 3: Account controls, support contact, and audit UX

**Files:** `apps/api/src/support/contact-routes.ts`, `apps/api/src/support/contact-routes.test.ts`, `apps/api/src/config.ts`, `apps/api/src/server.ts`, `apps/api/src/app.ts`, `apps/web/src/AccountPage.tsx`, `apps/web/src/AccountPage.test.tsx`, `apps/api/src/admin/balance-routes.ts`, `apps/api/src/ledger/*.ts`, `apps/api/src/admin/audit-routes.ts`, `apps/web/src/AdminPage.tsx`, `apps/web/src/AdminPage.test.tsx`, `apps/web/src/AdminAuditPage.tsx`.

- [ ] Write failing API tests for an authenticated support request to the configured inbox and a safe unavailable response without a mail credential.
- [ ] Run `corepack pnpm --dir apps/api test -- support/contact-routes.test.ts`; expected failure is absent route.
- [ ] Add server-only Resend fetch transport and config (`RESEND_API_KEY`, `SUPPORT_FROM_EMAIL`, `SUPPORT_INBOX_EMAIL`); validate bounded subject/message and return `202` only on accepted delivery.
- [ ] Write failing UI tests for password change, email-change initiation, support submission, and absence of editable audit reasons.
- [ ] Use `auth.updateUser` for credentials; remove request-schema/UI `reason`, write fixed `ADMINISTRATOR_ACTION` server-side, and omit reason from audit responses. Run focused tests and commit `feat: add secure account controls`.

### Task 4: Verify and deploy

**Files:** `.env.production.example`, `docs/production-readiness.md`.

- [ ] Document support-mail configuration and keep its API key server-only.
- [ ] Run with test-safe browser values: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build`; each must exit zero.
- [ ] Commit documentation, merge the reviewed feature branch, deploy the existing Compose stack, then verify the health endpoint and navigation among `/`, `/account`, `/settings`, and `/admin`.
