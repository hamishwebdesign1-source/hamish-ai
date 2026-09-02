# HamishAI — SEO & AI Search Visibility Strategy

Written 2 Sep 2026, as a live technical audit and implementation pass against
`hamishai.org` (both the deployed site and its source in this repo). Every
finding below was verified directly — either by reading the actual code, or
by inspecting the live rendered page (meta tags, `<script type="application/
ld+json">` count, canonical links, robots meta) via a real browser session
against production. Nothing here is estimated traffic, invented search
volume, a guessed ranking position, or a fabricated competitor metric — per
the audit's own rules, and because a false "current state" makes every
downstream recommendation worthless.

**Context that shapes this whole document**: mid-audit, the homepage moved
from the Edinburgh consultancy pitch to the Agency Platform pitch (the
consultancy content is archived, not deleted, at `/agency` — still real,
still running). Every scoring/strategy section below assumes the Platform is
now the primary entity `hamishai.org` represents.

---

## Current scores

Self-assessed against verifiable criteria only (real code, real live-page
checks) — not a tool output, since no external SEO tool was run. Where a
score depends on data this session can't see (actual Search Console
impressions, real backlink count, live keyword rankings), that's stated
explicitly rather than guessed.

| Area | Score | Basis |
|---|---|---|
| Technical SEO | 7/10 | robots.txt, sitemap.xml, canonicals, and structured data all now exist and are verified live-working (they didn't exist at the start of this audit). Core Web Vitals / real page-speed numbers unverified — no Lighthouse/PSI run in this session (see "What still needs to be done"). |
| AI Search / GEO | 6/10 | Real Organization/WebSite/Product/Service/FAQPage/Person schema now live. AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) explicitly allowed in robots.txt. Entity description is now consistent and specific. Ceiling on this score until real third-party citations exist (see Off-Page Authority). |
| Content | 6/10 | Genuinely distinctive, first-hand, non-templated copy throughout (the "See it working before you pay" positioning, the real NatWest/business-analyst background, honest "illustrative data" disclosures) — a real strength, not generic AI-agency filler. Gap: almost no long-form content exists beyond the core marketing pages — no blog, no guides, no comparison pages (see Content Roadmap). |
| Authority | 2/10 | No verifiable backlinks, no third-party mentions, no directory listings found in this session. This is the site's weakest dimension and the one code changes can't fix — see Off-Page Authority Strategy. |
| UX / Conversion | 8/10 | Strong, consistent CTAs, honest disclosure patterns (illustrative-data labels, "concept portfolio" framing), a working free-prototype/free-trial funnel on both halves of the site. Not independently re-audited in this pass beyond what the SEO work touched. |

**Google SEO** and **Technical SEO** are reported together above as
"Technical SEO" — a real ranking-position score for "Google SEO" specifically
can't be assigned without Search Console data this session doesn't have
access to.

---

## Technical SEO — issues found and status

| Issue | Verified how | Status |
|---|---|---|
| No `robots.txt` | Live: `/robots.txt` 404'd on production | **Fixed** — `src/app/robots.ts` |
| No `sitemap.xml` | Live: `/sitemap.xml` 404'd on production | **Fixed** — `src/app/sitemap.ts` |
| Zero structured data anywhere | Live: `ld+json` script count was 0 on every page checked; source-wide grep confirmed | **Fixed** — Organization/WebSite (sitewide), Product (`/`), Service+FAQPage (`/services`), FAQPage (`/`, `/services`), Person (`/about`) |
| No canonical tags anywhere | Live: `link[rel=canonical]` was `null` on every page checked | **Fixed** — all 12 static pages + the dynamic portfolio route |
| 7 `opengraph-image.tsx` files misplaced (wrong folder, not colocated with their page) | Live: `/about`'s `og:image` was resolving to the generic root image, not its own | **Fixed** — moved into the correct route-group folders |
| 27 fictional demo/concept pages indexable by default | Live: no meta-robots tag on `/demo/the-gannet` | **Fixed** — noindex, still-followable layouts |
| 6 of 8 homepage images had empty `alt` | Live DOM check | **Fixed** |
| `/about`'s LinkedIn link didn't match the site's real one used everywhere else | Source grep | **Fixed** |
| `organisations.name` (unrelated to marketing SEO, but same audit) fed an email `From` header with no control-character stripping | Source read | **Fixed** (separate, already-shipped commit this session) |
| 2 meta descriptions ran past Google's ~155-160 char truncation point (`/analytics` 186 chars, `/ai-solutions` 159) | Parsed every page's real metadata export, measured length | **Fixed** — both trimmed, no real content dropped |
| `/analytics` has a real, visible 5-question FAQ accordion the first FAQPage schema pass missed | Source grep for every `AccordionItem` usage across `(site)` | **Fixed** — `FaqJsonLd` added |
| No `og:type`/`og:site_name`/`og:locale` anywhere — `openGraph` was never set in this codebase | Live meta-tag dump on `/about`; source-wide grep for `openGraph` | **Fixed** — set once in `(site)/layout.tsx`, applies sitewide |
| `<html lang="en">` under-specified a consistently British-English site | Source read | **Fixed** — now `en-GB`, matching the new `og:locale` (`en_GB`) |
| 2 more empty `alt=""` on `/portfolio`'s case-study preview images | Source read | **Fixed** |
| 4 `<nav>` landmarks sitewide had no `aria-label`, only Breadcrumbs did | Source read across site-header.tsx, site-footer.tsx | **Fixed** — `aria-label="Primary"` / `"Footer"` added |
| `site-footer.tsx` never got the Platform-vs-consultancy contextual nav split `site-header.tsx` already had — kept showing the consultancy's 6-link nav on the new Platform-first homepage | Live DOM dump of both `<nav>` elements on `/` | **Fixed** — converted to a client component, same `isPlatformContext` split, extracted into a shared `usePlatformContext()` hook so header/footer can't drift again |
| Homepage's "complete journey" section was entirely hand-built CSS/div mockups (`JourneyExplorer`), not real product screenshots — confirmed via source read, no `next/image` anywhere in it | Direct user feedback ("feels very amateur") + source read | **Fixed** — replaced with `StudioTour`, a real 6-step, clickable screenshot tour captured live from the actual signed-in Studio account |
| Sitewide Organization JSON-LD `description` was Platform-only copy (`siteConfig.description`), rendered unchanged on `/agency` — an AI system or crawler reading `/agency` saw an entity description describing a different business than the page it was on | Live JSON-LD dump on `/agency` (`hamishai.org/agency`) | **Fixed** — description decoupled from `siteConfig.description`, now a page-agnostic description accurate on every page it renders on |
| Homepage had no `og:image`/`twitter:image` at all (not just stale — completely absent) — it was the only `(site)` page relying on the root fallback, which `(site)/layout.tsx`'s own `openGraph` object (no `images` field) silently shadows | Live meta-tag dump on `/` — zero `og:image`/`twitter:image` tags present | **Fixed** — homepage got its own dedicated `opengraph-image.tsx`, matching every sibling page's existing pattern; root fallback's stale Edinburgh copy also updated (the accurate version moved to `/agency`'s own dedicated file) |
| **Partially checked**: mobile usability — real device/viewport pass done on the homepage (no horizontal overflow, no WCAG 2.2 AA contrast failures, no tap-target violations once the AAA-only 44px bar is corrected to the actual AA 24px one) | Live DOM checks (overflow, contrast ratio, target size) via a real 375px viewport | **Not yet done**: the same pass on other key pages (services, about, portfolio); real screenshots inside the homepage's Studio Tour become small/hard-to-read at mobile width — a real UX observation, but out of this audit's technical-SEO scope to fix |
| **Not yet checked**: Core Web Vitals / real page-speed numbers | — | Needs a real Lighthouse or PageSpeed Insights run against the live URL — not something verifiable from source alone |
| **Not verified**: whether Google has actually crawled/indexed the new sitemap yet | — | Needs Search Console — submit the sitemap there (see 30-day plan) |

---

## AI Search / GEO audit

**Can an AI system currently understand what HamishAI is?** Before this
audit: poorly — no structured data at all, and the entity description was
split across an Edinburgh-consultancy framing (root metadata) and a Platform
framing (`/platform`'s own metadata) with nothing tying them together as one
entity. After this audit: the Organization schema (`organization-json-ld.tsx`,
rendered sitewide on every marketing page) gives one consistent, reusable
entity definition:

> **HamishAI = the infrastructure for running an AI service agency** —
> prospecting, AI analysis, outreach, and client delivery in one workspace,
> built by a Technology Business Analyst (Hamish McFarlane) who runs a real
> AI consultancy on the same system.

That's now the entity every schema block, every page's metadata, and the
homepage's own H1 agree on. This is the single highest-leverage GEO fix
available in a codebase-only pass — an AI system extracting facts from
`hamishai.org` no longer has to reconcile two different stories about what
the company is.

**What's genuinely strong for GEO already** (found, not built, in this
audit): the site already uses an inverted-pyramid structure in most of its
FAQ answers — a direct answer first, then the reasoning ("ChatGPT doesn't
remember which prospects you already researched... What you're paying for is
the assembled system, not model access" — answer, then why). That's exactly
the shape an AI Overview or a Perplexity citation wants to lift. The FAQPage
schema added in this audit makes that structure machine-readable, not just
reader-friendly.

**What's still missing for GEO** (not fixed in this pass — real, larger
work):
- No dedicated, citable "what is an AI agency" / "how does AI lead
  generation work" definitional content — an AI system answering a broad
  question about the category has nothing on this domain to cite yet
  (see Content Roadmap).
- No comparison content ("HamishAI vs. building it yourself with
  Zapier/n8n," "HamishAI vs. a $10k AI agency course") — a genuinely
  strong, honest angle given what the competitor research below found,
  and currently unwritten.
- No case study with a real, named, third-party-verifiable result yet
  (the NatWest platform numbers on `/about` are real and specific —
  10,600+ engineers, 6,000+ identified — but that's a past-employer
  project, not a HamishAI client result; there isn't one of those to cite
  yet, and the audit's own rules forbid inventing one).

---

## Entity strategy

One entity, two products, stated consistently everywhere:

```
HamishAI
├─ Agency Platform (the product) — hamishai.org (homepage) + /studio
│  → "Infrastructure for AI service agencies: prospecting, AI analysis,
│     outreach, client delivery, in one workspace."
└─ HamishAI Consultancy (the proof) — hamishai.org/agency
   → "Edinburgh AI transformation for small businesses — the same system,
      running for real, since [date]."
```

Every page's schema, metadata, and visible copy should trace back to this
same two-line definition rather than drifting into new phrasing per page —
already true after this audit's fixes (Organization schema, root metadata,
and `siteConfig.description` were the three places this could disagree, and
now match).

---

## Schema strategy

Implemented, real, matching visible content exactly (see individual files
under `src/components/seo/`):

| Schema | Page(s) | What it claims |
|---|---|---|
| `Organization` + `WebSite` | Every marketing page (sitewide, in `(site)/layout.tsx`) | Company identity, founder, contact, sameAs |
| `Product` + `AggregateOffer` | `/` (homepage) | The 3 real Platform pricing tiers, live from `platform-plans.ts` |
| `Service` (as `ItemList`) | `/services` | The 4 real consultancy packages, live from `site-config.ts` |
| `FAQPage` | `/`, `/services` | Real, already-visible FAQ content, verbatim |
| `Person` | `/about` | Hamish McFarlane's real, stated background |
| `BreadcrumbList` | `/portfolio/[slug]` | Real, visible Home > Portfolio > [Case Study] trail — added alongside the UI itself (`src/components/breadcrumbs.tsx`), not schema-only |
| `ItemList` | `/portfolio` | The 5 real case studies, live from `case-studies-data.ts` |

**Deliberately not added** (per the audit's own "don't add schema for
information that isn't actually present" rule):
- `AggregateRating` / `Review` — no real reviews exist anywhere in this
  codebase to cite.
- `SoftwareApplication` on `/` — `Product` was the more defensible choice;
  `SoftwareApplication` schema expects fields (operatingSystem, real install
  counts) this codebase has no honest way to fill in.
- `Article` — nothing on the site is currently structured as an article
  (see Content Roadmap; once blog/guide content exists, this becomes
  relevant).

---

## Internal linking strategy

Current real structure (verified from actual `<Link>`/`<a>` usage, not
assumed):

```
/ (Platform, homepage)
├─ links to: /analytics ("See it running HamishAI itself"), /platform/signup,
│  /studio, /book, plus its own real in-page nav now (siteConfig.platformNav
│  — How it works / Pricing / FAQ, anchors on this same page — fixed live,
│  0e8f23a, after the main nav was reported still showing all 6 consultancy
│  links here, a real IA mismatch)
├─ linked from: the header's contextual CTA/muted link, and every
│  external bookmark to the old /platform URL (301 redirect)

/agency (archived homepage, still real)
├─ links to: /portfolio/*, /ai-solutions, /analytics, /services,
│  /website-audit, /contact
├─ linked from: header's muted "Launch an AI agency" link points the
│  OTHER way (from here to /) — /agency itself has no inbound nav link
│  from siteConfig.nav either; it's reached by direct visit or the
│  header's own logic

/services, /ai-solutions, /analytics, /portfolio, /about, /contact
├─ all in siteConfig.nav — the real primary consultancy nav, unchanged
├─ cross-link to each other already (Services → Growth Partnership,
│  homepage teaser → /analytics, etc.)
```

**Done** (both closed in the follow-up pass, `bb4834f`):
1. `/agency` now links back to `/` in its own copy — "That system is also
   what we sell — see the Agency Platform."
2. `/` now links to `/about` next to the existing "See AI Business
   Analytics" link — "Built by a Technology Business Analyst — read more."

**Still recommended** (genuine content-strategy work, not a code fix):
- Once the Content Roadmap items exist, every pillar/supporting-page
  relationship listed there should link both ways — pillar → supporting,
  supporting → pillar — not just downward.

---

## Competitor landscape — real, sourced, not fabricated

Researched live (via web search) rather than assumed from training data,
since the audit's own rules forbid inventing competitor performance. No
traffic/ranking/revenue numbers are claimed for any of these — only their
own public positioning.

- **[GoHighLevel](https://customgpt.ai/white-label-ai-platform/)** — the
  closest broad competitor: a white-label agency platform (CRM, funnels,
  SMS, calendars) with an AI add-on layer. Much broader scope than HamishAI
  (general marketing-agency tooling, not AI-agency-specific), and not
  built around AI-driven local-business discovery/scoring the way
  HamishAI's Prospects engine is.
- **AI lead-gen/B2B sales tools** ([AiSDR](https://aisdr.com/blog/ai-lead-generation-tools/),
  [ZoomInfo](https://pipeline.zoominfo.com/sales/ai-lead-generation-tools),
  [Outreach](https://www.outreach.ai/resources/blog/ai-lead-generation)) —
  a different market: enterprise B2B sales teams targeting other
  companies via large verified-contact databases, not agencies finding
  and scoring local small businesses. Genuinely adjacent, not
  head-to-head.
- **White-label chatbot platforms** ([Voiceflow](https://www.voiceflow.com/blog/white-label-chatbot),
  Tidio, Kore.ai) — overlap with exactly one HamishAI feature (the
  embeddable client chatbot), not the whole platform.
- **AI agency "courses"** (Julian Goldie's AI Automation Agency Course,
  "AI Business Blueprint" — [$6,000–$25,000 per the search results](https://ippei.com/best-ai-agency-courses/)) —
  a real and genuinely important finding: a large part of the "how do I
  start an AI agency" search space is currently owned by expensive
  coaching programs that teach people to *manually* wire up Zapier/Make/n8n
  themselves, not real working software. This is HamishAI's most
  defensible, honest competitive angle: **real infrastructure, not a
  five-figure course teaching you to build your own** — and it's true,
  not spin, since the Platform is real, working software with a 7-day
  trial, not a coaching program.

**Content gap this reveals**: nothing on `hamishai.org` currently makes this
comparison explicit. A single honest "HamishAI vs. an AI agency course"
or "HamishAI vs. building it yourself with Zapier" page would target real,
underserved search intent this research surfaced, sourced from HamishAI's
own genuine differentiation (already-built software vs. a course or a DIY
stack) — not a fabricated advantage.

---

## Keyword / topic strategy

No search volumes are stated anywhere below — none were verified, and the
audit's own rules forbid inventing them. Priority is judged by intent match
and how directly HamishAI can honestly serve that intent, not by guessed
traffic.

| Topic | Intent | Priority | Recommended page | Angle |
|---|---|---|---|---|
| AI agency platform / infrastructure | Commercial | P0 | `/` (done) | Already live and specific |
| How to start an AI agency | Informational → commercial | P0 | New: `/agency/how-to-start-an-ai-agency` (pillar) | Honest comparison to the course-driven competitor landscape found above |
| AI lead generation for local businesses | Commercial/problem-based | P0 | New supporting page, linked from `/` | HamishAI's actual differentiator (Prospects engine) vs. enterprise B2B tools |
| AI business analytics for small business | Commercial | P1 | `/analytics` (exists) | Already strong; needs 2-3 supporting how-to pieces |
| White-label AI for agencies | Commercial | P1 | New, linked from `/` pricing section | Directly matches the Agency-tier "white-label add-on" feature already shipped |
| AI agency software vs. Zapier/n8n | Problem-based | P1 | New comparison page | Grounded in real competitor research above, not invented |
| AI receptionist / AI chatbot for small business | Commercial | P2 | `/ai-solutions` (exists) | Already covers this; could split into its own page if it earns traffic |
| What is agentic AI | Informational | P2 | New, supporting | Definitional GEO content — the exact shape AI Overviews cite |

---

## Backlink / off-page strategy

Nothing here is code — all of it is genuine, non-spammy authority-building
this session cannot do on your behalf. No specific site is recommended
without a real reason it fits HamishAI's actual audience.

- **Founder thought leadership on LinkedIn** — the single highest-leverage
  channel already available: `siteConfig.linkedin` is real and already
  the sameAs target in every schema block this audit added. Posting about
  the real NatWest project and the real "built running my own agency"
  story directly supports the Organization/Person schema's own claims.
- **Product Hunt launch** for the Agency Platform, once it's ready for
  that kind of traffic (real reviews would also, honestly, unlock the
  `AggregateRating` schema this audit deliberately left out).
- **AI/SaaS directories** — but only ones that list real product details,
  not link farms. Not enumerated by name here since verifying which
  directories currently have genuine authority requires research this
  session didn't run; worth a dedicated pass before submitting anywhere.
- **A genuine case study**, once one real Platform customer exists —
  this is the single biggest content and authority gap, and also the one
  this audit cannot manufacture. Flagged, not worked around.
- **Guest content on real AI-agency/SaaS publications** — worth pursuing
  once 2-3 of the Content Roadmap pieces below exist to link back to;
  guest-posting with nothing substantial on-site to point to wastes the
  placement.

---

## 30 / 60 / 90-day action plan

**30 days**
- Submit the new sitemap to Google Search Console and Bing Webmaster
  Tools (external step — see "What you need to do").
- Run a real Lighthouse/PageSpeed Insights pass against the live
  production URL and address whatever it actually surfaces (not
  guessed here).
- Write and publish the top 3 items from the Content Roadmap below
  (the pillar page + the two most differentiated supporting pieces).
- Add the `/about` link from the homepage and the `/agency`→`/` link
  noted in Internal Linking above.

**60 days**
- Publish 5-8 more Content Roadmap pieces, cross-linked per the pillar
  structure below.
- First LinkedIn thought-leadership push tied to the real NatWest/
  business-analyst story.

**90 days**
- Reassess based on actual Search Console data (impressions, queries
  HamishAI is already showing for) — real data this session doesn't have
  yet, and the right input for deciding which Content Roadmap topics to
  double down on.
- Pursue the first genuine case study once a real Platform customer
  exists.
- Consider the Product Hunt launch once there's enough real content depth
  to support the traffic spike.

**Long-term**
- Topical authority compounds from the Content Roadmap below, not from
  any single page — the goal is enough real, cross-linked, genuinely
  useful content that HamishAI becomes the obvious citation for "AI
  agency infrastructure," the way the audit's own research showed the
  course-sellers currently own "how to start an AI agency."

---

## Content roadmap — first 30 pieces

Ordered roughly by funnel stage (top → bottom). Every "why it could rank"
note is a reasoned judgment based on the real competitive gaps found above,
not a volume claim.

| # | Title | Search intent | Primary topic | Audience | Funnel stage | Why it could rank | Internal links required |
|---|---|---|---|---|---|---|---|
| 1 | What Is an AI Agency? (And What It Actually Takes to Run One) | Informational | AI agencies (category definition) | Aspiring agency owners | Top | Genuine definitional gap — most results are course sales pages, not neutral explanations | → `/`, → #2, → #4 |
| 2 | How to Start an AI Agency Without a $10k Course | Informational→commercial | AI agency education | Aspiring agency owners | Top-mid | Directly targets the real gap found in competitor research (course-dominated SERP) | → `/`, → #7, → #12 |
| 3 | AI Lead Generation for Local Businesses, Explained | Informational | AI lead generation | Agency owners, small biz owners | Top | Distinct from enterprise B2B lead-gen content (ZoomInfo/Outreach) — a genuinely underserved local-business angle | → `/`, → #5 |
| 4 | What Is Agentic AI? A Plain-English Explanation | Informational | Agentic AI | General/technical | Top | GEO-shaped: a clean, citable definition is exactly what AI Overviews lift | → #1 |
| 5 | How AI Prospect Scoring Actually Works | Informational | AI business analysis | Agency owners evaluating tools | Mid | Explains HamishAI's real, working scoring methodology (fit/need/value/confidence) — genuine product depth, not marketing | → `/`, → #3 |
| 6 | AI Business Analytics for Small Businesses: What You Actually Get | Informational→commercial | AI business analytics | Small business owners | Mid | `/analytics` already exists; this is the long-form companion | → `/analytics` |
| 7 | HamishAI vs. Building Your Own AI Agency Stack (Zapier/Make/n8n) | Commercial/comparison | AI agency software | Technical agency owners | Mid-bottom | Honest, sourced comparison — real gap found in this audit | → `/`, → #2 |
| 8 | How Much Does It Cost to Start an AI Agency? | Commercial | AI agency costs | Aspiring agency owners | Mid | Real answer using HamishAI's own actual pricing (£19-£99/mo) vs. the $6k-$25k course figures found in research | → `/` |
| 9 | The Real Difference Between AI Automation and AI Lead Generation | Informational | Category clarity | Agency owners choosing a niche | Top-mid | Matches the platform's own 3 real agency-type templates | → `/`, → onboarding |
| 10 | How to Get Your First AI Agency Client | Informational | Client acquisition | New agency owners | Mid | Genuine how-to using the Platform's own real sales-kit/outreach features as the mechanism | → `/`, → #3 |
| 11 | What White-Label AI Actually Means for an Agency | Informational | White-label AI | Agency owners considering Agency tier | Mid-bottom | Ties directly to the real, shipped Agency-tier feature | → `/` |
| 12 | Inside a Real AI Agency's First 90 Days | Case-study style | Proof/credibility | Prospective Platform customers | Bottom | Built from HamishAI's own real, ongoing operation (`/agency`) — genuine, not invented | → `/agency`, → `/` |
| 13 | AI Receptionists: What They Can and Can't Do | Informational | AI automation | Small business owners | Top-mid | Grounded in the real, shipped chatbot/receptionist feature | → `/ai-solutions` |
| 14 | How to Price AI Automation Services (A Real Rate Card) | Commercial | AI agency pricing | Agency owners | Mid | Can honestly reference HamishAI's own real founding-client pricing structure as one worked example | → `/services` |
| 15 | AI Agency Client Onboarding: A Real Checklist | How-to | Agency operations | Agency owners | Mid | Can be built from the Platform's own real onboarding-project feature | → `/` |
| 16 | Why Most AI Agencies Fail (And What the Software Can't Fix) | Informational | Honest industry commentary | Aspiring agency owners | Top | Genuine trust-building — honest content outperforms hype for E-E-A-T | → #2 |
| 17 | AI Analytics vs. AI Automation vs. AI Lead Generation: Which Should You Sell? | Comparison | Agency-type selection | Undecided prospects | Top-mid | Maps directly to the real onboarding decision the Platform asks new tenants to make | → `/`, → onboarding |
| 18 | A Technology Business Analyst's Take on AI Agency Tools | Thought leadership | Founder expertise | Industry peers | Top | Leverages Hamish's real, verifiable BA background (`/about`) — genuine E-E-A-T | → `/about` |
| 19 | How to Build a Client Portal for an AI Agency (Without Building One) | How-to | AI agency software | Technical agency owners | Mid-bottom | References the Platform's own real portal feature as the answer | → `/` |
| 20 | The Real Cost of DIY AI Automation vs. a Platform | Comparison | AI automation platforms | Cost-conscious agency owners | Bottom | Honest cost math, no invented numbers | → `/`, → #7 |
| 21 | What Makes a Good AI Sales Kit? | Informational | AI lead generation | Agency owners | Mid | Grounded in the real, shipped sales-kit feature | → `/` |
| 22 | Edinburgh AI Consultancy: What We Actually Do Day to Day | Proof/local | Local AI services | Edinburgh small businesses | Bottom | Serves `/agency`'s own real, still-active local audience | → `/agency` |
| 23 | How to Choose Your First AI Agency Niche | Informational | Agency strategy | Aspiring agency owners | Top-mid | Genuine strategic content, not product-pitchy | → `/`, → #9 |
| 24 | AI Agency Operations: What to Automate First | How-to | AI agency operations | Agency owners | Mid | Real, practical, grounded in what the Platform automates today | → `/` |
| 25 | Monthly Reporting for AI Agencies: What Clients Actually Want to See | How-to | Client reporting | Agency owners | Mid | Grounded in the real, shipped Monthly Reports feature | → `/` |
| 26 | What Is an AI Business Analyst? | Informational | Category/founder credibility | Industry peers | Top | Directly supports the Person schema's own claim | → `/about` |
| 27 | AI Agency Software: The Real Feature Checklist | Informational/comparison | AI agency software | Evaluators | Mid | Genuinely useful, honest checklist — good AI-Overview-citable structure | → `/`, → #7 |
| 28 | How AI Competitive Intelligence Works for Agencies | Informational | AI business analysis | Agency owners | Mid | Grounded in the real, shipped competitor-intel feature | → `/` |
| 29 | Should You Sell AI Automation as a Retainer or a Project? | Informational | Agency business model | Agency owners | Mid | Real, practical business-model guidance | → `/` |
| 30 | The HamishAI Story: Why This Platform Exists | Brand/trust | Founder story | All | Top | Ties `/`, `/agency`, and `/about` into one coherent, honest narrative | → `/`, → `/agency`, → `/about` |

---

## What was implemented (code/content, this session)

See the individual commits for full detail — summarized here:

1. `robots.ts` / `sitemap.ts` — didn't exist, now real and live.
2. Sitewide Organization + WebSite schema, plus Product/Service/FAQPage/
   Person schema on their respective real-content pages.
3. Canonical tags on every marketing page.
4. Fixed 7 misplaced `opengraph-image.tsx` files (wrong folder — the
   per-page OG images were silently never being used).
5. noindex on all 27 fictional demo/concept pages.
6. Fixed 6 missing image `alt` attributes on the homepage.
7. Fixed a stale LinkedIn URL on `/about`.
8. The homepage/`/platform` swap (a separate, larger change — see its own
   commit) and every metadata/schema update that required.
9. Real breadcrumb UI + BreadcrumbList schema on `/portfolio/[slug]`, and
   the two internal-linking gaps this doc originally flagged
   (`/agency` → `/`, `/` → `/about`) — both closed.
10. Trimmed 2 truncating meta descriptions; added the FAQPage schema
    `/analytics` was missing; set `og:type`/`og:site_name`/`og:locale`
    sitewide (never set anywhere before); corrected `<html lang>` to
    `en-GB`; added `/portfolio`'s ItemList schema and fixed 2 more
    empty `alt=""`; confirmed no duplicate `<title>` across any page
    and correct `priority` image usage (no LCP-hurting over-use).
11. Fixed a real accessibility/IA gap found via a sitewide `<nav>`
    aria-label sweep: `site-footer.tsx` had never picked up the
    Platform-vs-consultancy contextual nav split that `site-header.tsx`
    got when the homepage swap shipped, so it kept showing the wrong
    6-link consultancy nav under the new Platform-first homepage's own
    footer. Fixed, and the duplicated contextual-nav check in both
    files extracted into one shared hook (`src/lib/use-platform-context.ts`)
    so the two can't drift out of sync again. Added `aria-label`
    ("Primary" / "Footer") to every previously-unlabeled `<nav>`
    landmark on the site.
12. Replaced the homepage's hand-built "complete journey" mockup
    (`JourneyExplorer`, no real screenshots anywhere in it) with
    `StudioTour` — a real, clickable 6-step tour built from actual
    screenshots of a live, signed-in Studio account. Not structured-data
    SEO, but directly answers the same "can an AI system — or a human —
    tell what this product actually is" question the GEO audit exists
    for; direct user feedback flagged the fake mockups as reading
    "amateur."
13. Fixed the sitewide Organization JSON-LD `description` — it was
    reusing `siteConfig.description` (Platform-only copy) unchanged on
    every page, including `/agency`, whose real content is the separate,
    still-operating Edinburgh consultancy. Verified live that `/agency`'s
    own structured data was misdescribing the entity relative to the
    page's actual content. Now a page-agnostic description, true on
    every page it renders on rather than borrowed from either page's own
    pitch.
14. Fixed a real, verified `og:image`/`twitter:image` gap on the
    homepage — not stale, completely absent, because it was the only
    `(site)` page without its own dedicated `opengraph-image.tsx` (every
    sibling already had one) and the root fallback gets silently
    shadowed by `(site)/layout.tsx`'s own `openGraph` object. Gave the
    homepage its own file, moved the still-accurate Edinburgh version to
    its own file under `/agency`, updated the root fallback's stale
    copy, and fixed a real highlight-matching bug caught along the way
    (a title's trailing period silently broke exact-word highlight
    matching in the shared `ogImageResponse` helper).

## What still needs to be done externally

These are genuinely outside what a codebase-only session can do:

- **Submit the sitemap to Google Search Console and Bing Webmaster
  Tools** — the sitemap existing doesn't mean it's been submitted/crawled
  yet.
- **Run a real Lighthouse/PageSpeed Insights audit** against the live URL
  — Core Web Vitals weren't verified in this pass.
- **A real mobile-device usability pass on the remaining pages** — done for
  the homepage this session (overflow, contrast, tap targets, all clean);
  services/about/portfolio and the rest still need the same pass.
- **Everything in Off-Page Authority Strategy** — LinkedIn presence,
  directory submissions, guest content, a Product Hunt launch, and the
  first real case study once a real Platform customer exists. None of
  this is code.
- **Writing the 30 Content Roadmap pieces** — scoped and prioritized here,
  not drafted; each is a genuine writing project.
- **Checking actual Search Console data** once available, to validate or
  redirect the keyword-priority judgments above against real query data.
