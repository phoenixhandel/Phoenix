# Phoenix premium product surface plan

## Goal

Turn the existing simulated exchange into a coherent, deployment-ready product surface. The product must be visually complete and every visible path must either work locally or state its external deployment dependency plainly.

## Constraints

- Phoenix remains a simulation: no custody, deposits, withdrawals, or external execution.
- Do not copy TitanLedger's content or unsupported commercial claims; use its broad navigation and footer density only as a reference.
- Authentication continues to use the configured Supabase integration. A real signup needs deployment credentials, which cannot be fabricated locally.
- Identity verification continues to use the existing Stripe Identity server integration when configured.

## Delivery steps

1. Add tests covering the new public-product paths and accessible support/verification entry points.
2. Build shared public navigation, a rich four-column footer, and a longer home page that explains the live product without invented proof points.
3. Add public product, market, information, legal, and status views so navigation destinations are intentional rather than dead links.
4. Add a functional Phoenix Assist guided-support panel with deterministic, useful responses and an honest live-AI configuration state.
5. Replace the raw account identity view with a three-tier verification experience driven by actual account/identity API state.
6. Check desktop and mobile routes in the browser, run the design detector, lint, typecheck, tests, and production build.
