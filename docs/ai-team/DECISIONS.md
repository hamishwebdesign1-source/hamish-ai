# HamishAI — decisions log

One entry per real product/technical decision worth a future reader knowing
the reasoning behind, not just the outcome. Newest first. Every specialist
agent should add an entry here when they make a call that isn't obvious from
the code alone — the same instinct as this codebase's own inline comments,
just at product-decision scope instead of line scope.

---

## 2026-08-27 — Brought `triage-request.ts` up to the `stripKit()`/`isWellFormed()` defensive-coercion standard

**Decision**: `triage-request.ts` was the only AI tool-call site in the
codebase reading a forced Claude tool result with an unguarded `as
TriageResult` cast and no retry — `missing_info` (meant to be `string[]`)
was read directly via `triage.missing_info?.length`, the exact "field came
back as a bare string" failure mode `research-lead.ts` and
`draft-sales-kit.ts` already defend against. Added `stripTriage()` (coerces
every field: string enums fall back to a safe default —
`category`→`"other"`, `complexity`→`"M"`, `priority`→`"medium"` —
`missing_info` coerces to `string[]` via the same `toStringArray` shape as
`draft-sales-kit.ts`'s `stripKit()`, `covered_by_maintenance` coerces to a
real boolean rather than trusting a truthy value, `suggested_task` is
dropped entirely if every one of its own fields comes back empty) plus
`isWellFormed()` and the same 3-attempt retry loop `draftSalesKit()` uses,
replacing the single unguarded `anthropic.messages.create()` call.

**Why this matters more here than on its siblings**: this is the one AI
call site whose output (`draft_response` specifically) can flow straight
into an unsupervised, zero-human-review client email send
(`isAutoSendEligible` → `sendClientEmail`) — currently gated to
`sender.isInternal` (HamishAI's own org) only, but the single most
autonomous write path in the product was also the one with the weakest
defensive treatment on its input. `missing_info.length` deciding
`awaiting_info` vs `triaged` status directly determines which branch of
that logic runs, so a bare-string `missing_info` wasn't just a rendering
bug — it could `.length` on a string (character count, not "did we ask a
question") and mis-route status.

**Scope discipline**: did not touch `sender.isInternal`, the
`isAutoSendEligible` confidence/eligibility thresholds, or any other
business logic — this is the same coercion-only scope as the prior
`stripKit()` fix (see `BACKLOG.md`'s Complete section). Added
`triage-request.test.ts` (15 tests) mirroring `draft-sales-kit.test.ts`'s
own test shape, including the exact "bare string instead of array"
regression case.

## 2026-08-27 — Set up the AI product team; corrected `docs/ARCHITECTURE.md`

**Decision**: Built a 7-agent specialist team (`.claude/agents/`) plus a
`/mission` orchestrator skill and this shared-memory folder, rather than
one general-purpose agent handling everything.

**Why**: A single agent doing strategy, design critique, implementation, and
QA on the same turn tends to rubber-stamp its own work — "the code works,
therefore we're finished" without a genuinely separate pass asking "is this
actually good?" Separate specialists with separate system prompts (and
explicit instructions to *not* automatically agree) give a real review
chain instead.

**Also found and fixed while setting this up**: `docs/ARCHITECTURE.md`
explicitly stated *"There is deliberately no `organisations` table separate
from `clients`"* — no longer true. The entire `/studio` Agency Platform
layer (multi-tenant orgs, platform billing, Command Centre, 13 cron jobs
not 5) had been built with no corresponding update to this file. Corrected
in place rather than left to keep misleading the next reader (human or
agent). `docs/RUNBOOK.md` has the same class of drift (still describes 5
cron jobs) and has not yet been fixed — flagged in
`PRODUCT-ROADMAP.md`'s "known real gaps."

**Not built**: standalone Market/Competitor Research and Content/Marketing
agents — no real recurring workload for either yet (see
`docs/ai-team/README.md`'s team table). Revisit if one shows up.
