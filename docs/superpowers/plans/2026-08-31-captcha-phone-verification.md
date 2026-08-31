# CAPTCHA and Account-Bound Phone Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require Cloudflare Turnstile for password access flows, remove social sign-in controls, and safely verify a phone number on the currently authenticated account.

**Architecture:** A reusable browser-only Turnstile component owns external script loading, token lifecycle, and failures for password access flows. `AuthPage` consumes its token before calling Supabase. The phone page changes the current account's phone field and verifies a `phone_change` OTP instead of running a passwordless SMS login.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS, Cloudflare Turnstile, Vitest, Testing Library, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-31-captcha-phone-verification-design.md`

## Global Constraints

- Email-confirmed Supabase sessions remain the sole gate for protected Phoenix routes.
- CAPTCHA is mandatory for registration and password sign-in. A production build with no `VITE_TURNSTILE_SITE_KEY` blocks those submissions; test harnesses explicitly provide a mock token.
- The Turnstile secret exists only in Supabase Bot and Abuse Protection; never add it to Phoenix code, Compose, or Vite.
- `VITE_TURNSTILE_SITE_KEY` is public browser configuration and must be a Docker build argument.
- Password reset and email-code resend behavior remains unchanged.
- Do not create or switch to a passwordless phone-login user during Tier 2 verification.

---

## File Structure

- `apps/web/src/TurnstileCaptcha.tsx` — explicit Turnstile script/widget lifecycle and the `onToken`/`onError` component boundary.
- `apps/web/src/TurnstileCaptcha.test.tsx` — renders a fake global Turnstile API and proves token/error/reset behavior.
- `apps/web/src/AuthPage.tsx` — password-access CAPTCHA integration and social-provider UI removal.
- `apps/web/src/AuthPage.test.tsx` — proves CAPTCHA request contracts and absence of social controls.
- `apps/web/src/PhoneVerificationPage.tsx` — account-bound phone-change update and OTP verification.
- `apps/web/src/PhoneVerificationPage.test.tsx` — proves `updateUser` and `phone_change` contracts.
- `Dockerfile`, `docker-compose.production.yml`, `.env.example`, `.env.production.example` — public Turnstile site-key propagation and operator documentation.

### Task 1: Reusable Turnstile component and public configuration

**Files:**
- Create: `apps/web/src/TurnstileCaptcha.tsx`
- Create: `apps/web/src/TurnstileCaptcha.test.tsx`
- Modify: `Dockerfile:18-27`
- Modify: `docker-compose.production.yml:45-51`
- Modify: `.env.example`
- Modify: `.env.production.example`

**Interfaces:**
- Produces: `TurnstileCaptcha({ refreshKey, onToken, onUnavailable }: { refreshKey: number; onToken: (token: string | null) => void; onUnavailable: () => void })`.
- Consumes: `import.meta.env.VITE_TURNSTILE_SITE_KEY`.

- [ ] **Step 1: Write failing component/config tests**

```tsx
it("returns a Turnstile token and clears it when refreshKey changes", async () => {
  render(<TurnstileCaptcha refreshKey={0} onToken={onToken} onUnavailable={onUnavailable} />);
  await act(() => turnstileCallback("token-1"));
  expect(onToken).toHaveBeenLastCalledWith("token-1");

  rerender(<TurnstileCaptcha refreshKey={1} onToken={onToken} onUnavailable={onUnavailable} />);
  expect(fakeTurnstile.reset).toHaveBeenCalled();
  expect(onToken).toHaveBeenLastCalledWith(null);
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm run test --workspace @phoenix/web -- TurnstileCaptcha.test.tsx`

Expected: FAIL because `TurnstileCaptcha` does not exist.

- [ ] **Step 3: Implement the minimal component and config propagation**

```tsx
type Props = {
  refreshKey: number;
  onToken: (token: string | null) => void;
  onUnavailable: () => void;
};

export const TurnstileCaptcha = ({ refreshKey, onToken, onUnavailable }: Props) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Append the explicit script once, render into containerRef when it loads, clear onToken on render/reset,
  // call onUnavailable for a missing key or failed script, and remove the widget during cleanup.
  return <div ref={containerRef} aria-label="Security check" />;
};
```

Add `VITE_TURNSTILE_SITE_KEY=` to both environment examples. Add a Dockerfile `ARG`/`ENV` pair and Compose `build.args` entry matching the existing Vite variables.

- [ ] **Step 4: Run focused test and typecheck**

Run: `npm run test --workspace @phoenix/web -- TurnstileCaptcha.test.tsx; npm run typecheck --workspace @phoenix/web`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/TurnstileCaptcha.tsx apps/web/src/TurnstileCaptcha.test.tsx Dockerfile docker-compose.production.yml .env.example .env.production.example
git commit -m "feat: add turnstile captcha component"
```

### Task 2: Password-access CAPTCHA and OAuth removal

**Files:**
- Modify: `apps/web/src/AuthPage.tsx`
- Modify: `apps/web/src/AuthPage.test.tsx`
- Consumes: `TurnstileCaptcha` from Task 1.

**Interfaces:**
- Consumes: `captchaToken: string | null` maintained by `AuthPage` for register/login modes.
- Produces: `signUp(..., { options: { captchaToken } })` and `signInWithPassword({ email, password, options: { captchaToken } })` requests only after token availability.

- [ ] **Step 1: Replace OAuth tests with failing CAPTCHA tests**

```tsx
it("does not render Google or Apple sign-in controls", () => {
  render(<AuthPage mode="login" />);
  expect(screen.queryByRole("button", { name: /Google|Apple/i })).toBeNull();
});

it("passes the completed captcha token when registering", async () => {
  // Mock TurnstileCaptcha as a button that invokes onToken("captcha-token").
  render(<AuthPage mode="register" />);
  fireEvent.click(screen.getByRole("button", { name: "Sicherheitsprüfung abschließen" }));
  fillRegistrationFields();
  fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));
  await waitFor(() => expect(auth.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ captchaToken: "captcha-token" }) })));
});
```

- [ ] **Step 2: Run the Auth page test to verify it fails**

Run: `npm run test --workspace @phoenix/web -- AuthPage.test.tsx`

Expected: FAIL because OAuth buttons remain and Supabase receives no CAPTCHA token.

- [ ] **Step 3: Implement the minimum access-flow changes**

```tsx
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);

// For register/login only, render TurnstileCaptcha and disable submit until captchaToken exists.
// Remove CompanyLogo, all Google/Apple copy, oauth(), unavailable-provider messages, divider, and social buttons.
// On every registration/login response, increment captchaRefreshKey and clear the token.
```

Keep reset-password logic unmodified. For a missing/failed widget, render a clear status message and never call Supabase.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm run test --workspace @phoenix/web -- AuthPage.test.tsx TurnstileCaptcha.test.tsx; npm run typecheck --workspace @phoenix/web`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/AuthPage.tsx apps/web/src/AuthPage.test.tsx
git commit -m "feat: require captcha for password access"
```

### Task 3: Account-bound phone-change verification

**Files:**
- Modify: `apps/web/src/PhoneVerificationPage.tsx`
- Create: `apps/web/src/PhoneVerificationPage.test.tsx`
- Consumes: `provisionApplicationUser` from `auth-client.ts`.

**Interfaces:**
- Produces: `auth.auth.updateUser({ phone })` when requesting an SMS for the current authenticated account.
- Produces: `auth.auth.verifyOtp({ phone, token: code, type: "phone_change" })` when confirming it.

- [ ] **Step 1: Write failing phone verification tests**

```tsx
it("requests a phone change for the current user instead of passwordless sign-in", async () => {
  render(<PhoneVerificationPage />);
  fireEvent.change(screen.getByLabelText("Mobilnummer"), { target: { value: "+4915123456789" } });
  fireEvent.click(screen.getByRole("button", { name: "Code senden" }));
  await waitFor(() => expect(auth.auth.updateUser).toHaveBeenCalledWith({ phone: "+4915123456789" }));
  expect(auth.auth.signInWithOtp).not.toHaveBeenCalled();
});

it("verifies the account phone change without replacing the user session", async () => {
  renderSentPhoneCodeState();
  fireEvent.change(screen.getByLabelText("Bestätigungscode"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Telefonnummer bestätigen" }));
  await waitFor(() => expect(auth.auth.verifyOtp).toHaveBeenCalledWith({ phone: "+4915123456789", token: "123456", type: "phone_change" }));
});
```

- [ ] **Step 2: Run phone verification test to verify it fails**

Run: `npm run test --workspace @phoenix/web -- PhoneVerificationPage.test.tsx`

Expected: FAIL because the page calls `signInWithOtp` and uses `type: "sms"`.

- [ ] **Step 3: Implement the safe phone-change flow**

```tsx
const { error } = await auth.auth.updateUser({ phone });

const { error } = await auth.auth.verifyOtp({
  phone,
  token: code,
  type: "phone_change"
});
```

Restrict the phone field to an E.164 value before the request, retain the 60-second cooldown, and retain the current session when either request fails.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm run test --workspace @phoenix/web -- PhoneVerificationPage.test.tsx TurnstileCaptcha.test.tsx; npm run typecheck --workspace @phoenix/web`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/PhoneVerificationPage.tsx apps/web/src/PhoneVerificationPage.test.tsx
git commit -m "fix: bind phone verification to signed-in account"
```

### Task 4: Full verification and production activation

**Files:**
- Modify: `docs/production-readiness.md`

**Interfaces:**
- Consumes: `VITE_TURNSTILE_SITE_KEY` from Task 1 and Supabase-hosted Turnstile secret/SMS provider configuration.
- Produces: an operator checklist that matches the deployed UI contracts.

- [ ] **Step 1: Run documentation/source review before edits**

Run: `rg -n "Turnstile|phone_change|Google|Apple" docs/production-readiness.md`

Expected: no current Turnstile or `phone_change` coverage.

- [ ] **Step 2: Update the production checklist**

Add these exact operator values:

```env
VITE_TURNSTILE_SITE_KEY=0x...
```

Add the instructions: configure the Turnstile secret only in Supabase Auth Bot and Abuse Protection; enable Phone with a provider; test signup/login CAPTCHA and an authenticated phone change; optionally disable Google and Apple providers in Supabase.

- [ ] **Step 3: Run complete verification**

Run: `npm run test --workspace @phoenix/web; npm run build --workspace @phoenix/web; git diff --check`

Expected: every web test passes and production build exits 0.

- [ ] **Step 4: Commit the documentation**

```bash
git add docs/production-readiness.md
git commit -m "docs: document captcha and phone setup"
```

- [ ] **Step 5: Deploy after operator keys are configured**

```bash
git archive --format=tar HEAD | ssh -i "C:\\Users\\Enes\\.ssh\\callcenter_ovh_ed25519" root@45.133.119.64 "tar -xf - -C /opt/Phoenix"
ssh -i "C:\\Users\\Enes\\.ssh\\callcenter_ovh_ed25519" root@45.133.119.64 "cd /opt/Phoenix && docker compose --env-file .env.production -f docker-compose.production.yml build web && docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps --force-recreate web"
```

Verify `https://phoenixhandel.com/api/health`, a real CAPTCHA-protected registration, a CAPTCHA-protected login, and a real phone change.
