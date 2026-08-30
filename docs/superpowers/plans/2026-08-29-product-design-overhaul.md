# Phoenix Product Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every Phoenix interface around a single, trustworthy crypto-workspace design language while retaining all current routes, integrations, and working behaviours.

**Architecture:** Establish shared visual primitives and a responsive authenticated workspace shell first; then apply page-specific layouts rather than one generic card-grid to landing, account, market, support, verification, legal, and terminal surfaces. All data fetching, auth guards, navigation targets, and endpoint calls remain intact; only presentation, copy, component composition, and recoverable UI states change.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS v4, Vitest, Testing Library, Supabase auth, existing API and market-data clients.

**Spec:** `.codex/design-language.md`

## Global Constraints

- German remains the default with complete English alternatives.
- Preserve all existing route paths, auth guards, API endpoints, form submissions, data refresh behaviour, and error recovery.
- Keep simulated-trading/product-limitations accurate and visible where a user may infer real execution, custody, deposits, or withdrawals.
- Never introduce a fake identity review or compliance claim.
- Use the documented midnight/cyan/green/rose/amber semantics, 44px touch targets, visible focus states, and reduced-motion support.
- Add no UI dependency unless a built-in React/CSS primitive cannot meet the need.

---

### Task 1: Create the shared workspace frame and global interaction primitives

**Files:**
- Create: `apps/web/src/WorkspaceShell.tsx`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/SiteFooter.tsx`
- Test: `apps/web/src/WorkspaceShell.test.tsx`

**Interfaces:**
- Produces `WorkspaceShell({ title, description, active, children })`, used by protected content pages.
- Keeps `PhoenixMark` as the shared brand anchor and `LanguageSelect` as the single language control.

- [ ] **Step 1: Write the failing layout test**

```tsx
render(<WorkspaceShell title="Märkte" description="Live Marktüberblick" active="markets"><p>Content</p></WorkspaceShell>);
expect(screen.getByRole("navigation", { name: "Workspace navigation" })).toBeTruthy();
expect(screen.getByRole("heading", { name: "Märkte" })).toBeTruthy();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace @phoenix/web -- src/WorkspaceShell.test.tsx`

Expected: FAIL because `WorkspaceShell` does not yet exist.

- [ ] **Step 3: Implement the shell and CSS primitives**

```tsx
export const WorkspaceShell = ({ title, description, active, children }: Props) => (
  <main className="phoenix-workspace min-h-screen">
    <header>{/* Phoenix mark, compact navigation, account action, language select */}</header>
    <section className="phoenix-page-head">{/* title and useful context */}</section>
    <div className="phoenix-page-body">{children}</div>
  </main>
);
```

Add named utility classes for panel, status, data-row, loading skeleton, focus ring, page transition, mobile overflow, and form error treatments. Preserve the existing global selection, scrollbar, and reduced-motion behaviour.

- [ ] **Step 4: Run the focused test and typecheck**

Run: `npm run test --workspace @phoenix/web -- src/WorkspaceShell.test.tsx; npm run typecheck --workspace @phoenix/web`

Expected: PASS.

### Task 2: Recompose the public landing and account-access funnel

**Files:**
- Modify: `apps/web/src/LandingPage.tsx`
- Modify: `apps/web/src/AuthPage.tsx`
- Modify: `apps/web/src/AuthPage.test.tsx`
- Modify: `apps/web/src/SiteFooter.tsx`

**Interfaces:**
- Landing keeps current ticker polling and all existing links.
- Auth keeps `signUp`, `signInWithPassword`, `verifyOtp`, resend, reset, and OAuth functions unchanged.

- [ ] **Step 1: Write failing behavioural assertions**

```tsx
expect(screen.getByRole("link", { name: /Märkte/i }).getAttribute("href")).toBe("#markets");
expect(screen.getByRole("button", { name: "Mit Google fortfahren" })).toBeTruthy();
expect(screen.getByRole("status")).not.toBeTruthy();
```

- [ ] **Step 2: Run the existing landing/auth test files**

Run: `npm run test --workspace @phoenix/web -- src/AuthPage.test.tsx src/App.test.tsx`

Expected: the new assertions fail before the redesign.

- [ ] **Step 3: Implement page-specific hierarchy**

Use a conversion-first landing: a concise account-confidence statement, market-context proof, an “how Phoenix works” sequence, trust boundaries, then an account CTA. Use a distraction-free auth surface: persistent labels, inline error/recovery messages, accessible provider buttons, and compact security reassurance. Keep real data/source state visible; do not fabricate performance or verification claims.

- [ ] **Step 4: Verify routes and auth UI**

Run: `npm run test --workspace @phoenix/web -- src/AuthPage.test.tsx src/App.test.tsx; npm run typecheck --workspace @phoenix/web`

Expected: PASS.

### Task 3: Redesign account, verification, support, and information surfaces by task

**Files:**
- Modify: `apps/web/src/AccountPage.tsx`
- Modify: `apps/web/src/VerificationPage.tsx`
- Modify: `apps/web/src/SupportPage.tsx`
- Modify: `apps/web/src/InformationPage.tsx`
- Modify: `apps/web/src/PublicPage.tsx`
- Test: `apps/web/src/AccountPage.test.tsx`

**Interfaces:**
- Existing account data endpoints remain `/api/me/portfolio`, `/api/me/trades`, `/api/me/activity`, and `/api/verification/identity/session`.
- Verification continues to reflect `emailVerified`, Supabase phone status, and the API `kycStatus`; no client-side status escalation.

- [ ] **Step 1: Write failing output assertions**

```tsx
render(<AccountPage page="portfolio" />);
expect(await screen.findByRole("heading", { name: /Krypto-Überblick/i })).toBeTruthy();
expect(screen.getByRole("link", { name: /Märkte entdecken/i })).toBeTruthy();
```

- [ ] **Step 2: Run the focused account test**

Run: `npm run test --workspace @phoenix/web -- src/AccountPage.test.tsx`

Expected: FAIL until the redesigned workspace composition is in place.

- [ ] **Step 3: Implement purpose-built layouts**

Use: account overview with clear next-step rail and data table; activity/history as dense chronological records; verification as a three-stage progress system with truthful provider status; support as a guided help conversation with topic chips and accessible conversation state; status as one large system indicator; policy pages as readable documents with anchored contents. Route all protected non-market pages through the shared workspace frame and retain all links.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm run test --workspace @phoenix/web -- src/AccountPage.test.tsx src/App.test.tsx; npm run typecheck --workspace @phoenix/web`

Expected: PASS.

### Task 4: Rebuild crypto markets and market-detail pages for scanability

**Files:**
- Modify: `apps/web/src/MarketsPage.tsx`
- Modify: `apps/web/src/MarketsPage.test.tsx`
- Modify: `apps/web/src/market-data.ts`
- Test: `apps/web/src/market-data.test.ts`

**Interfaces:**
- Retain `getTopCoins()` 30-second refresh and `getCoinHistory(coinId, range)` calls.
- Retain `/markets` and `/markets/:coinId` route contracts and links to `/trade/:pair` where supported.

- [ ] **Step 1: Write failing rendering assertions for market hierarchy**

```tsx
expect(await screen.findByRole("columnheader", { name: /Marktkapitalisierung/i })).toBeTruthy();
expect(screen.getByRole("link", { name: /Bitcoin/i }).getAttribute("href")).toBe("/markets/bitcoin");
```

- [ ] **Step 2: Run market tests to verify intent**

Run: `npm run test --workspace @phoenix/web -- src/MarketsPage.test.tsx src/market-data.test.ts`

Expected: fail only where new structural expectations are absent.

- [ ] **Step 3: Implement the market layouts**

Use a compact page header with refresh/source metadata, a responsive market table with an asset-first mobile row, a current-state data band on asset detail, an accessible time-range segmented control, and a single primary market action. Preserve public price-source attribution, loading, stale, and unavailable states.

- [ ] **Step 4: Verify market behaviour**

Run: `npm run test --workspace @phoenix/web -- src/MarketsPage.test.tsx src/market-data.test.ts; npm run typecheck --workspace @phoenix/web`

Expected: PASS.

### Task 5: Refine the trading terminal without changing order behaviour

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/MarketChart.tsx`
- Modify: `apps/web/src/exchange-store.test.ts`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Preserve `ExchangePage` routes, `useExchangeStore` reads, current API order submission, market refresh interval, and unavailable order types.
- Preserve market/order-book/chart/portfolio/history data semantics.

- [ ] **Step 1: Write failing interaction assertions for terminal controls**

```tsx
expect(screen.getByRole("button", { name: /Kaufen BTC/i })).toBeTruthy();
expect(screen.getByRole("button", { name: /1h/i })).toBeTruthy();
```

- [ ] **Step 2: Run App and store tests**

Run: `npm run test --workspace @phoenix/web -- src/App.test.tsx src/exchange-store.test.ts`

Expected: fail only for redesigned labels/structure.

- [ ] **Step 3: Implement dense, task-led terminal composition**

Prioritize pair selector and price state, chart and intervals, order form with clear available balance and fee preview, then order book/activity/portfolio. Use semantics and real state for delayed or unavailable feeds and unimplemented order types. Keep the product-limitations statement concise and present adjacent to order submission.

- [ ] **Step 4: Run the complete web verification suite**

Run: `npm run typecheck; npm run test --workspace @phoenix/web`

Expected: PASS.

### Task 6: Full rendered design-loop review

**Files:**
- Inspect: `apps/web/src/index.css`, all modified `.tsx` files

- [ ] **Step 1: Render representative public, auth, account, market, detail, support, verification, policy, and terminal pages at desktop and mobile widths**

Verify hierarchy, responsive structure, focus, form errors, loading/empty/unavailable states, and language expansion.

- [ ] **Step 2: Judge each render through three lenses**

Assess each page against the product brief, `.codex/design-language.md`, and craft floor; record only material failures.

- [ ] **Step 3: Apply one bounded correction pass**

Fix only identified hierarchy, contrast, overflow, state, or interaction failures; retain working behaviour.

- [ ] **Step 4: Run the design detector and final tests**

Run: `node C:\\Users\\Enes\\.codex\\skills\\impeccable\\scripts\\detect.mjs --json <modified-ui-files>; npm run typecheck; npm run test --workspace @phoenix/web`

Expected: no unresolved errors; document any pre-existing advisory that is intentionally retained.
