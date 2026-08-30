---
name: Phoenix Exchange
description: A dark-first simulated trading system with a calm conversion route and a high-density terminal.
colors:
  app-bg: "#07101e"
  header-bg: "#091321"
  panel-bg: "#0d1727"
  input-bg: "#0a1322"
  grid-line: "#172337"
  panel-rule: "#1e2a40"
  control-rule: "#2a3a54"
  control-hover: "#26364d"
  active-tab: "#1d3046"
  text-strong: "#f1f5f9"
  text-muted: "#94a3b8"
  text-control: "#e2e8f0"
  text-subtle: "oklch(55.4% .046 257.417)"
  cyan: "oklch(86.5% .127 207.078)"
  cyan-hover: "oklch(91.7% .08 205.041)"
  buy: "oklch(84.5% .143 164.978)"
  sell: "oklch(81% .117 11.638)"
  simulated: "oklch(92.4% .12 95.746)"
  asset-bitcoin: "oklch(75% .183 55.934)"
typography:
  body:
    fontFamily: "Aptos, Segoe UI Variable, ui-sans-serif, system-ui, sans-serif"
  market-data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontFeature: "tabular-nums"
  label:
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.12em"
rounded:
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
components:
  panel:
    backgroundColor: "{colors.panel-bg}"
    rounded: "0"
  order-input:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.text-strong}"
    rounded: "0"
    padding: "12px"
  buy-action:
    backgroundColor: "{colors.buy}"
    textColor: "#06131a"
    rounded: "0"
    padding: "12px"
  sell-action:
    backgroundColor: "{colors.sell}"
    textColor: "#280b12"
    rounded: "0"
    padding: "12px"
  landing-primary-cta:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.app-bg}"
    rounded: "0"
    padding: "12px 24px"
    height: "48px"
  landing-secondary-cta:
    backgroundColor: "transparent"
    textColor: "{colors.text-control}"
    rounded: "0"
    padding: "12px 24px"
    height: "48px"
  first-session-preview:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-strong}"
    rounded: "0"
    padding: "20px"
  market-entry:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-strong}"
    rounded: "0"
    padding: "20px"
---

# Design System: Phoenix Exchange

## Overview

**Creative North Star: "The Verified Trading Desk"**

Phoenix is a dark-first simulated-trading system that changes density without changing identity. It uses square tonal panels, faint blue-steel rules, tight spacing, and tabular numbers to feel instrument-like rather than promotional.

The public entry route stages safe practice before market data: the account action and a clear no-real-assets disclosure lead, while a first-session preview makes the next three actions concrete. The trading workspace then returns to high-density operating behavior. Both surfaces keep simulated status unmissable and use the same cyan, amber, green, and rose semantics.

**Key Characteristics:**

- High-density desktop trading layout with an 8/4 content-and-order-entry split.
- A calmer public conversion route with an account CTA on the left and a first-session preview on the right.
- Flat layered surfaces instead of card shadows or rounded consumer-app chrome.
- Sans-serif interface language paired with monospaced, tabular market values.
- Cyan for focus, navigation, and selected controls; green and rose only for market direction.

## Colors

The palette is a cool midnight stack with sparse, high-legibility status color.

### Primary

- **Signal Cyan:** navigation links, selected interval text, focus rings, and the primary public account action.

### Secondary

- **Buy Green:** positive price movement, bid depth, live indicators, and the active buy action.
- **Sell Rose:** negative price movement, ask depth, and the active sell action.
- **Simulation Amber:** the persistent simulated-trading disclosure and its mobile fallback.

### Tertiary

- **Bitcoin Orange:** the market-identity dot only; other asset dots may use similarly compact identifier color.

### Neutral

- **Midnight Canvas:** the application background behind every trading surface.
- **Header Midnight:** the sticky header layer, held apart from the canvas with translucency and blur.
- **Terminal Panel:** the repeatable panel and chart background.
- **Blue-Steel Rules:** the hierarchy of panel, chart, and control dividers.
- **Cool White and Slate:** strong text, supporting values, and increasingly subdued labels.

**The Semantic Color Rule.** Cyan explains interface state and the public account action; green and rose explain market direction; amber explains simulation. Do not reuse those accents as generic decoration.

## Typography

**Display Font:** Aptos, with Segoe UI Variable and system sans fallbacks.
**Body Font:** Aptos, with Segoe UI Variable and system sans fallbacks.
**Label/Mono Font:** system monospace for values, amounts, times, and currency symbols.

**Character:** Compact and utilitarian. Prose is calm sans-serif; anything that must compare digit-by-digit uses tabular monospaced figures.

### Hierarchy

- **Market pair** (600, 20px, tight tracking): the single primary instrument label.
- **Panel title** (600, 14px): section identity without competing with market data.
- **Market value** (monospace, 14–18px, tabular numerals): prices, quantities, totals, and balances.
- **Landing headline** (600, 48px mobile / 72px from the small breakpoint, 0.96 line-height): a compact, left-aligned conversion statement; reserve the display scale for the public entry route.
- **Body** (14px): navigation, asset labels, and ordinary controls.
- **Label** (700, 10–11px, 0.12em tracking, uppercase where metadata): compact column headers, stat labels, and the simulated-status badge.

**The Numbers-First Rule.** Use monospaced tabular numerals for data that users scan vertically or compare horizontally; do not use them for ordinary navigation or explanatory copy.

## Layout

The public root and the trading workspace have deliberately different densities. The public root uses the 1280px `max-w-7xl` shell with 20px compact gutters and 32px from the small breakpoint. Its hero stacks by default, then becomes a near-even two-column field at the large breakpoint: conversion statement and CTA left, first-session preview right. Its market-entry grid progresses from one column to two and then four. The terminal remains centered in a 1600px maximum-width shell with 16px side gutters on compact screens and 24px at the small breakpoint; at extra-large widths it resolves into 12 columns, eight for market context/chart/order flow and four for the order form and portfolio.

Panels use 16px internal padding for primary content, 12px for dense table rows, and 8px for compact controls. The header is a sticky 64px strip. Navigation is hidden below the medium breakpoint, while the simulated disclosure becomes a dedicated visible block below the small breakpoint.

**The Practice-Before-Price Rule.** On the public root, make the first simulated session and account creation legible before asking a newcomer to parse market rows. The terminal may lead with market data because its visitor is there to operate.

## Elevation & Depth

Depth is tonal, not shadow-based. Midnight canvas, header, panel, and input colors establish nesting; 1px blue-steel rules separate regions and a translucent, blurred sticky header protects context while scrolling. Avoid floating cards, ambient shadows, or glass effects outside the header.

**The Rule-Not-Shadow Rule.** Separate market modules with tonal steps and hairline borders; reserve blur for the sticky header only.

## Shapes

The system is deliberately square: panels, buttons, field shells, tabs, and badges use zero corner radius. Only semantic dots use full rounding. Borders are thin, cool, and functional; there are no oversized pills or soft card corners.

## Components

### Buttons

**Character:** compact terminal controls, visibly responsive without decorative lift.

- **Primary trade action:** a full-width 12px vertical action bar; buy uses Buy Green with dark ink and sell uses Sell Rose with deep plum ink. Hover brightens the active semantic color.
- **Secondary controls:** square, outlined controls using the control rule; hover shifts border/text toward Signal Cyan.
- **Interval control:** small text tabs; the active tab gets the Active Tab fill and cyan text, while inactive tabs stay muted.
- **Focus:** every button receives a 2px Signal Cyan outline offset by 2px when keyboard-focused.

### Inputs / Fields

**Character:** a single square field shell with a dark inset surface. The amount input has 12px inner padding, monospaced value text, a fixed monospace unit suffix, and a cyan focus-within border.

### Cards / Containers

**Character:** structural modules, not floating cards. Use Terminal Panel fill, a 1px panel rule, zero radius, and 16px primary padding. Dense tables place label rows between horizontal rules and use 12px horizontal row padding.

### Navigation

**Character:** quiet horizontal text navigation adjacent to the compact PHOENIX wordmark. The active location is strong white; inactive links are muted slate. The wordmark's square cyan `P` tile is the one branded color block in the header.

### Simulated Trading Disclosure

**Character:** safety-critical, compact, and permanently visible. On the public root, place the amber `SIMULATED TRADING · NO REAL ASSETS` statement immediately above the hero and repeat the plain-language limit below its actions. In the terminal, use the amber, thin-bordered `SIMULATED TRADING` badge in the desktop header; on small screens show the same label alongside the explicit “No real assets or orders” explanation in its own panel.

### Public Conversion Controls

**Character:** precise terminal material, paced for a first visit rather than a trading task.

- **Primary account CTA:** a minimum 48px cyan action with dark ink and 24px horizontal padding. Its hover state moves to Cyan Hover; it remains the one decisive action in the first viewport.
- **Terminal explorer CTA:** a matching minimum 48px transparent action with a Blue-Steel control border and Cool White text. It is a secondary route, never a visual competitor to account creation.
- **First-session preview:** a square Terminal Panel with a thin control border and cyan top rule. Three numbered rows expose the path from account creation through orientation to a simulated trade.
- **Market entry:** a square bordered grid of available pairs. It is an invitation after the explanatory sections, not a dashboard or price board competing with the hero.

### Market Depth Rows

**Character:** three-column, 11px monospace rows with right-aligned amount and total. A low-opacity rose or green fill grows from the right behind each row to communicate relative depth; price text matches the side color.

## Do's and Don'ts

### Do:

- **Do** preserve the dark canvas → panel → input tonal hierarchy and 1px blue-steel rules.
- **Do** use square edges for controls and containers; reserve roundness for small status/asset dots.
- **Do** put volatile market data in monospaced tabular figures and align numeric columns to the right where they compare.
- **Do** retain a persistent, amber simulated-trading disclosure and explicit no-real-assets messaging in relevant order-entry contexts.
- **Do** keep cyan sparse and functional: focus, selected state, and navigational emphasis.
- **Do** keep the public root conversion-first: account creation leads, the first session is previewed, and market pairs arrive later as optional exploration.

### Don't:

- **Don't** introduce shadows, floating rounded cards, gradients, or decorative visualizations.
- **Don't** use green, rose, or amber as arbitrary brand accents; they have directional and safety meaning.
- **Don't** present simulated trading as real custody, wallet activity, deposits, withdrawals, or executable external orders.
- **Don't** loosen the information density with oversized type, tall rows, or excessive whitespace.
- **Don't** move the terminal's order-book density into the public first viewport or let the terminal-explorer CTA outrank account creation.
