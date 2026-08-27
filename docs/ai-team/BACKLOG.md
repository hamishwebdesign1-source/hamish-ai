# HamishAI — backlog

Structured tasks, turned from ideas by the Product Director (see
`.claude/agents/product-director.md`) — not a dumping ground for every raw
idea. An idea earns a slot here once it has a real problem statement and an
owner. Newest first within each status. Move an entry between sections
rather than duplicating it.

## Task template

```
### <short title>

- **Problem**: what's actually wrong or missing, for whom
- **Objective**: what success looks like
- **User**: who this is for (be specific — not "users," which user)
- **Priority**: P0 (now) / P1 (next) / P2 (worth doing) / P3 (someday)
- **Expected outcome**: the real, measurable-or-observable change
- **Acceptance criteria**: how we'll know it's actually done
- **Relevant agent**: who owns driving this
- **Dependencies**: what has to be true/done first, if anything
- **Status**: Not started / Researching / Ready / In progress / Needs review / Complete / Blocked
```

## In progress

_(none yet)_

## Ready

### Add render/interaction test coverage for the Command Centre card components

- **Problem**: QA's 2026-08-27 review found zero automated test coverage over `page.tsx`'s card renderers, `command-centre-stat-cards.tsx`, and `command-centre-section-cards.tsx` — the existing `command-centre-layout.test.ts`/`command-centre-tab-grouping.test.ts` only cover the pure logic modules, not these `.tsx` files. A future accidental revert of the bg-primary/bg-card tiering wouldn't be caught by `npm run test`.
- **Objective**: real regression coverage over these three files' card-tier logic.
- **User**: whoever next touches Command Centre card rendering.
- **Priority**: P2.
- **Relevant agent**: Lead Engineer.
- **Dependencies**: needs `@testing-library/react` (or equivalent) added as a real dependency — not installed yet, checked 2026-08-27. A real decision (new tooling), not just writing the tests.
- **Status**: Ready.

## Researching

_(none yet)_

## Not started

### Structurally prioritise actions_required on the Command Centre

- **Problem**: the UX/UI Director's 2026-08-27 audit's Priority 1(b) — always render `actions_required` first regardless of block order/tab, the way TodayStrip and the stat row already bypass the reorderable canvas for the same "shouldn't be hideable" reason. Deliberately deferred out of 40e0552's scope by Product Director: it changes established reorder/tab behaviour, not just a color token, and deserves its own screenshot-verified pass rather than shipping alongside a lower-risk change.
- **Objective**: TBD — needs its own scoping pass once the visual-verification loop above closes.
- **User**: any org relying on Settings → Command Centre layout to reorder blocks.
- **Priority**: P2.
- **Relevant agent**: Product Director (scope first), then UX/UI Director + Lead Engineer.
- **Dependencies**: the screenshot-verification item above — see its actual rendered result before deciding whether this is still needed.
- **Status**: Not started.

## Complete

### Screenshot-verify the Command Centre card-hierarchy fix (commit 40e0552)

Closed 2026-08-27 — Hamish signed into a real Studio session and handed
the Browser pane to it. Confirmed via exact computed pixel values
(rgb(12,20,33) vs rgb(7,13,24)) that the fix was live and correct but
visually subtle; shipped a follow-up accent ring (`e5931f7`) on top,
re-verified live again after that deploy too.

### Move HealthRing off hardcoded text-primary-foreground

Closed 2026-08-27 (`0c4b85f`) — added an explicit `tone` prop instead of
a `currentColor` switch, since the component has 5 real consumers and a
global switch risked changing 4 of them nobody had audited.

### docs/RUNBOOK.md's stale 5-job cron table

Closed 2026-08-27 (`1ce4eb4`) — corrected to the real 13, cross-checked
against `cron-schedule.ts`'s `CRON_SPECS`.

### stripKit() missing defensive coercion

Closed 2026-08-27 (`419f363`) — brought up to the same standard as
`stripBrief()`/`reconcilePhases()`, plus a real 3-attempt retry loop in
`draftSalesKit()` matching the sibling files' own convention.
