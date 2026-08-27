# HamishAI — agent handoff format

Every specialist agent ends its work in this shape, whether reporting back
to the orchestrator or to Hamish directly. This is what makes the team
interoperable — the next agent (or Hamish) can read a handoff without
having watched the work happen.

```
OBJECTIVE
What were we actually trying to achieve? One or two sentences — the real
problem, not a restated task title.

FINDINGS
What did I discover? Grounded in the actual codebase/product — file paths,
real numbers, real behaviour observed. Never a claim you didn't verify.
If you looked and found nothing, say that plainly rather than omitting
the section.

RECOMMENDATION
What should happen, and why this over the alternatives you considered.
If you disagree with the original ask, say so here — see "Challenge bad
ideas" below.

IMPLEMENTATION
What did I actually change? File paths, what was added/removed/fixed.
"Nothing yet — this was research/design only" is a valid, honest answer.

RISKS
What could go wrong? What did you not have time/access to verify? Name the
gap rather than implying full confidence you don't have.

NEXT AGENT
Who should pick this up, and with what specific question — not "someone
should look at this," a concrete handoff.

STATUS
One of: Not started / Researching / Ready / In progress / Needs review /
Complete / Blocked.
```

## Rules every agent follows (not just guidelines — hold to these)

1. **Inspect before acting.** Read the real code/data before proposing or
   changing anything. Don't assume a pattern from another codebase applies
   here.
2. **Don't assume.** If something is genuinely unclear or unverifiable in
   the time available, say so — don't fill the gap with a plausible guess
   presented as fact.
3. **Don't break working functionality.** A fix that regresses something
   else isn't a fix.
4. **Don't duplicate existing functionality.** Check `PRODUCT-ROADMAP.md`
   and the actual codebase before building something that already exists in
   a different form.
5. **Prefer simple solutions.** The thinnest thing that's actually real
   over an impressive-looking one that isn't (see `PRODUCT.md`'s
   principles).
6. **Use real data whenever possible.** No invented stats, no fabricated
   "users report," no placeholder content presented as if it were real.
7. **Do not create fake functionality to make a UI look impressive.** A
   feature with no real data behind it says so honestly (see the
   `/analytics` vs `/portal/insights` distinction in `docs/ARCHITECTURE.md`)
   rather than faking numbers.
8. **Test meaningful changes.** `npm run lint`, `npx tsc --noEmit -p .`,
   `npm run test` (or the equivalent scoped `npx vitest run <file>`) before
   calling anything done.
9. **Document important decisions.** Add to `DECISIONS.md` — a decision not
   written down is a decision the next agent (or Hamish, six months later)
   has to re-derive from scratch.
10. **Challenge bad ideas.** Agreeing with everything isn't the job. If a
    request is unnecessary, premature, contradicts a documented product
    principle, or there's a simpler real solution, say so plainly in the
    RECOMMENDATION section — don't quietly build what was asked instead of
    what's actually right, and don't build something you believe is wrong
    without flagging the disagreement first.
