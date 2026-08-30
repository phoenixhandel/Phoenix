# Phoenix Exchange Implementation Plan

**Authoritative product source:** `Phoenix Exchange — Corrected Codex Project Specification.md`

## Scope and operating rules

Phoenix is a simulated exchange only. It will never connect user wallets, custody assets, accept deposits or withdrawals, or submit external orders. PostgreSQL remains the authoritative store for all financial state, and monetary values use decimal strings at every API boundary.

## Assumptions and reconciliations

- The supplied specification is the authoritative product document; its filename is retained rather than duplicating it as `SPEC.md`.
- “Phase 1” authentication methods in the stack section conflict with the explicit Phase 3 sequence. Authentication implementation follows Phase 3.
- Phase 1 creates migration infrastructure only; the initial migration is intentionally empty. The financial schema begins in Phase 2.
- Supabase, Stripe, and optional SMS integrations require credentials. Their adapters and local disabled states will be implemented before configuration-dependent integrations are enabled.

## Phase map

| Phase | Deliverable | Primary files | Database/migrations | Automated tests |
| --- | --- | --- | --- | --- |
| 1. Foundation | Runnable npm workspace with web, API, shared types, local PostgreSQL, validation and quality gates | `package.json`, `apps/web/**`, `apps/api/**`, `packages/shared/**`, `docker-compose.yml`, `database/migrate.ts` | `database/migrations/0001_initial.sql` | API health, configuration, shared package tests |
| 2. Database | Ledger-first schema, immutable audit model, projections and development seeds | `database/migrations/0002_core_schema.sql`, `database/seeds/dev.ts`, `apps/api/src/db/**` | users, ledger, balances, trades, activity, audit, market config | migration, constraints, seed and transaction tests |
| 3. Authentication | Supabase-backed identity sync, authorization and account-state controls | `apps/api/src/auth/**`, `apps/web/src/features/auth/**` | user sync updates only | anonymous, suspended, role and session verification tests |
| 4. Ledger | Transactional balance services with row locks and idempotency | `apps/api/src/ledger/**` | supporting constraints/indexes | double-entry, atomicity, concurrency and idempotency tests |
| 5. Market engine | Binance public feed with resilient fallback, derived markets, candles, manual mode and synthetic books | `apps/api/src/market/**` | market configuration/history | provider, stale feed, derived market and manual-mode tests |
| 6. Trading | Authoritative market-order service and user APIs | `apps/api/src/trading/**`, `apps/api/src/routes/trades.ts` | trade indexes if required | buy/sell, fee, balance, rejection and duplicate request tests |
| 7. User frontend | Auth, account, verification, portfolio, history and activity pages | `apps/web/src/features/account/**`, `apps/web/src/pages/**` | none | component, route and API-client tests |
| 8. Exchange UI | Responsive professional trading workstation | `apps/web/src/features/exchange/**` | optional candle persistence | visual/component and store tests |
| 9. Administration | Audited user controls, balances, market controls and audit views | `apps/api/src/admin/**`, `apps/web/src/features/admin/**` | admin action helpers/indexes | authorization, ledger and audit tests |
| 10. Identity | Stripe Identity sessions and verified webhook updates | `apps/api/src/identity/**` | provider reference/status fields | valid/invalid webhook and browser-spoof tests |
| 11. Polish | Resilience, accessibility, responsive states and visual consistency | affected web/API modules | none unless justified | accessibility, loading and retry tests |
| 12. Final audit | Security, accounting and UX verification with full quality gates | whole repository | migration review | complete suite, build and manual audit checklist |

## Phase quality gate

Every completed phase must pass `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`. Any specification deviation is recorded here before the next phase begins.

## Phase 1 result — 2026-08-24

Completed the npm workspace foundation: Vite/React/Tailwind web shell, Express API health endpoint, shared API contract, Docker PostgreSQL configuration, migration runner, environment validation, linting, tests, and build scripts.

Verified with exit code 0:

- `npm run typecheck`
- `npm run lint`
- `npm run test` (5 tests across 5 test files)
- `npm run build`

## Ongoing implementation milestone — 2026-08-24 (continued)

Extended the verified vertical slice with immutable administrator audit-log reads; protected user, portfolio, trade, activity, ledger, account-status, trading-status, and simulation-market controls; and database-backed manual reference prices. Market configuration now invalidates cached values and a paused simulation blocks trade execution server-side.

The ledger now includes set-balance, portfolio reset, internal transfer, and fee primitives, each with a balanced immutable transaction, idempotency, and ordered/locked balance access. Real PostgreSQL coverage proves set/reset projections preserve per-asset zero-sum accounting.

Authentication now has Supabase browser flows for email/password registration, verified login, Google OAuth, and password reset. Stripe Identity has a configuration-gated session/status API and an official-SDK, signature-verified, idempotent webhook path that stores only provider references/statuses. It degrades safely when Stripe credentials are absent.

The web app now hydrates its market ticker, order book, and candlestick chart through a Zustand store, surfaces stale feed state, submits authenticated simulated orders, and provides account, identity, and administrator routes. Binance's public WebSocket feed maintains a cached ticker stream with REST fallback; cross-market candles are synchronized synthetic derivations.

Verified with exit code 0 after these integrated changes:

- `npm run typecheck`
- `npm run lint`
- `npm run test` (58 API tests plus web/shared/database suites)
- `npm run build`

## Final audit progress — 2026-08-24

Closed the final implementation gaps found in the specification review: administrator-configured spread, depth, and volatility now drive the public synthetic order book; the documented `/api/orderbook/:pair` endpoint is retained alongside the existing market-scoped endpoint; the admin UI exposes every persisted market control, manual reference prices, and audited portfolio reset; and the exchange refresh loop polls every second while visible, backs off after a failed request, and substantially reduces work while the page is hidden.

The chart now provides a crosshair tooltip, all supported candle intervals feed the live chart request, cross-asset pairs display their actual quote asset, and signed-in users receive immediate recent-trade updates after simulated execution.

Verified with exit code 0:

- `npm run typecheck`
- `npm run lint`
- `npm run test` (58 API tests, 3 web tests, 1 shared test, and 5 database tests)
- `npm run build`

### Recorded deviations

- The supplied specification remains under its original filename rather than being copied to `SPEC.md`; it is linked above as the authoritative source to avoid maintaining duplicate product documents.
- Verification ran with locally installed Node.js 24.17.0. The workspace enforces Node.js `>=22`, so Node 22 LTS remains supported, but that exact runtime was not available for this local run.
- Docker Desktop was subsequently installed and PostgreSQL 16 is running locally through Docker Compose; migration and database integration tests are now verified.

## Phase 2 result — 2026-08-24

Completed the ledger-first PostgreSQL schema and development seed. The schema contains users, configurable assets and pairs, ledger accounts/transactions/entries, balance projections, trades, activity, immutable audit events, and market configuration. Deferred PostgreSQL constraint triggers require every ledger transaction to contain entries that balance to zero per asset; ledger and audit records reject modification and deletion.

The development seed creates the demo and administrator records, supported assets/pairs, all required system accounts, and demo portfolio balances through balanced `ADMIN_CREDIT` ledger transactions.

Verified against the local PostgreSQL 16 Docker container with exit code 0:

- `npm run typecheck`
- `npm run lint`
- `npm run test` (including real PostgreSQL migration, deferred-ledger, balance-constraint, and seed tests)
- `npm run build`

## Ongoing implementation milestone — 2026-08-24

Implemented and verified the current core vertical slice without marking any later phase complete: Supabase token adapter and account-state middleware; role-protected administrator credit/debit routes; decimal-only market calculations; public Binance/manual market providers; cached/derived cross prices; stale-data checks; generated order-book depth; authenticated portfolio reads; and an idempotent market-order route.

Market orders lock both relevant user balance rows in stable asset order, validate available funds, calculate spread/slippage/fees with decimal arithmetic, insert the completed trade and balanced immutable ledger entries, and update projections in one PostgreSQL transaction. Real PostgreSQL tests cover the completed BUY path, repeat-idempotency behavior, and forced-ledger-write rollback.

The exchange workstation is also implemented as a responsive dark-first trading screen with Lightweight Charts, depth, activity, execution controls, portfolio context, and persistent simulated-trading disclosure. It passed an independent visual review at desktop and mobile widths; its durable visual rules are in `apps/web/DESIGN.md`.

Verified with exit code 0 after this milestone:

- `npm run typecheck`
- `npm run lint`
- `npm run test` (32 API tests plus web/shared/database suites)
- `npm run build`
