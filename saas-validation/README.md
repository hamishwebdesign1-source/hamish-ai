# SaaS pilot validation (Phase 0)

Status: active, no code changes tied to this yet. This is the manual, pre-build test
of whether HamishAI's prospecting/research engine works for someone other than
Hamish, in a niche other than Edinburgh/Central Belt local SMB web design.
Full context: see the HamishAI Studio diligence report (published artifact,
17 Aug 2026), Section 19.

## Decision rule

By end of week 4: fewer than ~5 people paying real money for a pilot means stop
and rethink the offer before touching any multi-tenant code. Five or more, with
at least one pilot converting outside the known niche below, means the
`organisations`/`memberships` schema (Section 9/18 of the report) is the correct
next build.

`pilot-tracker.csv` in this folder is the running log. One row per person
contacted, not per message sent.

## The two niches being tested

**Niche A — known/control.** Central Belt Scotland local SMBs (restaurants,
trades, salons, hotels, gyms, retail, professional services), sold as a
one-off "find + pitch" package. This is the same shape of business Hamish
already runs, so a pilot converting here proves the *offer* works, not that
the *engine* generalises.

**Niche B — untested, the real test.** Independent accountants/bookkeepers
and small professional-services firms, sold as a recurring "AI business
analytics" angle rather than a one-off redesign (Model B from the report,
not Model A). Chosen because it changes two variables at once on purpose —
a vertical Hamish has no personal track record in, and a subscription-first
offer rather than a one-off — which is closer to what an actual SaaS
customer would attempt on day one. Swap this niche for a different one if a
better opportunity shows up in outreach; the point is "not Edinburgh web
design," not this specific vertical.

## The pilot offer

Fixed price, dated, with a refund condition so a stranger can say yes to a
first-time offer:

> For £150 to £250, I'll spend two weeks finding you 15 to 20 qualified
> prospects in [their niche], with a personalised outreach email and call
> script for each one, ready to send. If it doesn't produce at least two
> real conversations, you get it back.

Deliberately **not** "sign up for the platform" — there is no self-serve
product yet. This is a hand-delivered service pilot, run manually inside the
existing single-tenant admin, standing in for the product until Section 19's
decision point is reached.

## Where to pitch it

Reddit (r/agency, r/entrepreneur, r/smallbusiness, r/freelance), a couple of
active "start an agency" Discord/Skool communities, and direct LinkedIn
outreach to people already posting about starting or running a local-service
or consulting business. Not cold strangers with no stated intent.

## Outreach templates

Adapt the bracketed detail to the actual person and thread; never send one of
these verbatim to more than one person.

**Reddit / community DM, replying to a real post**

> Hi [name]. Saw your post about [specific thing they said]. I run an AI
> consultancy and I've built a system that finds businesses with a specific,
> checkable weakness, then writes tailored outreach for each one. I'm
> testing it in a couple of new niches this month. If you're trying to land
> clients in [their niche], I'll run it for you for £150 to £250 over two
> weeks, prospects and outreach drafts included, money back if it doesn't
> produce at least two real conversations. Interested?

**LinkedIn, colder but still specific**

> Hi [name], I noticed you're [building/running] [their business]. I built
> an AI research pipeline that finds local prospects with a specific,
> provable gap and drafts the outreach for each one automatically. I'm
> looking for two or three people outside my usual niche to test it with
> this month, £150 to £250, refunded if it doesn't produce real
> conversations. Would that be useful for [their niche]?

**Follow-up if no reply after 4 to 5 days**

> Following up in case this got buried. Still have room for one more pilot
> this week if useful, happy to send an example of the kind of research
> output first so you can see it before deciding.

## Delivering a pilot (once someone says yes)

1. Get their niche and rough target geography.
2. Run the existing weekly-discovery pattern by hand for that
   category/area (same process as `leads/README.md`, just pointed at their
   niche instead of Hamish's).
3. Run the existing research pass (`research-lead.ts` pattern) and sales-kit
   generation (`draft-sales-kit.ts` pattern) per qualified lead.
4. Hand over the list plus drafts. Log the delivery date and who did the
   work in `pilot-tracker.csv`.
5. Follow up after 1 to 2 weeks to ask whether any of it turned into a real
   conversation. **This number is the one that actually matters** — not
   whether they liked the list.
