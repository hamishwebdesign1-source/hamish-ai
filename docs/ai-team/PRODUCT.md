# HamishAI — product

## What this actually is

Two products in one codebase, deliberately:

1. **hamishai.org, the marketing site** — Hamish's own one-person Edinburgh
   AI consultancy. Sells "AI transformation" to small businesses, runs a
   real Claude-powered chatbot, shows five fully-built fictional client
   sites as live demos. This is the original product.
2. **The Agency Platform (`/studio`)** — what #1 grew into. Other agencies
   (or freelancers wanting to run one) sign up as an `organisations` row
   ("org") and get the same client-prospecting → client-delivery → billing
   machinery Hamish built for his own business, generalised to run their
   business instead. Their own clients get a portal (`/portal`) branded to
   *them*, not HamishAI. See `docs/ARCHITECTURE.md`'s "Agency Platform
   layer" section for the technical shape.

The Agency Platform is the growth product. The marketing site is both a real
business and this product's own best case study — "we built our agency on
this, now you can build yours on it too."

## Who it's for

An agency owner or freelancer already doing (or wanting to do) client
services work — websites, local marketing, small-business consulting — who
wants AI to do the parts that don't need to be theirs: finding prospects,
researching them, drafting outreach, triaging client requests, building
websites via AI coding tools, tracking their own business's health. Not
aimed at a business buying AI services directly (that's the marketing site's
audience) — aimed at the person who'd sell those services to others.

**Honest gap**: there is no real user-research file behind this
description yet — it's inferred from what the product does, not from
interviews or usage data. If a mission needs a sharper answer than this,
that's a real research task, not something to assume answered. Don't invent
personas, quotes, or "users have told us" claims that don't exist.

## Business model

- **Platform subscription** (`src/lib/platform-plans.ts`): Starter (£19/mo,
  30 prospects/mo), Professional (£49/mo, 100/mo, highlighted), Agency
  (£99/mo, 250/mo, multiple seats). Stripe-billed, the org pays HamishAI.
- **Prospect credit top-ups** (`PROSPECT_CREDIT_PACK`): a one-time 20-prospect
  pack, priced under the cheapest plan's per-prospect rate, for a tenant that
  hits their monthly cap and wants headroom now rather than waiting or
  upgrading.
- Separately, and unrelated to the above: each org's *own* clients can be
  billed by that org (one-off invoices or a real Stripe subscription per
  client) — HamishAI never touches that money; see `docs/ARCHITECTURE.md`'s
  "Billing" section.

## Current real status (update this, don't let it go stale)

- Agency Platform is live and taking real self-serve signups and Stripe
  payments as of 2026-08-24 (Google sign-in, live billing, trial-ended
  email flow all confirmed working).
- Genuinely early-stage: no significant real usage/analytics history yet to
  draw retention or activation conclusions from. Growth & Analytics work
  right now should mostly be building the instrumentation and asking "what
  would we need to measure to answer this," not reporting numbers that
  don't exist.
- Hamish is currently employed elsewhere (NatWest) until 2026-11-09.
  **No active outreach or solicitation for HamishAI before that date** —
  this is a real, standing constraint on any mission's scope, not a
  suggestion. Product/build work, and passive/inbound-only surfaces, are
  fine; anything that reads as Hamish actively selling or soliciting is not,
  until that date passes. If a mission's natural next step is outreach,
  say so and stop there rather than executing it.

## Product principles (already established, hold the line on these)

- **Real data or nothing.** Every number a user sees is either computed from
  real rows or clearly labelled illustrative (see `/analytics` vs
  `/portal/insights` in `docs/ARCHITECTURE.md`). Never invent a stat, a
  testimonial, a "users report," or a fabricated status to make a feature
  look more finished than it is.
- **Fail open on soft checks, fail closed on money.** Rate limits and usage
  checks fail open on a DB error (never block a paying customer over a
  transient glitch); billing and auth do not get the same leniency.
- **Sever the link, don't cascade-delete real data.** When something with
  dependents is deleted, null the foreign key rather than deleting the
  dependent rows, unless the dependent genuinely has no meaning without its
  parent (see `deleteClientData()`, `deleteCampaign()`).
- **Thin and honest over impressive and fake.** Campaigns, for example, is
  deliberately "name it, see which real prospects belong to it" — no
  budget/spend tracking, because no real ad-platform data exists behind it
  yet. Build the next layer only once real data justifies it.
