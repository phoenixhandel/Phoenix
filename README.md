# Phoenix Exchange

Phoenix is a simulated cryptocurrency exchange. It never holds real assets, connects wallets, accepts deposits or withdrawals, or sends external trades.

## Local setup

1. Install Node.js 22 or newer and run `npm install`.
2. Copy `.env.example` to `.env` and adjust local values if needed.
3. Run `docker compose up -d postgres`.
4. Run `npm run db:migrate`.
5. Run `npm run dev:api` and `npm run dev:web` in separate terminals.

Run the complete quality gate with `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.

## Included capabilities

- Immutable PostgreSQL double-entry ledger and balance projection.
- Simulated market orders with configured spread, slippage, fees, idempotency, and row locking.
- Public Binance WebSocket pricing with REST fallback, manual market mode, generated books, and synthetic cross markets.
- Supabase email/password, Google OAuth, password reset, and optional phone OTP flows.
- Optional Stripe Identity sessions with signed webhook verification; raw identity documents never enter Phoenix.
- Protected administration for user state, trading state, balances, market mode, and immutable audit evidence.

## Optional providers

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` to enable browser authentication. Google OAuth and SMS delivery are configured in Supabase. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to enable Stripe Identity; without them the identity API reports an explicit unavailable state while authenticated trading remains usable when KYC is not required.
