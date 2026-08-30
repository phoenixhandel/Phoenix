# German Verified Product Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Phoenix a German-first, verified-account experience with page-specific product layouts and a professional market-discovery home surface.

**Architecture:** Keep the existing React/Vite app and Supabase session provider. Add a minimal client-side language context and verified-session gate; retain public authentication/recovery routes only. Replace generic information-page rendering with a small type-driven page layout system, and use the existing market route/data layer for a richer home market section.

**Tech Stack:** React 19, React Router, TypeScript, Tailwind CSS, Supabase Auth, Express API, Vitest.

**Spec:** User request from 2026-08-28 plus product safety constraint: retain truthful non-custodial/practice disclosures; do not imply deposits, withdrawals, custody, or real external execution.

## Global Constraints

- Default UI language is German; English is a deliberate language-select alternative.
- Authentication, password recovery, and email-confirmation routes remain reachable before sign-in; all other application routes require a verified email session.
- Do not fabricate financial claims, assets held, customer proof, supported currencies, or legal protections.
- Do not copy TitanLedger copy; use original, professional German/English product writing.
- Avoid alarm-like repeated labels, but preserve clear truth in terms/risk and relevant transactional contexts.
- No new dependencies unless the existing stack cannot support the behavior.

---

### Task 1: Verified-session and localization foundation

**Files:**
- Create: `apps/web/src/app-shell.tsx`
- Create: `apps/web/src/i18n.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/AuthPage.tsx`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces `LanguageProvider`, `useLanguage`, and `RequireVerifiedSession` for route and UI consumers.
- Uses Supabase `auth.getUser()` and `email_confirmed_at` to allow protected routes.

- [ ] **Step 1: Write the failing route/language tests**

```tsx
expect(screen.getByRole("button", { name: /sprache/i })).toBeTruthy();
expect(screen.getByText(/bestätige zuerst deine e-mail/i)).toBeTruthy();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @phoenix/web run test -- --run src/App.test.tsx`

Expected: FAIL because no language control or verified-session gate exists.

- [ ] **Step 3: Implement minimal session guard and language provider**

```tsx
const user = await auth.auth.getUser();
const verified = Boolean(user.data.user?.email_confirmed_at);
return verified ? children : <Navigate to="/login" replace />;
```

- [ ] **Step 4: Run the focused test**

Run: `npm --workspace @phoenix/web run test -- --run src/App.test.tsx`

Expected: PASS.

### Task 2: Home and registration experience

**Files:**
- Modify: `apps/web/src/LandingPage.tsx`
- Modify: `apps/web/src/AuthPage.tsx`
- Modify: `apps/web/src/SiteFooter.tsx`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes `useLanguage` for German/English copy.
- Produces an asset-market section containing only actually supported Phoenix pairs.

- [ ] **Step 1: Write a failing home-page test**

```tsx
expect(screen.getByRole("heading", { name: /märkte im blick/i })).toBeTruthy();
expect(screen.queryByRole("link", { name: /explore the terminal/i })).toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @phoenix/web run test -- --run src/App.test.tsx`

Expected: FAIL because the existing hero includes the terminal CTA and no asset market section.

- [ ] **Step 3: Implement the responsive market section and registration shell**

```tsx
<section aria-labelledby="asset-market-heading">
  <h2 id="asset-market-heading">Märkte im Blick</h2>
  {supportedPairs.map((pair) => <a href={`/trade/${pair.symbol}`}>{pair.label}</a>)}
</section>
```

- [ ] **Step 4: Run the focused test**

Run: `npm --workspace @phoenix/web run test -- --run src/App.test.tsx`

Expected: PASS.

### Task 3: Purpose-built information pages

**Files:**
- Modify: `apps/web/src/InformationPage.tsx`
- Modify: `apps/web/src/VerificationPage.tsx`
- Modify: `apps/web/src/PublicPage.tsx`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- `InformationPage` selects layouts by `kind`: status indicator, three-column KYC explainer, long-form terms/privacy documents, concise guide cards.

- [ ] **Step 1: Write failing tests for page-specific structures**

```tsx
expect(screen.getByRole("status", { name: /plattformstatus/i })).toBeTruthy();
expect(screen.getAllByRole("article")).toHaveLength(3);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @phoenix/web run test -- --run src/App.test.tsx`

Expected: FAIL because all information pages share a repeated row layout.

- [ ] **Step 3: Implement minimal layout variants**

```tsx
if (kind === "status") return <StatusIndicator />;
if (kind === "kyc") return <KycColumns />;
if (kind === "terms" || kind === "privacy") return <PolicyDocument />;
return <GuideCards />;
```

- [ ] **Step 4: Run the focused test**

Run: `npm --workspace @phoenix/web run test -- --run src/App.test.tsx`

Expected: PASS.

### Task 4: Verification

**Files:**
- Modify: `apps/web/src/App.test.tsx`
- Modify: changed web components

- [ ] **Step 1: Run typecheck, lint, full tests, and production build**

Run: `npm run typecheck; npm run lint; npm run test; npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Inspect desktop and mobile renderings**

Check `/`, `/register`, `/kyc-policy`, `/status`, `/terms`, and `/privacy` at desktop and 390px width.

- [ ] **Step 3: Run the Impeccable detector once**

Run: `node C:\Users\Enes\.codex\skills\impeccable\scripts\detect.mjs --json <changed web files>`

Expected: inspect warnings in context and resolve material findings.
