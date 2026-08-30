# Phoenix Exchange Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a runnable, tested npm-workspace foundation for the Phoenix simulated exchange.

**Architecture:** The repository contains independent web and API applications with a small shared TypeScript package. Docker Compose provides PostgreSQL for local development only; a migration runner establishes the connection point for Phase 2 without prematurely defining financial tables.

**Tech Stack:** Node.js 22+, npm workspaces, TypeScript, React, Vite, Tailwind CSS v4, Express, PostgreSQL, `pg`, Zod, Vitest, ESLint, Prettier, Docker Compose.

**Spec:** `Phoenix Exchange — Corrected Codex Project Specification.md`

## Global Constraints

- All exchange balances and orders are simulated; no wallet, deposit, withdrawal, custody, or external trading capability may be introduced.
- Financial values will be decimal strings at API boundaries; Phase 1 has no financial API or schema.
- Use PostgreSQL via standard connection strings and Docker Compose for local development.
- Do not use `any` to bypass TypeScript, disable lint rules, or replace required logic with placeholders.
- Every phase runs `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` successfully.

---

### Task 1: Create the npm workspace and shared contracts ✅

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.gitignore`, `.env.example`, `README.md`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`

**Interfaces:**
- Produces: `@phoenix/shared` exporting `ApiHealth` as `{ status: "ok"; service: "phoenix-api" }`.

- [ ] **Step 1: Write the failing shared-contract test**

```ts
import { describe, expect, it } from "vitest";
import { apiHealth } from "./index";

it("exports the Phoenix API health contract", () => {
  expect(apiHealth).toEqual({ status: "ok", service: "phoenix-api" });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace @phoenix/shared`

Expected: failure because the workspace and export do not exist.

- [ ] **Step 3: Implement the smallest shared contract and workspace scripts**

```ts
export type ApiHealth = { status: "ok"; service: "phoenix-api" };
export const apiHealth: ApiHealth = { status: "ok", service: "phoenix-api" };
```

Root scripts use npm workspaces to run `typecheck`, `lint`, `test`, and `build` in each package.

- [ ] **Step 4: Run the shared test**

Run: `npm run test --workspace @phoenix/shared`

Expected: PASS.

### Task 2: Build the API baseline with validated configuration ✅

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/config.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/app.test.ts`, `apps/api/src/config.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `ApiHealth` and `apiHealth` from `@phoenix/shared`.
- Produces: `createApp(config: AppConfig): Express` and `loadConfig(env: NodeJS.ProcessEnv): AppConfig`.

- [ ] **Step 1: Write failing API tests**

```ts
it("serves the shared health payload", async () => {
  const response = await request(createApp(testConfig)).get("/api/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok", service: "phoenix-api" });
});

it("rejects an invalid port", () => {
  expect(() => loadConfig({ PORT: "invalid" })).toThrow();
});
```

- [ ] **Step 2: Run the API tests to verify they fail**

Run: `npm run test --workspace @phoenix/api`

Expected: failure because the API workspace does not exist.

- [ ] **Step 3: Implement the API**

Implement a Zod-validated `AppConfig` with `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `MARKET_PROVIDER`, and integration keys marked optional for this phase. Configure JSON parsing, narrowly configured CORS, structured request errors, and `GET /api/health`; `server.ts` calls `app.listen(config.port)`.

- [ ] **Step 4: Run the API tests**

Run: `npm run test --workspace @phoenix/api`

Expected: PASS.

### Task 3: Add PostgreSQL development and migration infrastructure ✅

**Files:**
- Create: `docker-compose.yml`, `docker/postgres/init.sql`, `database/package.json`, `database/tsconfig.json`, `database/migrate.ts`, `database/migrations/0001_initial.sql`, `database/migrate.test.ts`
- Modify: `.env.example`, `README.md`

**Interfaces:**
- Produces: `npm run db:migrate` that tracks applied SQL migration filenames in `schema_migrations`.

- [ ] **Step 1: Write the migration-runner test**

```ts
it("runs each migration once", async () => {
  await migrate(client, [initialMigration]);
  await migrate(client, [initialMigration]);
  expect(await appliedMigrationNames(client)).toEqual(["0001_initial.sql"]);
});
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run: `npm run test --workspace @phoenix/database`

Expected: failure because the migration runner does not exist.

- [ ] **Step 3: Implement Compose and migration tracking**

Compose starts PostgreSQL 16 with a named volume and values from `.env`. The migration runner creates `schema_migrations (name text primary key, applied_at timestamptz not null default now())`, then applies SQL files alphabetically in a transaction. `0001_initial.sql` is an intentionally empty baseline with a comment; financial tables begin in Phase 2.

- [ ] **Step 4: Run the database test**

Run: `npm run test --workspace @phoenix/database`

Expected: PASS when `DATABASE_URL` points to a local test database.

### Task 4: Build the Vite React shell ✅

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/index.css`, `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces: a web application that visibly labels Phoenix as a simulated trading environment.

- [ ] **Step 1: Write the failing shell test**

```tsx
it("identifies Phoenix as simulated trading", () => {
  render(<App />);
  expect(screen.getByText("SIMULATED TRADING")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the web test to verify it fails**

Run: `npm run test --workspace @phoenix/web`

Expected: failure because the web workspace does not exist.

- [ ] **Step 3: Implement the smallest premium dark shell**

Create the Vite React application with Tailwind CSS v4. Render a responsive dark placeholder shell with Phoenix branding, a persistent `SIMULATED TRADING` indicator, and a short statement that no real assets are held or traded. Do not create trading panels, authentication pages, or mock market data.

- [ ] **Step 4: Run the web test**

Run: `npm run test --workspace @phoenix/web`

Expected: PASS.

### Task 5: Verify the full Phase 1 quality gate ✅

**Files:**
- Modify: `README.md`, `IMPLEMENTATION_PLAN.md`

- [ ] **Step 1: Document setup and no-credential behavior**

Document Node 22+, `npm install`, copying `.env.example`, `docker compose up -d postgres`, `npm run db:migrate`, and app start commands. State that Supabase, Stripe, SMS, and Binance integration are deliberately absent until their scheduled phases.

- [ ] **Step 2: Run all quality gates**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`

Expected: all commands exit 0.

- [ ] **Step 3: Record the phase result**

Add the executed commands, their date, and any deviation from the product specification to `IMPLEMENTATION_PLAN.md`.
