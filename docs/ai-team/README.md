# The HamishAI AI product team

This folder is the shared memory for a small set of specialist subagents
(`.claude/agents/*.md`) that operate on this codebase alongside Hamish. It
exists because `docs/ARCHITECTURE.md` and `CLAUDE.md` had drifted quietly out
of date for a long stretch before this was written (see the "2026 update"
note at the top of `docs/ARCHITECTURE.md`) — a team of agents working off a
stale map is worse than no map. Keeping these files current is every agent's
job, not a one-off setup task.

## How to use this

**For a high-level goal** ("I want to significantly improve client
retention," "make the Studio feel like the best AI SaaS platform on the
market"), run `/mission <your goal>`. The mission skill (`.claude/skills/
mission/SKILL.md`) is the orchestrator — it breaks the goal into workstreams,
dispatches the right specialists (in parallel where their work doesn't
depend on each other), and gives you back one concise report. You don't
coordinate the specialists yourself.

**For a specific, already-scoped task** ("audit the Command Centre for
accessibility gaps," "review this Server Action for a security issue"), call
the relevant specialist directly via the Agent tool's `subagent_type`. See
`.claude/agents/` for the full roster and each one's description.

**You (Hamish) remain the decision-maker.** Every agent can research,
analyse, design, write code, test, and recommend — see "Approval boundaries"
below for what still needs your explicit go-ahead.

## The team

| Agent | File | Owns |
|---|---|---|
| Product Director | `.claude/agents/product-director.md` | Strategy, prioritisation, requirements, challenging weak ideas |
| UX/UI Director | `.claude/agents/ux-ui-director.md` | Information architecture, visual design, interaction, accessibility |
| Lead Engineer | `.claude/agents/lead-engineer.md` | Implementation — frontend, backend, DB, architecture |
| AI/Agent Architect | `.claude/agents/ai-agent-architect.md` | AI features, agentic workflows, prompt/tool design, AI cost |
| QA Engineer | `.claude/agents/qa-engineer.md` | Breaking things — functional, visual, regression, accessibility testing |
| Growth & Analytics | `.claude/agents/growth-analytics.md` | Activation, retention, conversion, evidence-based growth ideas |
| Security Auditor | `.claude/agents/security-auditor.md` | Auth, data isolation, payments, secrets — a real SaaS handling money and multi-tenant data earns this as its own specialist, not a side task for Lead Engineer |

Not built as separate agents (per the "don't create unnecessary agents" rule
— fold into an existing specialist if the need shows up for real):
**Market/Competitor Research** (Growth & Analytics can absorb a
competitor-awareness angle when a mission genuinely calls for it) and
**Content/Marketing** (Product Director owns positioning and messaging
judgment; there's no dedicated copywriting workload yet). Revisit if either
becomes a real, recurring workload — see `docs/ai-team/DECISIONS.md`.

## Shared memory files

- **`PRODUCT.md`** — vision, target users, product principles, business model.
- **`PRODUCT-ROADMAP.md`** — current priorities, completed work, strategic initiatives.
- **`docs/ARCHITECTURE.md`** (not duplicated here — it already existed and is
  the real source of truth) — tech stack, data model, the two-billing-layers
  distinction, RLS vs service-role, the Agency Platform layer.
- **`DESIGN-SYSTEM.md`** — tokens, components, UX principles specific to this codebase.
- **`DECISIONS.md`** — a running log of real product/technical decisions and why.
- **`AGENT-LOG.md`** — a running log of what agents actually did.
- **`HANDOFF-FORMAT.md`** — the shape every agent's output takes, so they're interoperable.
- **`BACKLOG.md`** — structured tasks, turned from ideas by the Product Director.

## Approval boundaries

**Safe autonomous actions** — any agent can do these without asking first:
read project files, analyse code, run tests, create/update documentation,
build prototypes, refactor genuinely low-risk code, fix obvious bugs, run QA
passes, commit finished work (this repo's own established convention —
commit proactively, never push without permission).

**Requires Hamish's explicit approval first:**
- Major architecture changes (a new data model, a new billing layer, a new tenancy boundary)
- Any database migration with destructive potential (see `docs/RUNBOOK.md`'s own note: SQL migrations have no automatic down-migration)
- Payment/billing logic changes (Stripe, subscriptions, invoicing)
- Pushing to `main` / production deploys
- Security-sensitive changes (auth, RLS policies, secrets, the service-role/session-client boundary)
- Deleting significant functionality
- Major product-direction changes
- Anything with a real, ongoing infrastructure cost attached

This mirrors the global safety rules already governing this whole
environment (financial actions, destructive deletes, and publishing all
require explicit human sign-off) — the team doesn't get new latitude the
main session doesn't already have; it just organises how multiple
specialists reach the same boundaries.

## Workflows

See `.claude/skills/mission/SKILL.md` for the full mission-decomposition
logic. In short:

- **New feature**: Product Director → UX Director → AI Architect (if
  relevant) → Lead Engineer → QA → Product Director reviews against the
  original problem statement.
- **UI redesign**: UX Director → Product Director sanity-check → Lead
  Engineer → QA → UX Director visual re-review → iterate.
- **Bug**: QA reproduces and characterises → Lead Engineer fixes → QA
  retests → done.
- **Growth opportunity**: Growth & Analytics finds it (evidence-based, not a
  hunch) → Product Director scopes it → the relevant specialists build it →
  Growth & Analytics measures the real result.
- **Review chain** on anything non-trivial: the specialist who built it
  hands off to QA, who hands off to Security (if it touches auth/payments/
  data isolation) and/or UX (if it's user-facing), and Product Director has
  the final word on whether it actually solves the original problem — "the
  code works" is not the same question as "did this solve the problem."

Independent workstreams run in parallel (e.g. UX analysis + technical
analysis + growth analysis can all start at once) — the mission skill
dispatches them together in one turn rather than making everything
sequential by default.
