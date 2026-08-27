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

### Screenshot-verify the Command Centre card-hierarchy fix (commit 40e0552)

- **Problem**: 40e0552 restored bg-primary/bg-card tiering across the Command Centre (UX/UI Director audit → Lead Engineer implementation → QA static review, 2026-08-27), but no agent has Studio login credentials — the actual rendered result has never been seen, only reasoned about from token math.
- **Objective**: confirm the visual hierarchy actually reads as intended on a real authenticated Command Centre.
- **User**: any signed-in org owner viewing their own Command Centre home.
- **Priority**: P0 — this is the one open loop blocking the change from being called fully done, and it's already committed (not pushed).
- **Expected outcome**: a real screenshot (or Hamish's own look) confirms actions_required/TodayStrip read as featured and everything else reads as a calmer, consistent tier.
- **Acceptance criteria**: screenshot taken on an authenticated session, both a sparse (new-org) and data-heavy org state if feasible; any visual issue found gets a fast follow-up fix.
- **Relevant agent**: UX/UI Director (second pass, per its own mandate's "review the real thing, not the diff").
- **Dependencies**: Hamish's own Studio login (no agent has one).
- **Status**: Needs review.

## Ready

### Add render/interaction test coverage for the Command Centre card components

- **Problem**: QA's 2026-08-27 review found zero automated test coverage over `page.tsx`'s card renderers, `command-centre-stat-cards.tsx`, and `command-centre-section-cards.tsx` — the existing `command-centre-layout.test.ts`/`command-centre-tab-grouping.test.ts` only cover the pure logic modules, not these `.tsx` files. A future accidental revert of the bg-primary/bg-card tiering wouldn't be caught by `npm run test`.
- **Objective**: real regression coverage over these three files' card-tier logic.
- **User**: whoever next touches Command Centre card rendering.
- **Priority**: P2.
- **Relevant agent**: Lead Engineer.
- **Dependencies**: none.
- **Status**: Ready.

### Move HealthRing off hardcoded text-primary-foreground

- **Problem**: `src/components/analytics/health-ring.tsx` hardcodes `text-primary-foreground` (+ two opacity tiers) instead of inheriting `currentColor`. Not visually broken today (`--card-foreground`/`--primary-foreground` happen to be near-identical near-white values in `.studio-shell`), but it's real token drift — if those two tokens are ever tuned to diverge, this becomes a silent contrast bug with no test to catch it. Found by QA during the 2026-08-27 Command Centre review.
- **Objective**: HealthRing inherits its text color from whatever card it's placed in, correctly, regardless of future token changes.
- **User**: N/A (a correctness/maintainability fix, not user-facing today).
- **Priority**: P2.
- **Relevant agent**: Lead Engineer.
- **Dependencies**: none.
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

_(none yet — completed work before this backlog existed is recorded in
`PRODUCT-ROADMAP.md`'s "Recently completed" instead of being backfilled
here)_
