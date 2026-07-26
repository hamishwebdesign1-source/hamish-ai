# Second-Operator Access Model — Groundwork Note

Status: **Not implemented.** This is a design decision made ahead of time, per the
Phase 2 roadmap item addressing RISK-02 (single-operator bus factor) — so that if
a second operator is ever needed, the shape of the change is already decided
rather than improvised under pressure.

## Why now, build later

Building multi-user access today would add real complexity (role storage, a
second identity type, permission checks scattered across every admin action)
for a need that doesn't exist yet. The value right now is simply *knowing*
what the change would look like, so it's a scoped, bounded piece of work
whenever it's actually needed — not an open-ended one.

## Proposed roles

| Role | Sees | Can act on | Cannot |
|---|---|---|---|
| **Owner** (Hamish, today's sole operator) | Everything | Everything, including billing and Google/Stripe configuration | — |
| **Operator** (a second person doing day-to-day client work) | All clients, requests, tasks, leads | Triage, task updates, knowledge base, lead outreach | Create/void invoices, view/change API keys, admin magic-link config |
| **Viewer** (e.g. a bookkeeper, reviewing billing only) | Invoices and payment status only | Nothing (read-only) | Everything else |

This mirrors the RACI matrix in the BA pack's Section 24 (Business Owner is
Accountable throughout; an Operator would take over some Responsible rows —
task completion, lead follow-up — while Accountable stays with the Owner).

## Minimal shape of the implementation, when it happens

- **Identity**: reuse the existing Supabase Auth magic-link mechanism already
  built for the client portal and admin passwordless login, rather than a new
  auth system. The admin callback route (`/api/internal/admin-callback`)
  already exists — it just needs to check a role lookup instead of a single
  hardcoded `ADMIN_EMAIL`.
- **Data model**: one new table, `admin_users` (email, role, added_at), checked
  by the middleware and by each Server Action, in place of today's single
  shared `ADMIN_COOKIE_NAME` check.
- **No changes needed** to the client portal, the public site, or any of the
  automation (triage, billing, monitoring) — this is purely about who can open
  the admin console and what they can click once inside it.

## What this deliberately does not cover

- Client-facing changes — clients are unaffected either way.
- Audit logging of who-did-what — worth adding at the same time as roles, but
  out of scope for this note; flagged here so it isn't forgotten when the work
  actually starts.
