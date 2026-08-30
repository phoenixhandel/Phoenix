# Conversion-First Phoenix Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phoenix’s root exchange workstation with an original, signup-led public landing page while preserving the simulated exchange workspace at `/trade/:pair`.

**Architecture:** Add a focused `LandingPage` route component that keeps Phoenix’s dark operational identity but changes the first-viewport hierarchy to a clear registration CTA, a simulated-practice explanation, and restrained market context. Keep authentication routes and the existing `ExchangePage` intact; root navigation now treats `/` as the public entry point and `/trade/BTCUSDT` as the active trading surface.

**Tech Stack:** React 19, React Router, TypeScript, Tailwind CSS v4, Vitest, Testing Library.

**Spec:** `apps/web/PRODUCT.md`, `apps/web/DESIGN.md`, and the active goal requesting a Phoenix-original, Binance-inspired conversion hierarchy.

## Global Constraints

- Phoenix is simulated only: do not imply custody, deposits, withdrawals, or external execution.
- Preserve Phoenix branding and original copy/assets; do not reproduce Binance branding or proprietary content.
- The primary action is `/register`; live market context is secondary proof.
- Preserve accessible semantic navigation, visible focus styles, keyboard operation, responsive layout, and existing trading routes.
- Do not add dependencies.

---

### Task 1: Specify the public-entry contract in a failing route test

**Files:**
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: exported `App` component.
- Produces: regression coverage requiring a root-level signup CTA and keeping the exchange away from the first viewport.

- [ ] **Step 1: Write the failing test**

```tsx
render(<application.App />);
expect(screen.getByRole("heading", { name: /practice the market/i })).toBeTruthy();
expect(screen.getByRole("link", { name: /create free account/i })).toHaveAttribute("href", "/register");
expect(screen.queryByRole("heading", { name: "BTC/USDT" })).toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace @phoenix/web -- src/App.test.tsx`

Expected: FAIL because `/` still renders `ExchangePage`.

- [ ] **Step 3: Implement the minimal landing route**

Create `LandingPage.tsx` with an accessible header, a registration-first hero, an explicit simulation disclosure, support links to `/login` and `/trade/BTCUSDT`, and non-claiming market-context examples labeled as simulated practice context.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace @phoenix/web -- src/App.test.tsx`

Expected: PASS.

### Task 2: Integrate the new public route without changing the exchange workspace

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/LandingPage.tsx`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `LandingPage`, current React Router routes, `/register`, `/login`, `/trade/:pair`.
- Produces: `LandingPage` at `/`; `ExchangePage` stays exclusive to `/trade/:pair`.

- [ ] **Step 1: Verify the route test remains red**

Run: `npm run test --workspace @phoenix/web -- src/App.test.tsx`

Expected: FAIL until `App` imports and routes `LandingPage` at `/`.

- [ ] **Step 2: Implement route integration**

Replace only the catch-all/root behavior so `<Route path="/" element={<LandingPage />} />` is explicit and unknown routes redirect or render the landing page. Do not change any account, admin, or `/trade/:pair` route.

- [ ] **Step 3: Verify the route test passes**

Run: `npm run test --workspace @phoenix/web -- src/App.test.tsx`

Expected: PASS.

### Task 3: Verify the conversion surface and whole workspace

**Files:**
- Modify: `apps/web/src/LandingPage.tsx` only if verification identifies a material issue.

- [ ] **Step 1: Run static checks**

Run: `npm run lint --workspace @phoenix/web && npm run build --workspace @phoenix/web`

Expected: exit code 0.

- [ ] **Step 2: Inspect desktop and mobile render**

Run the local web server, inspect `/` at desktop and narrow mobile width, and verify that the first viewport clearly communicates Phoenix, simulated practice, and registration before market data.

- [ ] **Step 3: Run complete quality gate**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`

Expected: exit code 0.
