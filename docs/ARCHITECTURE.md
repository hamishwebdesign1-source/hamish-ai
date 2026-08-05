# Architecture

Written once at the end of the production-hardening roadmap (Phases 0–4), not
regenerated per phase — the three decisions below are the ones worth a new
contributor (or future you) reading before touching the client portal or
billing code.

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
