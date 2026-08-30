---
version: 1
slug: "src-landingpage-tsx"
primary_target: "src/LandingPage.tsx"
related_targets: ["route:/"]
---

# Public conversion landing

## Scope & mode

- **Route:** `/`, rendered by `src/LandingPage.tsx`.
- **Mode:** Persuade. This route earns registration; it does not ask a first-time visitor to operate a trading terminal.

## Visitor, job, and action

The visitor wants to understand whether Phoenix is safe enough to try and what they can do before committing attention. Let them see a credible practice loop, then create an account. The primary action is `Create free account`; `Explore the terminal` is an intentionally secondary route.

## Proof and constraints

- Lead with simulated practice before public-market context. The proof is a three-step first session: create an account, get oriented, make a simulated trade.
- Keep the safety disclosure explicit and close to the first CTA: Phoenix has no wallet connection, deposits, withdrawals, custody, or external execution.
- Do not introduce invented testimonials, customer counts, performance claims, or external-liquidity promises.
- Preserve the established midnight, square-terminal vocabulary. This is a calmer entry to the product, not a second brand.

## Chosen direction

**THESIS:** Phoenix begins with safe practice, not a wall of market data.

**OWN-WORLD:** Midnight square terminal surfaces, hairline blue-steel rules, cyan conversion wayfinding, and restrained amber simulation cues.

**STORY:** A newcomer understands that Phoenix is a simulation, sees the first useful actions, and creates an account before choosing to inspect market context.

**FIRST VIEWPORT:** Quiet utility header; a left-aligned conversion statement and primary account CTA; a right-side three-stage simulated-session preview. The amber safety statement precedes the headline.

**FORM:** Grounded `observe → decide → execute` practice loop, candidate 4, seed `4bdaec0a`.

## Boundary

`/trade/:pair` is an **Operate** surface. It inherits the same visual system but may lead with dense market data, order controls, and portfolio state. Do not copy that operating topology into `/`'s first viewport.
