# Architecture

Written once at the end of the production-hardening roadmap (Phases 0–4), not
regenerated per phase — the three decisions below are the ones worth a new
contributor (or future you) reading before touching the client portal or
billing code.

**2026 update — the Agency Platform layer.** Everything below this line was
true when written, but one line in "The client / membership model" no longer
is: *"There is deliberately no `organisations` table separate from
`clients`"* — that decision was reversed. `/studio` (the Agency Platform) now
exists on top of everything below, multi-tenant, and it's real product
surface, not a plan. See "The Agency Platform layer" section below for what
changed and why the rest of this document is still accurate underneath it.
This correction exists because this file drifted out of date silently for a
long stretch — the whole point of `docs/ai-team/` (see `docs/ai-team/README.md`)
is to make sure that doesn't happen again.

## The two-systems split

There are two visually similar but fundamentally different "analytics"
surfaces on this site, and confusing them is the single easiest mistake to
make in this codebase:

| | `/analytics` | `/portal/insights` |
|---|---|---|
| Audience | Prospects, on the public marketing site | A signed-in client, about their own account |
| Data | 100% illustrative — every number in `analytics-data.ts` is invented to look like a plausible small-business dashboard | 100% real — every number in `portal-insights-data.ts` is computed from that client's actual `requests`/`invoices`/`site_checks` rows |
| Auth | None — public page | Supabase Auth magic link, one client's own data only |
| Purpose | Show what the product *could* show, as a sales aid | Be the product |

Both were deliberately kept — see the Phase 1 audit's "two-systems finding."
`/analytics` is an honest sales demo (it says so on the page); it was never
meant to become the real product, so it wasn't "upgraded," it was left alone.
The entire roadmap this document closes out (Phases 0–4) was about
`/portal/insights` becoming production-grade instead.

## RLS vs the service-role client

Every table in Supabase has Row Level Security *enabled*. Whether it does
anything depends entirely on which Supabase client made the query:

- **`getSupabaseAdmin()`** (`src/lib/supabase.ts`) — the service-role key.
  Bypasses RLS by Postgres/Supabase design, full stop. Every admin
  Server Action, every cron route, every Stripe webhook uses this. This is
  correct and intentional: those code paths are legitimately privileged
  (Hamish, or Stripe with a verified signature), and RLS policies on these
  tables would be actively wrong if they *did* apply here.
- **`createServerSupabaseClient()`** (`src/lib/supabase-server-auth.ts`) —
  session-scoped, carries the signed-in user's own Supabase Auth JWT. Every
  `/portal/*` page and the copilot API route use this for reads. RLS
  policies (`supabase/schema-*.sql`) are what actually enforce "a client can
  only ever see their own client's rows" here — independent of whatever the
  application code's `.eq("client_id", ...)` filters do or don't get right.
  Both layers are kept deliberately: the explicit filter is what makes the
  code's intent obvious to a reader; RLS is what still protects the data if
  one of them is ever wrong.

**Rule of thumb**: if the code is reachable by a signed-in client (anything
under `/portal`), it must use the session-scoped client for reads. If it's
reachable only by Hamish (`/admin`), a cron secret, or a verified Stripe
signature, the service-role client is correct and RLS is irrelevant to it by
design.

## The client / membership model

A `clients` row is the tenant boundary — every other table (`requests`,
`invoices`, `site_checks`, `tasks`) keys off `client_id` and always has.
What changed in Phase 1 is *who* can sign in as that tenant:

- **`client_members`** (`supabase/schema-client-members.sql`) maps one or
  more people (by email) to one `client_id`, each with a `role`
  (`owner`/`member`) and an `accepted_at` (set on first successful login).
  `clients.email` still exists, but only as the primary/display contact —
  it's no longer what portal access is decided by.
- Portal auth resolves a signed-in session to a client via
  `getPortalMembership()` (`src/lib/portal-membership.ts`), not a direct
  `clients.email` match.
- **Deliberately not built**: self-serve invites. A client can see their own
  team on `/portal/settings` but cannot add or remove anyone — that stays
  admin-only (`/admin/clients/[id]`'s Team members card), consistent with
  this product's consultation-gated model (no self-serve signup or checkout
  anywhere). Worth revisiting only if a client actually asks for it.
- There is deliberately no `organisations` table separate from `clients` —
  `clients` already was the tenant boundary every other table keyed off, so
  Phase 1 added membership on top of it rather than introducing a parallel
  entity and migrating everything onto it.

## Billing

Two billing paths coexist on purpose, not as a migration in progress:

- **One-off invoices** (`create-invoice.ts`) — a human (Hamish) decides to
  bill something and triggers it from `/admin/clients/[id]`. Stays for
  exactly what it's for: work outside a recurring arrangement.
- **Recurring maintenance** (`subscription.ts`) — a real Stripe subscription
  per client, at that client's own custom monthly rate (not one of the
  three marketing-site package tiers — see `subscription.ts`'s own comment
  for why `price_data` rather than a shared catalog `Price`). Replaced the
  original cron-driven flow (`recurring-invoices.ts`, still present as a
  fallback for any client not yet moved onto a real subscription — it
  automatically does less as more clients migrate, rather than needing a
  hard cutover).
- `collection_method: "send_invoice"` throughout, not
  `"charge_automatically"` — most clients don't have a card on file, and
  silently auto-charging one the moment they add it via the Stripe Customer
  Portal (`/portal/billing`) isn't a good default without them expecting it.

## The Agency Platform layer

Everything above this line describes what a `clients` row and a signed-in
`/portal` user are. This section describes what got wrapped *around* that:
`organisations` — every other table above still means exactly what it did,
just now scoped one level down from an org rather than being the whole
universe.

**The model, one sentence**: HamishAI stopped being a single-operator
business running this codebase for itself, and became a platform where
other people's agencies run *their own* single-operator business on the
exact same client/portal/billing machinery — multi-tenant on top of what
was single-tenant.

- **`organisations`** (`supabase/schema-organisations.sql`) is the tenant
  boundary one level above `clients`. Every `clients` row now carries an
  `org_id`; a `clients` row still means exactly what it did before (one of
  *that org's own* clients), it's just no longer implicitly HamishAI's own.
- **`memberships`** (not `client_members` — a separate table, same shape)
  maps a signed-in email to an `org_id` + role, resolved via
  `getOrgMembership()` (`src/lib/org-membership.ts`). This is the org-level
  equivalent of `client_members`/`getPortalMembership()`: one more join
  added on top, not a redesign of what was there.
- **`HAMISHAI_ORG_ID`** (a literal, fixed UUID) is HamishAI's own
  organisation — Hamish's own business runs *as a tenant of its own
  platform*, flagged `is_internal: true` on its `organisations` row.
  `is_internal` orgs are never usage-capped and never billed — every other
  org is a genuine paying (or trialling) customer. Get this distinction
  right before writing any usage/billing logic: check `is_internal` first,
  same as every existing Server Action does.
- **`/studio/(authed)/*`** (13 route folders as of this writing — analytics,
  billing, campaigns, clients, feedback, help, knowledge, prospects,
  projects, requests, settings, website-builder, plus the Command Centre
  home page) is the tenant-facing Agency Platform product itself: an org's
  own agency-running tool. `requireOrgId()` (a small local helper, copied
  per `actions.ts` file rather than shared — an established, deliberate
  convention in this codebase, not an oversight) resolves the signed-in
  session to an `orgId` via `getOrgMembership()`, the same
  session-scoped-client-for-reads / service-role-client-for-privileged-writes
  split as everything else in this document, one level up.
- **Command Centre** (`/studio`'s own home page) is a no-code block-canvas
  dashboard (`src/lib/command-centre-layout.ts`) — an org can add/remove/
  reorder stat cards, section cards, charts (with a real date-range picker),
  freeform text, and CTA blocks. `sanitizeBlocksForWrite()` is the write-path
  validator (never trust a Server Action argument structurally); an AI
  Design Assistant (`command-centre-design-assistant.ts`) can propose layout
  changes via natural language, always through the same validator.
- **Platform billing** (`src/lib/platform-plans.ts`: Starter/Professional/
  Agency) is a *third*, distinct billing layer from the two already
  described above — this is HamishAI charging the **org itself** a monthly
  fee to use the Agency Platform, separate from that org's own clients being
  billed by the org (the "Billing" section above, still accurate,
  unchanged). `usage-limits.ts` meters 10 real AI actions per org per plan
  (`getUsageStatus()`), calendar-month-scoped, fails open on a DB error
  (same instinct as `chat-rate-limit.ts`'s `isRateLimited()`).
- **13 cron jobs** now, not the 5 `docs/RUNBOOK.md` describes — see
  `src/lib/cron-schedule.ts`'s `CRON_SPECS` for the authoritative live list
  (kept consistency-tested against `vercel.json` — see
  `src/lib/cron-schedule.test.ts`). `docs/RUNBOOK.md` needs the same
  refresh this file just got; flagged, not yet done.
- **Discipline established and expected to hold**: every Server Action that
  mutates a row by an id argument either filters `.eq("org_id", orgId)`
  inline or verifies ownership via a preceding scoped `SELECT` before the
  write — the service-role client bypasses RLS entirely, so this
  application-level check is the *only* protection on the write path (RLS
  still protects reads for session-scoped queries). A full sweep of every
  `/studio` Server Action's `.update()`/`.delete()` call found zero gaps as
  of this writing — keep it that way; see `docs/ai-team/DECISIONS.md`.

## Everything else

- **Single-operator admin auth** — one shared password (`ADMIN_PASSWORD`),
  plus a magic-link alternative gated to one address (`ADMIN_EMAIL`). No
  per-operator identity yet; see `docs/second-operator-access-model.md` for
  the groundwork already laid for when that changes.
- **Rate limiting** is Postgres-backed (`schema-rate-limits.sql`), not Redis
  — a deliberate call given this project's traffic, see `chat-rate-limit.ts`.
- **Structured logging** (`structured-log.ts`) covers billing and auth
  routes specifically, not the whole app — see the roadmap's own scope for
  why.
- **Audit log** (`audit_log` table, `/admin/activity-log`) — who did what,
  meaningful only once Phase 1 meant "who" wasn't always just one person.
