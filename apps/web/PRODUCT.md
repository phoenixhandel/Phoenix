# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who want to explore cryptocurrency market behavior and practice simulated market orders without connecting wallets, depositing funds, or risking real assets. Administrators manage the simulation, accounts, balances, and market controls.

## Product Purpose

Phoenix Exchange is a high-fidelity cryptocurrency trading simulator. It gives a new visitor a safe route from account registration to an informed simulated trade, then provides a dense exchange workspace for active practice.

## Positioning

Phoenix combines real-world public market references with server-authoritative simulated execution and immutable ledger accounting. It is explicitly not an exchange, custodian, wallet, or payment service.

## Operating Context

Visitors arrive on the public website before they have an account. Registered users work in a browser-based trading screen with market charts, generated order-book depth, portfolio balances, trade history, and activity history.

## Capabilities and Constraints

- Only simulated market orders are supported.
- Real public market data may be displayed, but every Phoenix balance and trade is simulated.
- Email/password, Google OAuth, optional phone OTP, and optional Stripe Identity are configuration-dependent integrations.
- The homepage must make registration the primary action; the trading workspace remains available at `/trade/:pair`.

## Brand Commitments

- Product name: Phoenix Exchange.
- The public landing page may echo the information hierarchy and confidence of Binance’s public homepage, but must use Phoenix wording, identity, and original visual assets.
- “SIMULATED TRADING” and the absence of custody, deposits, withdrawals, and external execution must remain clear.

## Evidence on Hand

- Functional local exchange UI, API, automated tests, and development database setup.
- No customer testimonials, customer counts, performance claims, or third-party endorsements are available. Do not fabricate them.

## Product Principles

1. Make the simulated nature of every account and trade unambiguous.
2. Let a newcomer start safely before confronting professional market density.
3. Keep financial state and trading decisions authoritative on the backend.
4. Use live-looking market context as supporting orientation, never as a promise of real execution.

## Accessibility & Inclusion

The web experience uses semantic controls, visible keyboard focus, responsive layouts, readable contrast, and clear error states.
