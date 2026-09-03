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

## Studio's background — "Toned Ink" + "Ambient signal" (shipped, pending live visual sign-off)

Hamish picked **Direction 1+2, cool navy** (hue 258) from `BACKLOG.md`'s
"Studio's background" entry over the warm-neutral-ink alternative (hue ~50).
`.studio-shell`'s `--background`/`--card`/`--primary` moved off near-black
(was L0.12/0.16/0.19, chroma 0.025-0.03, hue 260 — read as functionally
black) to `oklch(0.145 0.035 258)` / `oklch(0.19 0.035 258)` /
`oklch(0.225 0.04 258)` — hue now exactly matches `--accent`/`--gradient-blue`,
chroma raised modestly so the surface reads as a deliberate ink-navy rather
than desaturated charcoal, and the deltas between the three tiers widened
(not just uniformly shifted) per the flatness note above.

`.aurora-bg` (a 3-blob radial-gradient mesh off the brand gradient tokens,
previously defined in `globals.css` but applied nowhere in the live
codebase) is now activated on the `.studio-shell` root div
(`src/app/studio/(authed)/layout.tsx`), dark-tuned via a higher-specificity
`.studio-shell.aurora-bg::before` override in `globals.css`: violet dropped
entirely (reserved for the Facet mark, per `globals.css`'s own comment on
`--gradient-violet`), two new low-alpha tokens
(`--gradient-blue-soft-dark` 5%, `--gradient-cyan-soft-dark` 6%, vs. the
16-20% `-soft` tokens tuned for opaque light cards), both blobs
repositioned toward the outer gutters (`circle at 5% 10%` / `95% 15%`, the
only real visible canvas given Studio's opaque `bg-card` cards), and drift
slowed to 45s (was 20s). `bg-primary`/`text-primary-foreground`'s
TodayStrip/`actions_required`-only reservation (above) was not touched —
the glow sits behind the whole shell at `z-index: -1` and is naturally
confined to gutters/margins since every card and the header are opaque.

WCAG contrast re-verified with a real OKLCH→relative-luminance calculation
(not just OKLCH-lightness-delta reasoning): foreground/card-foreground/
primary-foreground vs. their new surfaces land 15.7-17.1:1; `--accent`,
`--destructive`, `--success`, `--warning`, and `--muted-foreground` all
clear 5.5:1+ against both new `--background` and `--card` — comfortably
past AA. **Still outstanding**: a live, authenticated visual check in the
real Browser pane (UX/UI Director) plus a real contrast-checker pass
against actual rendered pixels — see `BACKLOG.md`'s entry, now in "Needs
review," for the full implementation note.

## Page structure — `StudioPageHeader` + one standard content width

- **Every list-page header in Studio is now `StudioPageHeader`**
  (`src/components/platform/studio-page-header.tsx`), not a hand-rolled
  `<h1>`/`<p>` pair. Before the Studio Design Audit's Tier 1 build, this
  pattern was independently duplicated 12 times, each with its own
  content-unjustified max-width (`max-w-2xl`/`3xl`/`4xl`/`5xl`) — the
  reading column visibly jumped width on every nav click, the single most
  "assembled from parts" issue the audit found. `StudioPageHeader` takes
  `title` (string), `description` (string/`ReactNode`, for a description
  containing a link), optional `eyebrow` (string), and optional `actions`
  (`ReactNode`, right-aligned, wraps under the title on narrow screens via
  `flex flex-wrap items-start justify-between gap-4` — Analytics' own
  pre-existing range-switcher/CSV-export row, kept as the reference shape
  rather than reinvented). It renders the exact type scale every page
  already used (`<h1 className="font-heading text-2xl font-semibold
  md:text-3xl">` + `<p className="mt-1 text-sm text-muted-foreground">`)
  so adopting it changed no page's heading size, only its wrapper.
- **Content wrapper: `mx-auto max-w-4xl`, on every page using
  `StudioPageHeader`.** Prospects, Campaigns, Clients, Requests, Projects,
  Knowledge, Analytics, Billing, Settings, Website Builder, and Help &
  Feedback all standardized on this one width — no more page-specific
  `max-w-2xl/3xl/5xl` variant. Analytics was the one page evaluated for
  needing more room (a two-chart `lg:grid-cols-2` row) and `max-w-4xl`
  held up fine there too.
- **Command Centre (`studio/(authed)/page.tsx`) is deliberately NOT built
  on `StudioPageHeader` or `max-w-4xl`** — it's a structurally different
  full-width hero page (its own `text-3xl`/`text-4xl` greeting, not the
  list-page `text-2xl`/`text-3xl` scale; its own stat row, tabs, and
  block canvas), not a list-page header. Its own header comment says so
  explicitly — don't "fix" it into conformity with the other 12 routes.
- **Eyebrow**: before this pass only Command Centre and Website Builder
  rendered one; every other page's header had none, which read as an
  unexplained one-off rather than a real pattern. Resolved by keeping and
  extending it, not dropping it — every page using `StudioPageHeader` now
  passes its real nav-section name (`Grow` for Analytics/Prospects/
  Campaigns, `Build` for Website Builder, `Deliver` for Clients/Requests/
  Projects/Knowledge, `Account` for Billing/Settings/Help & Feedback), per
  `studio-nav.tsx`'s `getNavSections()`. **Correction (post-build review,
  UX/UI Director)**: this was originally justified here as "reinforcing
  the sidebar grouping on the page itself instead of leaving it invisible
  once you've clicked in" — that's only true on mobile, where
  `StudioSidebar` is hidden (`md:flex`) and the drawer nav doesn't show
  group labels inline. On desktop, where the sidebar is always visible,
  the eyebrow duplicates a label already showing one column to the left —
  a real, acknowledged redundancy, not a mistake worth reverting on its
  own (it's cheap, harmless, and genuinely useful on mobile), just not the
  universal win the original wording claimed. Revisit only if a future
  pass has a real reason to touch page headers again.

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
- **"Read as a page, not a form response" — browser-chrome framing for
  AI-generated page content**: `WebsiteMockupPreview`
  (`website-mockup-section.tsx`) renders a prospect's AI-drafted homepage
  copy — text only, no images, no bespoke design, per that file's own
  comment on why (it must never be confused with HamishAI's real
  hand-built concept pages). UX/UI Director pass (2026-09): a three-dot +
  centred-pill bar (the same shape as a real browser tab strip) plus
  distinct hero/body/closing-CTA bands gives it real visual hierarchy
  without inventing any bespoke design. The pill's text is the same
  honest "Homepage preview" label the old flat header bar had — never a
  fabricated domain/URL, which a viewer could screenshot and mistake for
  something real. An `ai` Badge ("AI-drafted") sits in the chrome bar and
  a `text-muted-foreground` caption stays underneath the frame at all
  times ("AI-written homepage copy, shown as a page preview — not a
  designed page") — the honesty label is not something the visual
  upgrade gets to remove. Reuse this browser-chrome shape (dots + a pill
  holding real, honest text, never an invented URL) for any future
  "preview of AI-written page content" surface.
- **Field-provenance tags on a prefilled form** — established for the
  Prospects → Website Builder prefill (`WebsiteProjectWizard`,
  `BACKLOG.md`'s "Prefill the Website Builder discovery form…" entry):
  when a field's starting value came from somewhere other than the user's
  own typing, tag it at the `<Label>`, not the input, using the tier the
  data actually earned rather than one blanket "prefilled" style —
  - **Hard, verified 1:1 data** (a literal DB column carried over, e.g.
    `prospects.business_name`/`category`/`neighbourhood`, or AI-observed-
    from-real-content-and-treated-as-reliable, e.g. `research.services`):
    `<Badge variant="secondary" className="gap-1 text-[10px] font-normal">`
    with a small `Link2` icon, label "Prefilled." Same shrunk-badge
    treatment `onboarding-wizard.tsx`'s locked-plan badge already
    established (`text-[10px] font-normal` on a `secondary` Badge) — reuse
    it, don't invent a new size.
  - **Soft/approximate AI judgement** (e.g. `research.strengths` standing
    in for USPs — a real signal, but an approximation, not a verified
    fact): the `ai` Badge variant (badge.tsx's own "AI Recommendation" /
    "Needs Review" language), label "Needs review." This is the one
    tier where the visual language should look meaningfully different
    from the hard tier, not just reworded — a user should be able to tell
    "trust this" from "please check this" without reading the label.
  - **Nothing upstream covers it**: no tag, no placeholder text implying
    it was considered — renders exactly as it would for a from-scratch
    entry. Never invent a middle state for these.
  - A one-time explanatory banner (`border-accent/30 bg-accent/5`, an icon
    + one line, e.g. "Started from [X]'s prospecting research — fields
    marked Prefilled came from real data on file; everything else is
    blank, same as starting from scratch") belongs once at the top of the
    form, not repeated per field — the per-field tags only need to say
    "Prefilled"/"Needs review," not re-explain the source every time.

## Interaction patterns actually in use

- **Collapsible panel** (used in 5+ places — `CommandCentreLayoutPanel`,
  `ProspectCard`, `ClientCard`, a `requests-panel.tsx` card, the Prospects
  niche-form toggle; also used by the now-retired `ClientsCopilot`, see
  `DECISIONS.md`'s AI-surface-consolidation entry): local `useState` open/closed,
  `aria-expanded={open}` on the trigger, CSS-only hiding (`{open && (...)}`)
  — never unmount-based, so an in-progress draft inside isn't lost when
  collapsed.
- **Confirm-delete**: a `confirmingDelete` boolean state; the resting state
  shows a `Trash2` icon-button; once armed, swap to a destructive "Confirm"
  button plus an `X` "Cancel delete" icon-button. Established in
  `knowledge-panel.tsx`'s `EntryCard`, reused since in `campaigns-panel.tsx`.
  Use this exact shape rather than a browser `confirm()` dialog or a new
  pattern.
- **"AI is working" pending state**: a small `mr-auto`/`w-fit` bubble
  (`rounded-2xl rounded-bl-sm bg-secondary`) containing three
  `size-1.5 animate-bounce rounded-full bg-muted-foreground` dots (staggered
  with `[animation-delay:-0.3s]` / `[animation-delay:-0.15s]` / none) next to
  a `text-xs text-muted-foreground` "Thinking…" label. Established in the
  two chat-style surfaces that originally existed — `studio-assistant-widget.tsx`
  and the now-retired `clients-copilot.tsx` (see `DECISIONS.md`'s
  AI-surface-consolidation entry) — as the reply bubble shown while the
  underlying Anthropic call is in flight, and it's the more polished, more
  widely-used of the treatments that existed before this was written down,
  so it's now the one canonical pattern for "an AI action the user just
  triggered hasn't come back yet." `studio-assistant-widget.tsx` is now the
  only surface rendering it directly (`clients-copilot.tsx` is gone), still
  the reference implementation to copy. `command-centre-layout-panel.tsx`'s AI Design Assistant
  previously used a plain "Thinking…" text swap on its button label instead
  — it now renders this same bouncing-dots bubble beneath the input while
  `aiPending` is true. Use this, not a disabled-button text swap or a bare
  "Thinking…" string, for any new AI-triggered pending state. (Two narrower
  exceptions remain, deliberately not migrated: `studio-command-palette.tsx`'s
  Ask flow shows a `LoaderCircle animate-spin` + "Thinking…" row inside its
  reply bubble instead of dots, and `prospecting-panel.tsx`'s per-row action
  buttons — Research/Generate mockup/Generate sales kit — use
  `LoaderCircle animate-spin` plus an in-progress verb, e.g. "Researching…",
  because those are one-shot button actions with no reply bubble to render
  the dots into, not a chat exchange.)
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
  (e.g. the now-retired `ClientsCopilot`'s toggle) as unlabelled. Verify a suspected
  missing-label finding with direct DOM inspection
  (`getComputedStyle`/`aria-label`/`textContent` on the actual element)
  before treating it as confirmed.
- A CTA block's `href` (Command Centre no-code builder) only ever renders a
  real internal path or an `https://` URL — `sanitizeBlocksForWrite()`
  rejects `javascript:`, `data:`, protocol-relative, and plain `http://`
  outright. Any new place user input becomes a rendered `<a href>` needs
  the same allowlist treatment, not a weaker one.

## A real, honest "0 of N" is not the same as an empty state

Studio already hides a card entirely when there's genuinely nothing to show
(`studio-insights.ts`, Command Centre's section cards, Billing's
"AI-assisted clients" card when `signedThisMonth === 0`) — that's the right
call for "no data exists yet." A different case, first handled properly in
Billing's "AI-assisted clients" card (`billing/page.tsx`,
`src/lib/studio-ai-roi.ts`, 2026-08-31): real activity happened (clients
signed) but the specific thing being measured came back zero (none were
AI-assisted). Hiding that would be dishonest — it's real, current data, not
an empty state. But rendering *only* the bare "0 of N" line, with nothing
else, reads as a verdict ("this isn't working") on a page an agency owner
reads right before a renew/upgrade decision — a real retention risk moment,
not a neutral one. The fix isn't fabricating positivity (no invented
"almost there!" framing) — it's a muted (`text-xs text-muted-foreground`),
factual, actionable follow-up line explaining what would make the number
move (e.g. "generate a sales kit or website mockup earlier in your
pipeline"). Same "no toast, inline text next to the thing" instinct as the
rest of Studio's error/empty-state copy — reframes a genuine zero from a
dead end into a next action, without touching the honesty of the number
itself. Apply this same shape (real zero stays visible + a muted actionable
line, not silence) to any future outcome-tied metric that can legitimately
land on zero while its parent population is non-empty.

## What's deliberately NOT built yet

Don't propose these as "obviously missing" without checking `PRODUCT.md`'s
principles first — several gaps are intentional pending real justification:
budget/spend tracking on Campaigns, a feedback board/admin review UI (one
inbound textarea only, no volume yet to justify more), self-serve portal
invites for a client's own team.
