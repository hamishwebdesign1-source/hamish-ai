# HamishAI — design system

Real, established conventions from the actual codebase — not an aspirational
spec. The UX/UI Director keeps this current; every visual/interaction change
should either follow what's here or update this file to reflect a
deliberate, reviewed change (not silent drift).

## Tokens

- `src/app/globals.css` — the whole palette as OKLCH custom properties
  (`:root` / `.dark`), including brand gradient tokens (`--gradient-blue`,
  `--gradient-cyan`, `--gradient-violet`) used by `.gradient-text` /
  `.gradient-button` / `.aurora-bg`. Change brand colour here, never
  per-component.
- **Tailwind v4 + Lightning CSS silently drops any rule using `color-mix()`**
  — no build error, it just vanishes. Use precomputed `oklch(... / X%)`
  alpha values instead.
- **`bg-primary`/`text-primary-foreground` is reserved for exactly the
  single most-important surface per context, never "every card on this
  page."** The Command Centre originally applied it to all 7-8 blocks in
  a row — TodayStrip, all 5 stat cards, the onboarding checklist, and
  all 9 section cards — on the theory that Business Health's one
  deliberate dark-card moment should become the whole page's style. In
  practice `.studio-shell`'s `--background`/`--card`/`--primary` sit
  only 0.04-0.07 OKLCH lightness units apart (globals.css), so that
  read as one flat visual tier: "your most urgent action right now"
  (Actions Required) and "a nice-to-know metric" (the Business Health
  breakdown) rendered as identical cards, with nothing anywhere on the
  page actually reading as the featured surface. Fixed in the UX/UI
  Director's 2026-08 audit — `bg-primary`/`text-primary-foreground` now
  belongs to exactly two Command Centre surfaces: TodayStrip
  (today-strip.tsx) and the `actions_required` section card
  (command-centre-section-cards.tsx) — the two things genuinely meant to
  say "look here first." Every other card (the 5 stat cards, the
  onboarding checklist, the other 8 section cards, chart/text/cta
  blocks) uses plain `bg-card`/`text-card-foreground` instead, same as
  every other Studio card (clients-panel.tsx, campaigns-panel.tsx) —
  with `text-muted-foreground` in place of the old
  `text-primary-foreground/NN` opacity tiers for de-emphasised text, and
  `bg-secondary` in place of `bg-white/10` for icon-badge/progress-track/
  pill backgrounds. Before reaching for `bg-primary` on a new Command
  Centre card, ask whether it's genuinely more important than everything
  else on the page — if not, it's a `bg-card`.

## Components

- `src/components/ui/*` — shadcn/ui built on **Base UI**, not Radix.
  Polymorphism uses a `render` prop (`<Button render={<Link href="/x" />}>`),
  not `asChild`. `Button` takes `nativeButton`, defaulting to `!props.render`
  — don't hardcode without checking that default.
- **Button sizes actually in use**: `icon` = `size-8` (a real 44×44-ish
  touch target once padding/border are counted), `icon-xs` = `size-6`
  (compact — used inline in dense rows like a campaign's assigned-prospect
  list, not as a page's primary action). Every icon-only button needs
  `aria-label` — this was audited and fixed once already (5947a4a); don't
  let it regress.
- Verify a `lucide-react` icon name exists before using it
  (`node_modules/lucide-react/dynamicIconImports.d.ts`) — several expected
  names don't exist in the installed version (no `Concierge`, use
  `ConciergeBell`; no `BarChart3`, use `ChartColumn`).

## Interaction patterns actually in use

- **Collapsible panel** (used in 6+ places — `CommandCentreLayoutPanel`,
  `ClientsCopilot`, `ProspectCard`, `ClientCard`, a `requests-panel.tsx`
  card, the Prospects niche-form toggle): local `useState` open/closed,
  `aria-expanded={open}` on the trigger, CSS-only hiding (`{open && (...)}`)
  — never unmount-based, so an in-progress draft inside isn't lost when
  collapsed.
- **Confirm-delete**: a `confirmingDelete` boolean state; the resting state
  shows a `Trash2` icon-button; once armed, swap to a destructive "Confirm"
  button plus an `X` "Cancel delete" icon-button. Established in
  `knowledge-panel.tsx`'s `EntryCard`, reused since in `campaigns-panel.tsx`.
  Use this exact shape rather than a browser `confirm()` dialog or a new
  pattern.
- **Optimistic local state on a toggle** (e.g. campaign status, task
  status): update local state immediately, call the Server Action inside
  `useTransition`, roll back local state if it returns an error. Used
  consistently for anything that's a simple flip rather than a multi-field
  form. Verified live in 4 places (`CampaignCard.toggleStatus`,
  `ProjectCard.toggleDone`, `TaskRow.setTaskStatus`,
  `TaskRow.setTaskProject`) — **all 4 roll back completely silently today**,
  with no message or highlight when the revert happens. That's a real,
  already-shipped instance of "an optimistic update that fails silently is
  worse than the round trip it replaced" — flagged in
  `BACKLOG.md`'s `useOptimistic` scoping note (2026-08-31) as something any
  future touch of these controls should fix, not just preserve. The
  Prospects page (`prospecting-panel.tsx`) has the opposite gap — several
  status actions (`ContactTrackingControl`, `PipelineStageControl`) have no
  local optimism at all, not even the hand-rolled version; see that same
  scoping note before building `useOptimistic` anywhere in Studio.
- **No toast/notification primitive exists in this codebase** — confirmed
  via `src/components/ui/*` (no toast/sonner file) and `package.json` (no
  toast library installed). The real, established error-surfacing
  convention is an inline `text-destructive` line rendered next to the
  control that failed (`InvoiceForm`, `ContactTrackingControl`,
  `PipelineStageControl`, `CampaignCard`'s delete-confirm state, etc.) — use
  that, not a new toast system, for any new error/rollback state.
- **Home-page tabs vs. a long scroll**: `command-centre-tab-grouping.ts`'s
  `blockTab()` is a pure classifier deciding which of 4 tabs
  (Overview/Prospects/Clients/Performance) a block renders under — a
  presentation-only grouping on top of the Command Centre's own
  block-canvas order, not a second source of truth for layout.

## A real, considered non-pattern

Not every long page should become tabs just because one page did. The
Prospects page (`prospecting-panel.tsx`) was evaluated for the same
tabs treatment the Command Centre got, and rejected — most of its length is
legitimate, unrelated sub-components (one setup form, one search tool, one
list), not several parallel content types competing for space the way the
Command Centre's stat/section cards did. It got a collapsible niche-form
toggle instead. Match the *shape* of the problem, not the most recent
solution.

## Accessibility baseline (already audited once, keep it clean)

- Every icon-only interactive element needs `aria-label`.
- Every collapsible trigger needs `aria-expanded`.
- A bare `<select>` with no visible `<label>` needs `aria-label` too — the
  UX/UI Director's 2026-08 audit found three: the status-filter and
  sort-by selects in the Prospects list toolbar (`prospecting-panel.tsx`)
  and the "Add a prospect…" select inside a campaign's
  `AddProspectControl` (`campaigns-panel.tsx`). All three now have real,
  specific labels ("Filter by status", "Sort prospects by", "Add a
  prospect to this campaign") rather than relying on placeholder option
  text a screen reader won't announce as the control's name. A follow-up
  live-DOM check (2026-08, via an authenticated session's own browser
  tools, not static reading) found two more in `requests-panel.tsx` —
  the task→project assignment select and the request→website-project
  picker — now labelled "Assign task to project" and "Choose website
  project" respectively. Sweep every `<select>` when auditing this again,
  not just the files touched by the most recent change.
- A visible-text button whose label conditionally hides at a breakpoint
  (e.g. `<span className="hidden sm:inline">Search</span>` inside
  `StudioCommandPaletteTrigger`) loses that text from its accessible name
  below the breakpoint — CSS `display: none` removes it from the
  accessibility tree, `textContent` alone doesn't reveal this (verified
  via `getComputedStyle` on the actual live DOM, not the text content
  API). Give the button its own unconditional `aria-label` rather than
  relying on visible text that might not always be visible.
- `read_page`'s interactive-element scan is not reliable for auditing
  accessible names — it reported buttons with real, correct visible text
  (e.g. `ClientsCopilot`'s toggle) as unlabelled. Verify a suspected
  missing-label finding with direct DOM inspection
  (`getComputedStyle`/`aria-label`/`textContent` on the actual element)
  before treating it as confirmed.
- A CTA block's `href` (Command Centre no-code builder) only ever renders a
  real internal path or an `https://` URL — `sanitizeBlocksForWrite()`
  rejects `javascript:`, `data:`, protocol-relative, and plain `http://`
  outright. Any new place user input becomes a rendered `<a href>` needs
  the same allowlist treatment, not a weaker one.

## What's deliberately NOT built yet

Don't propose these as "obviously missing" without checking `PRODUCT.md`'s
principles first — several gaps are intentional pending real justification:
budget/spend tracking on Campaigns, a feedback board/admin review UI (one
inbound textarea only, no volume yet to justify more), self-serve portal
invites for a client's own team.
