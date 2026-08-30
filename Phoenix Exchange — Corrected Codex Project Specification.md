# Phoenix Exchange
## High-Fidelity Simulated Cryptocurrency Trading Platform

## 1. Product Objective

Build a polished, feature-rich cryptocurrency exchange simulator inspired by the interaction patterns of major exchanges.

Phoenix Exchange must provide:

- Real-world cryptocurrency market pricing.
- Simulated market-order execution.
- Simulated user balances.
- Portfolio valuation.
- Candlestick charts.
- Order-book visualization.
- Trade history.
- User activity history.
- Public registration and login.
- OAuth.
- Email and optional SMS verification.
- Optional identity/KYC verification.
- Comprehensive administrative controls.
- Immutable accounting and admin audit trails.

Phoenix Exchange **does not execute real cryptocurrency trades, custody real cryptocurrency, connect user wallets, accept deposits, or process withdrawals**.

The interface must clearly identify itself as a simulation/demo environment. Simulated balances must never be represented as real cryptocurrency holdings.

---

# 2. Core Product Rules

## 2.1 Trading

Only **market orders** are supported.

When a user executes a trade:

1. Validate authentication and account status.
2. Validate trading permission.
3. Validate verification requirements.
4. Retrieve the latest market price.
5. Calculate simulated execution price.
6. Calculate applicable fee.
7. Verify sufficient user balance.
8. Create the trade.
9. Update both relevant asset balances.
10. Write all movements to the immutable ledger.
11. Commit everything in one PostgreSQL transaction.
12. Return the completed simulated trade.

If any step fails, the complete database transaction must roll back.

No partial balance update is allowed.

---

# 3. Supported Assets

Initial assets:

- BTC
- ETH
- SOL
- XRP
- USDT

Initial canonical trading pairs:

- BTC/USDT
- ETH/USDT
- SOL/USDT
- XRP/USDT
- BTC/ETH
- BTC/SOL
- BTC/XRP
- ETH/SOL
- ETH/XRP
- SOL/XRP

The architecture must allow new assets and pairs to be added through configuration/database records without rewriting core trading logic.

---

# 4. Technology Stack

## Monorepo

Use npm workspaces.

Structure:

```text
phoenix-exchange/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── database/
│   ├── migrations/
│   └── seeds/
├── docker/
├── docs/
├── .env.example
├── docker-compose.yml
├── package.json
├── SPEC.md
└── README.md
```

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS v4
- Zustand
- TradingView Lightweight Charts
- Axios or Fetch wrapper
- React Router
- Zod where useful for runtime validation

Do not use Create React App.

## Backend

- Node.js 22 LTS
- Express
- TypeScript
- PostgreSQL
- `pg`
- Zod
- Supabase Auth
- Stripe SDK
- WebSocket client for market-data ingestion
- structured logging

## Database

PostgreSQL is mandatory.

Local development must work using Docker Compose.

Production database configuration must use standard PostgreSQL connection strings and must not couple business logic to a specific hosting provider.

---

# 5. Authentication Architecture

Authentication should use **Supabase Auth instead of custom password/JWT implementation**.

Reasons:

- Email/password authentication.
- Email verification.
- OAuth.
- Phone OTP support.
- Password reset.
- JWT/session infrastructure.
- Reduced authentication code written manually.

Phoenix's Express backend remains the authoritative application backend.

## Supported authentication methods

Phase 1:

- Email + password
- Google OAuth

Supported through configuration:

- Phone number + SMS OTP
- Additional OAuth providers later

Examples of future OAuth providers:

- Apple
- Facebook
- GitHub

Do not tightly couple user records to Google.

---

# 6. Verification

## Email

Email/password registrations require email verification.

Unverified email accounts may log into the verification flow but cannot trade.

## OAuth

OAuth identities are considered contact-verified when the identity provider provides a verified email claim.

## SMS

Phone OTP should be supported through Supabase Auth.

SMS must remain optional because it requires an external provider such as:

- Twilio
- Vonage
- MessageBird

If no SMS provider is configured, Phoenix must continue functioning normally with email/OAuth authentication.

## Identity Verification / KYC

Integrate Stripe Identity.

Supported flow:

1. User clicks **Verify Identity**.
2. Phoenix backend creates a Stripe Identity VerificationSession.
3. Stripe handles document/selfie collection.
4. Phoenix receives Stripe webhook events.
5. Phoenix updates the user's KYC status.
6. Phoenix stores only required provider IDs/status information.

Phoenix must not store raw passport/ID/selfie images itself.

KYC states:

```text
NOT_STARTED
PENDING
VERIFIED
FAILED
REQUIRES_INPUT
```

Configuration:

```text
REQUIRE_KYC_FOR_TRADING=false
```

If enabled:

```text
user.kyc_status === VERIFIED
```

is required before trading.

Development must support Stripe test mode.

---

# 7. User Model

```text
users
-----
user_id UUID PRIMARY KEY
auth_user_id UUID UNIQUE NOT NULL
username VARCHAR UNIQUE
email VARCHAR
phone VARCHAR
role ENUM(USER, ADMIN)
account_status ENUM(ACTIVE, SUSPENDED, LOCKED)
trading_status ENUM(ENABLED, FROZEN)
email_verified BOOLEAN
phone_verified BOOLEAN
kyc_status ENUM(...)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
last_login_at TIMESTAMPTZ
```

Do not store plaintext passwords.

Authentication credentials belong to the authentication provider.

---

# 8. Ledger Architecture

The previous single `transaction_ledger` design is insufficient.

Phoenix must use an immutable transaction + entry model.

## ledger_transactions

```text
transaction_id UUID PRIMARY KEY
transaction_type ENUM(
    TRADE,
    TRADE_FEE,
    ADMIN_CREDIT,
    ADMIN_DEBIT,
    ADMIN_SET_BALANCE,
    ADMIN_RESET
)
actor_user_id UUID NULL
target_user_id UUID NULL
idempotency_key VARCHAR UNIQUE
notes TEXT
created_at TIMESTAMPTZ
```

## ledger_accounts

```text
account_id UUID PRIMARY KEY
owner_user_id UUID NULL
asset_symbol VARCHAR NOT NULL
account_type ENUM(
    USER,
    SYSTEM_LIQUIDITY,
    SYSTEM_FEES,
    SYSTEM_ADJUSTMENT
)
created_at TIMESTAMPTZ
```

## ledger_entries

```text
entry_id UUID PRIMARY KEY
transaction_id UUID NOT NULL
account_id UUID NOT NULL
amount_delta NUMERIC(30, 12) NOT NULL
created_at TIMESTAMPTZ
```

Ledger records must be immutable.

No UPDATE or DELETE operation may modify completed ledger entries through application APIs.

For each asset involved in a transaction:

```text
SUM(amount_delta) = 0
```

between user and system accounts.

---

# 9. Current Balance Projection

Use a separate projection table for fast reads.

```text
portfolio_balances
------------------
user_id UUID
asset_symbol VARCHAR
balance NUMERIC(30, 12)
updated_at TIMESTAMPTZ

PRIMARY KEY(user_id, asset_symbol)
CHECK(balance >= 0)
```

The ledger is the historical source of truth.

`portfolio_balances` is the current-state projection.

Any balance change must:

1. Create ledger transaction.
2. Create ledger entries.
3. Update portfolio balance.
4. Occur inside the same PostgreSQL transaction.

Never manipulate `portfolio_balances` independently.

---

# 10. Trades

```text
trades
------
trade_id UUID PRIMARY KEY
user_id UUID NOT NULL
pair_symbol VARCHAR NOT NULL
side ENUM(BUY, SELL)
base_asset VARCHAR
quote_asset VARCHAR
base_amount NUMERIC(30, 12)
quote_amount NUMERIC(30, 12)
market_price NUMERIC(30, 12)
execution_price NUMERIC(30, 12)
fee_asset VARCHAR
fee_amount NUMERIC(30, 12)
idempotency_key VARCHAR UNIQUE
created_at TIMESTAMPTZ
```

All market orders execute immediately.

No OPEN order state is necessary.

---

# 11. Simulated Execution Engine

Phoenix must not simply transfer at the raw API price.

The simulator should emulate execution mechanics.

Starting defaults:

```text
trading_fee = 0.10%
spread = configurable
slippage = configurable
```

Example BUY:

```text
market price:
$100

effective execution:
$100.05

quantity:
2

quote cost:
$200.10

fee:
$0.20
```

Values should be configurable through admin/system configuration.

The simulator does not need a real matching engine.

---

# 12. Market Data Architecture

## Primary Market Data Provider

Use Binance public market data.

Phoenix must never connect to Binance user/trading APIs.

Only public market information is used.

Subscribe to:

```text
BTCUSDT
ETHUSDT
SOLUSDT
XRPUSDT
```

using public WebSocket market streams.

Maintain fallback REST fetching if the WebSocket disconnects.

Implement automatic:

- reconnect
- exponential backoff
- stale-feed detection
- heartbeat monitoring

---

# 13. Derived Markets

Crypto-to-crypto prices should be calculated from USDT references.

Example:

```text
BTCETH =
BTCUSDT / ETHUSDT
```

Likewise:

```text
BTCSOL = BTCUSDT / SOLUSDT
BTCXRP = BTCUSDT / XRPUSDT
ETHSOL = ETHUSDT / SOLUSDT
ETHXRP = ETHUSDT / XRPUSDT
SOLXRP = SOLUSDT / XRPUSDT
```

This removes dependency on whether an external exchange directly lists every Phoenix pair.

All calculations must use decimal arithmetic rather than JavaScript floating-point arithmetic for stored financial values.

---

# 14. Market Provider Abstraction

Implement:

```typescript
interface MarketDataProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getTicker(symbol: string): Promise<Ticker>;
  getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number
  ): Promise<Candle[]>;
}
```

Providers:

```text
BinanceMarketProvider
ManualMarketProvider
```

Optional later:

```text
CoinGeckoMarketProvider
```

Configuration:

```text
MARKET_PROVIDER=binance
```

This means Phoenix still works if Binance becomes unavailable.

---

# 15. Manual Market Mode

Admins may switch Phoenix into:

```text
REAL
MANUAL
```

market mode.

REAL:

External prices anchor the simulator.

MANUAL:

Admin-configured prices are used.

Manual mode is specifically for demos/testing and must remain visibly marked as simulated.

Admin market controls may configure:

- asset reference price
- volatility
- spread
- slippage
- synthetic order-book depth
- fee percentage
- pause/resume market simulation

---

# 16. Candlestick Data

Endpoint:

```text
GET /api/market/:pair/candles
```

Supported intervals initially:

```text
1m
5m
15m
1h
4h
1d
```

For USDT pairs, historical Binance candles may be used.

For synthetic cross markets, derive approximate candles from synchronized USDT candles.

Example:

```text
OPEN(A/B) = OPEN(A/USDT) / OPEN(B/USDT)

CLOSE(A/B) = CLOSE(A/USDT) / CLOSE(B/USDT)

HIGH(A/B) ≈ HIGH(A/USDT) / LOW(B/USDT)

LOW(A/B) ≈ LOW(A/USDT) / HIGH(B/USDT)
```

These candles must be marked internally as synthetic.

After Phoenix begins running, generated candles may be persisted locally for consistent chart history.

---

# 17. Order Book

Phoenix does not need a real matching engine.

Order-book depth should be generated around the current market price.

Example:

```json
{
  "pair": "BTCUSDT",
  "timestamp": "...",
  "sequence": 124522,
  "bids": [
    { "price": "61299.50", "amount": "0.531" }
  ],
  "asks": [
    { "price": "61300.20", "amount": "0.821" }
  ]
}
```

Generate approximately:

```text
20–50 levels
```

per side.

Depth generation should depend on:

- current price
- spread
- configured volatility
- pair liquidity profile
- seeded pseudo-random generation

The output should visually resemble a realistic order book without claiming to represent executable external liquidity.

---

# 18. Core API

Prefix:

```text
/api
```

## Current User

```text
GET /api/me
```

## Portfolio

```text
GET /api/me/portfolio
```

Example:

```json
{
  "userId": "...",
  "balances": {
    "BTC": "0.750000000000",
    "ETH": "2.100000000000",
    "USDT": "10500.000000000000"
  }
}
```

Financial decimal values must be transmitted as strings.

## Trade

```text
POST /api/trades/market
```

Body:

```json
{
  "pair": "BTCUSDT",
  "side": "BUY",
  "baseAmount": "0.05"
}
```

Header:

```text
Idempotency-Key: <uuid>
```

Duplicate idempotency keys must return the existing result instead of executing another trade.

## Trade History

```text
GET /api/me/trades
```

Cursor paginated.

## Activity

```text
GET /api/me/activity
```

## Market List

```text
GET /api/market/pairs
```

## Tickers

```text
GET /api/market/feed
```

## Candles

```text
GET /api/market/:pair/candles
```

## Order Book

```text
GET /api/orderbook/:pair
```

---

# 19. Identity API

```text
POST /api/verification/identity/session
GET /api/verification/identity/status
```

Webhook:

```text
POST /api/webhooks/stripe/identity
```

Stripe webhook signatures must be verified.

Never trust verification status supplied by the browser.

---

# 20. Admin Capabilities

Admin functionality should be extensive but auditable.

## User Management

Admin can:

- search users
- view user profile
- view registration date
- view verification state
- view last login
- suspend account
- reactivate account
- lock account
- unlock account
- freeze trading
- enable trading
- inspect portfolio
- inspect trades
- inspect activity
- inspect ledger history
- inspect KYC status

Admin must never:

- view user passwords
- edit completed ledger entries
- delete audit records
- bypass accounting when modifying balances

---

# 21. Balance Administration

Admin can:

- credit balance
- debit balance
- set exact balance
- reset portfolio

Endpoints:

```text
POST /api/admin/users/:userId/balance/credit
POST /api/admin/users/:userId/balance/debit
PUT  /api/admin/users/:userId/balance
POST /api/admin/users/:userId/portfolio/reset
```

Example set balance:

```json
{
  "asset": "BTC",
  "newBalance": "1.500000000000",
  "reason": "Demo account adjustment"
}
```

"Set exact balance" must **not directly overwrite the number**.

Instead:

```text
current balance = 0.5 BTC
desired balance = 1.5 BTC
delta = +1.0 BTC
```

Phoenix creates an:

```text
ADMIN_SET_BALANCE
```

ledger transaction for `+1 BTC`.

This preserves accounting history.

Every admin financial action requires:

- authenticated administrator
- reason
- idempotency key
- audit record
- ledger transaction
- timestamp

---

# 22. Admin Audit System

```text
admin_audit_events
------------------
event_id UUID PRIMARY KEY
admin_user_id UUID
target_user_id UUID NULL
action VARCHAR
entity_type VARCHAR
entity_id UUID NULL
metadata JSONB
reason TEXT
ip_address INET
created_at TIMESTAMPTZ
```

Examples:

```text
USER_SUSPENDED
USER_REACTIVATED
TRADING_FROZEN
TRADING_ENABLED
BALANCE_CREDITED
BALANCE_DEBITED
BALANCE_SET
PORTFOLIO_RESET
KYC_REVIEW_REQUESTED
MARKET_MODE_CHANGED
MARKET_CONFIG_CHANGED
```

Audit records are immutable through normal APIs.

---

# 23. Admin API

```text
GET /api/admin/users
GET /api/admin/users/:userId
GET /api/admin/users/:userId/portfolio
GET /api/admin/users/:userId/trades
GET /api/admin/users/:userId/activity
GET /api/admin/users/:userId/ledger

PATCH /api/admin/users/:userId/status
PATCH /api/admin/users/:userId/trading-status

POST /api/admin/users/:userId/balance/credit
POST /api/admin/users/:userId/balance/debit
PUT /api/admin/users/:userId/balance
POST /api/admin/users/:userId/portfolio/reset

GET /api/admin/audit-log

GET /api/admin/market/config
PATCH /api/admin/market/config
```

All listing endpoints must support pagination.

Admin authorization must be checked server-side.

Never rely on frontend route protection alone.

---

# 24. Frontend Pages

## Public

```text
/
/login
/register
/verify-email
/verify-phone
/forgot-password
/reset-password
```

## Account

```text
/account
/account/security
/account/verification
```

## Exchange

```text
/trade/:pair
/portfolio
/history
/activity
```

## Admin

```text
/admin
/admin/users
/admin/users/:id
/admin/audit
/admin/market
```

---

# 25. Main Exchange Layout

```text
ExchangeLayout
├── Header
├── MarketSelector
├── MarketTicker
├── MarketChart
├── OrderBook
├── RecentMarketTrades
├── TradingForm
├── PortfolioSummary
└── UserTradeHistory
```

Desktop interface should resemble the information density of a professional exchange.

Mobile interface should collapse panels intelligently instead of simply shrinking the desktop grid.

---

# 26. Chart

Use TradingView Lightweight Charts.

Must support:

- candlesticks
- volume
- tooltip
- crosshair
- zoom
- pan
- responsive resizing
- interval selector
- loading state
- error state
- reconnect/stale indicator

Do not use Recharts for the primary trading chart.

Recharts may still be used for unrelated portfolio visualizations if useful.

---

# 27. Order Book UI

Order book should include:

```text
Price
Amount
Total
```

Use depth backgrounds behind rows.

Asks above current market price.

Bids below current market price.

Include:

- mid-market price
- directional indicator
- spread
- cumulative depth
- changing rows

Visual density is important.

---

# 28. Trading Form

Inputs:

- pair
- BUY / SELL
- amount
- calculated quote amount
- available balance

Display before confirmation:

```text
Market Price
Estimated Execution
Estimated Fee
Estimated Total
```

On successful trade:

- portfolio updates immediately
- history updates immediately
- success notification appears

On insufficient balance:

- transaction rejected
- balances remain unchanged

---

# 29. Zustand State

Example structure:

```typescript
interface ExchangeState {
  selectedPair: string;

  market: Record<string, MarketTicker>;

  candles: Candle[];

  orderBook: OrderBook;

  portfolio: Record<string, string>;

  recentTrades: Trade[];

  userTrades: UserTrade[];

  currentUser: User | null;

  marketConnected: boolean;

  marketStale: boolean;

  loading: Record<string, boolean>;

  errors: Record<string, string | null>;
}
```

Do not put every piece of temporary form state into the global store.

---

# 30. Data Refresh

Prefer backend WebSocket ingestion for upstream market data.

Browser communication may initially use polling.

Suggested:

```text
market ticker: 1 second
order book: 1 second
recent market activity: 2 seconds
portfolio: after mutations + periodic reconciliation
```

Polling should pause or substantially reduce when:

```text
document.visibilityState === "hidden"
```

Failed requests should use exponential backoff.

The UI must visibly indicate stale market data.

---

# 31. User Activity

Record meaningful account actions.

Examples:

```text
ACCOUNT_REGISTERED
LOGIN
LOGOUT
EMAIL_VERIFIED
PHONE_VERIFIED
KYC_STARTED
KYC_VERIFIED
TRADE_EXECUTED
PASSWORD_CHANGED
ACCOUNT_SUSPENDED
TRADING_FROZEN
```

Do not store secrets in activity metadata.

---

# 32. Security

Implement:

- secure HTTP headers
- CORS allowlist
- CSRF protection where cookie authentication is used
- rate limiting
- Zod request validation
- parameterized SQL
- authorization middleware
- administrator middleware
- webhook signature verification
- structured error handling
- sensitive-field redaction in logs
- environment secret validation

Never trust:

- prices submitted by frontend
- user IDs submitted as authenticated identity
- role values supplied by frontend
- verification status supplied by frontend
- balance calculations performed by frontend

The backend determines all authoritative financial state.

---

# 33. Concurrency

Balance-changing operations must lock relevant rows during execution.

Example:

```sql
SELECT ...
FOR UPDATE;
```

Concurrent trades must not allow the same balance to be spent twice.

All financial mutations must use PostgreSQL transactions.

---

# 34. Idempotency

Required for:

- market trades
- admin credits
- admin debits
- set balance
- portfolio reset
- Stripe verification creation where appropriate

A repeated request using the same idempotency key must never create the financial effect twice.

---

# 35. Initial Seed Data

Create:

## Demo User

Configurable development user.

Starting portfolio example:

```text
USDT 100,000
BTC 1
ETH 10
SOL 100
XRP 10,000
```

## Admin User

Separate seeded development administrator.

Never commit production passwords or credentials.

## System Accounts

Seed:

```text
SYSTEM_LIQUIDITY
SYSTEM_FEES
SYSTEM_ADJUSTMENT
```

for every supported asset.

---

# 36. Testing Requirements

Use automated testing extensively.

At minimum test:

## Authentication

- unauthenticated request denied
- suspended user denied
- admin route denied to normal user

## Trading

- BUY decreases quote balance
- BUY increases base balance
- SELL decreases base balance
- SELL increases quote balance
- fees deducted correctly
- insufficient balance rejected
- unsupported pair rejected
- negative amount rejected
- duplicate idempotency request cannot double-trade

## Database Atomicity

Force ledger insertion failure.

Verify:

```text
portfolio balances remain unchanged
trade record does not exist
ledger transaction does not partially exist
```

## Concurrency

Execute competing transactions against the same balance.

Verify that double spending is impossible.

## Administration

- admin can set balance
- regular user cannot
- exact balance adjustment generates ledger entries
- audit event generated
- reset portfolio audited

## Market

- derived pairs calculated correctly
- stale market feed detected
- provider failure triggers fallback behavior
- manual mode works

## KYC

- fake browser success cannot mark user verified
- valid Stripe webhook can update status
- invalid webhook signature rejected

---

# 37. Quality Gates

Every development phase must pass:

```text
npm run typecheck
npm run lint
npm run test
npm run build
```

Codex must not proceed while these commands fail.

Do not:

- comment out failing tests
- replace real logic with placeholders
- use `any` simply to silence TypeScript
- disable lint rules to hide implementation errors
- remove validation to make tests pass

---

# 38. Visual Direction

Phoenix Exchange should feel like a premium modern financial application.

Desired characteristics:

- dark-first interface
- strong typography hierarchy
- dense but readable data
- restrained gradients
- subtle borders
- price-change animations
- smooth hover states
- responsive layout
- professional spacing
- minimal unnecessary decoration

Avoid:

- oversized cards
- excessive rounded corners
- generic SaaS dashboard appearance
- huge whitespace
- cartoon graphics
- excessive gradients
- fake Binance branding

Phoenix must have its own branding.

A persistent indicator should state:

```text
SIMULATED TRADING
```

or equivalent.

---

# 39. External Services

## Binance

Use only for public market data.

Never:

- connect user Binance accounts
- obtain trading API keys
- execute external trades

## Supabase

Use for:

- authentication
- OAuth
- email confirmation
- optional phone OTP

## SMS Provider

Optional.

Configuration-based.

## Stripe Identity

Use for optional government-ID verification.

Store provider references/status only.

Do not store raw identity documents.

---

# 40. Graceful Degradation

Phoenix must continue functioning when optional providers are unavailable.

Examples:

If SMS is unavailable:

```text
email and OAuth authentication still work
```

If Stripe Identity is unavailable:

```text
existing verified users remain usable
new KYC verification temporarily unavailable
```

If Binance is unavailable:

```text
show market stale state
attempt reconnect
optionally fall back to MANUAL mode
do not fabricate "live" external data without indicating simulation mode
```

---

# 41. Implementation Sequence for Codex

## Phase 1 — Foundation

Create:

- npm monorepo
- Vite React app
- Express API
- TypeScript configuration
- Tailwind
- shared package
- PostgreSQL Docker environment
- environment validation
- linting
- testing
- initial migrations

Do not build exchange UI yet.

## Phase 2 — Database

Implement:

- users
- portfolio balances
- ledger accounts
- ledger transactions
- ledger entries
- trades
- activity events
- admin audit events
- market configuration
- seeds

Add database-level tests.

## Phase 3 — Authentication

Implement:

- registration
- login
- logout
- email verification
- password recovery
- Google OAuth
- backend session verification
- role checking
- account-status checking

SMS integration may remain configuration-dependent.

## Phase 4 — Ledger

Implement transactional services:

```text
credit
debit
setBalance
transfer
trade
fee
resetPortfolio
```

Add atomicity and concurrency tests.

## Phase 5 — Market Engine

Implement:

- Binance provider
- WebSocket ingestion
- REST fallback
- market cache
- derived prices
- candles
- order-book generation
- manual provider
- stale-data detection

## Phase 6 — Trading

Implement market-order execution.

Integrate:

```text
market engine
portfolio
ledger
fees
slippage
trade history
```

## Phase 7 — User Frontend

Build:

- authentication
- account
- verification
- portfolio
- history

## Phase 8 — Exchange UI

Build:

- header
- pair selector
- ticker
- TradingView Lightweight Chart
- order book
- trading form
- recent trades
- user trade history
- responsive layout

## Phase 9 — Administration

Build:

- admin dashboard
- user search
- user detail
- balance administration
- account controls
- trading controls
- activity viewer
- ledger viewer
- audit viewer
- market controls

## Phase 10 — Identity

Implement Stripe Identity integration and webhook handling.

## Phase 11 — Polish

Improve:

- responsive behavior
- visual consistency
- loading states
- skeletons
- animations
- error handling
- reconnect UX
- accessibility

## Phase 12 — Final Audit

Codex must review the complete codebase for:

- security problems
- race conditions
- broken authorization
- balance inconsistencies
- missing validation
- dead code
- unnecessary dependencies
- type errors
- build errors
- UX inconsistencies

Run the complete test suite.

---

# 42. Final Instruction to Codex

Read `SPEC.md` completely before modifying the repository.

Treat it as the authoritative product specification.

Do not attempt to implement the entire project in one uncontrolled pass.

First:

1. inspect the repository;
2. identify assumptions or contradictions;
3. create `IMPLEMENTATION_PLAN.md`;
4. map implementation phases to concrete files/migrations/tests;
5. begin Phase 1 only.

At the end of every phase:

1. run tests;
2. run TypeScript checking;
3. run linting;
4. run production builds;
5. fix failures;
6. summarize exactly what changed;
7. document any deviation from `SPEC.md`.

Never implement real cryptocurrency trading, deposits, withdrawals or wallet custody.

All balances and trades within Phoenix Exchange are simulated.

External market data may be real, but Phoenix transactions are not.