# Design Language — Phoenix

## Intent

Phoenix is a German-first digital-asset workspace for people who want to orient themselves, monitor crypto markets, and manage a verified account without having to decode a trading terminal first. The visual character is **quiet financial infrastructure**: composed, exact, and human enough to feel trustworthy—not cold, loud, or promotional.

Every surface must make three things immediately clear: where the user is, what is true now, and the next useful action. The public site earns trust through plain language and evidence-led structure; authenticated surfaces feel like one coherent operations desk rather than disconnected pages.

## Visual grammar

- **Foundation:** midnight ink canvas (`#07101e`), raised blue-black workspace surfaces, hairline blue-steel dividers, and ample empty space around decisions. Depth comes from tonal layers and rules, never shadows or glass.
- **Typography:** a clear, high-legibility system sans for navigation and prose; tabular mono only for prices, quantities, timestamps, and data comparisons. Headings are compact and sentence case; content stays at readable measures rather than filling wide monitors.
- **Colour semantics:** cyan is navigation, focus, and the singular primary action; green is completed/positive state; rose is negative or destructive; amber is a clear limitation or warning. No colour is decoration alone and no state relies on colour without text or icon support.
- **Layout:** desktop uses a fixed 64px navigation rail/header rhythm, max-width content canvases, and deliberate page archetypes: editorial overview, data table, account workspace, verification checklist, support conversation, or policy document. Mobile collapses into a single obvious action path with touch targets of at least 44px.
- **Components:** square-but-not-harsh surfaces, 1px rules, grouped actions, visible keyboard focus, inline field validation, recoverable error panels, intentional empty states, and persistent language control. Each page has one visually dominant task.
- **Imagery and icons:** use real crypto/company logos only as identifiers, never as decorative confetti. Use a consistent lightweight line-icon family for actions and status; make icon-only controls explicitly labelled.
- **Motion:** short (160–240ms) opacity/transform transitions on interactions and one restrained page-entry reveal per view. Prefer loading skeletons or real progress over invented activity. Respect reduced-motion preferences.

## Signatures

- A square cyan Phoenix mark paired with a quiet utility header.
- A consistent "workspace frame": compact context row, decisive page title, then content arranged for the task—not a generic three-card grid.
- High-signal data bands: aligned tabular figures, restrained dividers, clear current-state badges, and a single primary control per region.
- Calm, editorial public sections that alternate explanatory copy with tangible product proof (market context, account steps, security model).
- Green completion states that pair a check icon, a clear label, and a concrete next action rather than colour alone.
- German-default interface copy that is direct, short, and specific about outcomes and recovery.

## Avoid

No fake proof, invented performance numbers, custody claims, fake KYC approvals, rounded fintech-card clichés, ambient neon, gradients, glassmorphism, arbitrary dashboards, duplicate headings, generic "feature-card" grids, or copied TitanLedger wording/assets. Do not over-explain market data or use simulated balances/orders as if they were real financial products.

## References

- `C:/Users/Enes/AppData/Local/Temp/codex-clipboard-7f5bc76e-5698-4e6b-a518-f8f18c0b18a5.png` — structured asset-row density and right-edge status signal.
- `C:/Users/Enes/AppData/Local/Temp/codex-clipboard-9e7d15a9-8854-4903-8719-90f93b16d16d.png` — spacious, reassuring registration composition.
- `https://titanledger.io/` — broad information architecture and confident, compact section pacing only.
- `https://www.w3.org/TR/WCAG22/` — contrast, resize, target-size, focus, and accessible-authentication baseline.
- `https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html` — visible, high-contrast keyboard focus treatment.
- `https://service-manual.ons.gov.uk/design-system/patterns/correct-errors` — recoverable form errors that preserve user input and identify the precise correction.
- `https://media.nngroup.com/media/reports/free/Application_Design_Showcase_1st_edition.pdf` — dashboard hierarchy that foregrounds the few important things and preserves scanability.
