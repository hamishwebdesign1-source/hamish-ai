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
  form.
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
