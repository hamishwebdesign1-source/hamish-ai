# Lily Golf — HamishAI End-to-End Test Project

**Status: Phases 1–7 complete. Phase 8 not started.**

## What this is

Two things at once, per the brief:

1. A real brand concept — a modern women's golf clothing and lifestyle brand for young
   women getting into golf, working name "Lily Golf" — developed to a standard that
   could genuinely be shown to customers, manufacturers, investors, golf clubs,
   influencers, and brand partners.
2. A full end-to-end test of the HamishAI platform itself — run through the real
   lead → research → concept → client → portal pipeline in the live admin tool, with
   every friction point, manual workaround, or missing automation logged as a platform
   finding (Phase 8).

This is a free test project, not a real paying client, but treated with full commercial
rigour throughout — no fabricated supplier names, prices, or availability claims.
Everything below is either sourced (linked) or explicitly flagged as an assumption /
strategic recommendation.

## Roadmap

| Phase | Covers | Status |
|---|---|---|
| 1 | Market & competitor research | ✅ Done — this doc |
| 2 | Brand strategy, target customer, naming (incl. real domain/trademark checks) | ✅ Done — this doc |
| 3 | Product strategy — 8–15 hero product launch collection | ✅ Done — this doc |
| 4 | Visual identity direction | ✅ Done — this doc + `docs/lily-golf/visual-identity.html` |
| 5 | Concept website + live run through the real HamishAI admin/portal pipeline | ✅ Done — this doc |
| 6 | AI opportunities + community/social strategy | ✅ Done — this doc |
| 7 | Commercial reality (manufacturing/MOQ/margin, real sources only) + launch roadmap | ✅ Done — this doc |
| 8 | HamishAI platform findings — what broke, what's missing, what should be automated | Not started |

Each phase gets its own section appended below as it ships, same pattern as
`client-portal-redesign-plan.md`.

---

## Phase 1 — Market & Competitor Research

### Why women are taking up golf right now (research-backed)

- **The demographic shift is real and recent.** 37% of golfers 18 and under were female
  in 2023, up from 15% in 2000. Women now represent 28% of on-course golfers in the US,
  a 46% increase since 2019. ([Newsweek](https://www.newsweek.com/gen-z-women-new-favorite-hobby-sport-11097834))
- **Scotland specifically is mid-strategy.** Scottish Golf's Women and Girls Strategy
  (2025–2035) just marked its first year: female adult club membership up 1.6% in 2025,
  junior girl membership up 2.9%, and scores posted by female golfers for handicap
  purposes up 14% year-on-year (198,847 scores in 2025). Junior girls' programmes like
  Girls GolfSixes grew participation by 55% (6,800 girls in 2025). Female club membership
  is still only 13% of total Scottish membership — real headroom, not a saturated
  market. ([The Golf Business](https://thegolfbusiness.co.uk/2026/07/female-golf-club-membership-and-participation-rise-in-scotland-as-women-and-girls-strategy-marks-first-year/))
  This matters directly for Lily Golf: it's an Edinburgh-adjacent tailwind and a
  concrete partnership hook (see Community Strategy, Phase 6) — Scottish Golf's own
  strategy is actively looking for exactly the kind of brand energy Lily Golf would
  bring.
- **Barriers are actively being engineered away, not just tolerated.** Growth is
  concentrated in short/casual formats — 9-hole course searches up 1,220% — and
  entertainment-golf venues (Topgolf, Five Iron Golf, PopStroke) that don't require
  four hours, specialist knowledge, or full kit to participate. Newcomers are explicitly
  not needing "specialized clothes" to start, which is a real signal for a clothing
  brand: the clothing has to earn its place, not be a precondition. ([Newsweek](https://www.newsweek.com/gen-z-women-new-favorite-hobby-sport-11097834))
- **It's social and wellness-coded, not just sport-coded.** Gen Z players are
  explicitly looking for "community, wellness, and something fun to do offline."
  Women-led meetup groups (e.g. Swang Collective at Rancho Park, LA) are a real,
  working acquisition channel for new players. ([Newsweek](https://www.newsweek.com/gen-z-women-new-favorite-hobby-sport-11097834))
- **Golf is culturally "unlocked" via the old money / quiet luxury aesthetic.**
  The old-money aesthetic (understated, logo-free, inherited-affluence coded) has
  been a dominant TikTok current since 2022 and golf/tennis are its signature sports —
  Miu Miu showed a collection at a tennis club, Malbon and others lean into this.
  Participating in golf itself signals the aesthetic, independent of skill.
  ([AOL/old money golf](https://www.aol.com/gen-z-loves-old-money-081601681.html), [InClub Magazine](https://inclubmagazine.com/golf-and-tennis-have-influencing-the-old-money-fashion-trend/))
- **This is a real spending demographic, not a curiosity.** Women 18–34 were ~34% of
  all new female golfers in 2024 and spend an estimated 42% more per shopping occasion
  on golf apparel than older demographics. ~40% of new 2024 apparel styles were
  "hybrid golf-casual" (dresses, leggings, jackets, urban-casual trousers) aimed at
  18–35s. ([GolfPass](https://www.golfpass.com/travel-advisor/articles/7-up-and-coming-womens-golf-apparel-brands))

### Market size (research-backed, sources disagree — both cited, treat as a range not a fact)

- One estimate: global women's golf apparel market $3.37bn (2025) → $4.26bn by 2035,
  6% CAGR. ([Global Market Statistics](https://www.globalmarketstatistics.com/market-reports/women-39-s-golf-apparel-market-11018))
- Another: $4.8bn (2025) → $8.6bn by 2034, 6.7% CAGR — nearly double the first
  estimate, a reminder that market-sizing reports vary hugely by methodology and
  shouldn't be quoted as a single hard number to investors without picking one source
  and citing it. ([industryresearch.biz](https://www.industryresearch.biz/market-reports/women-s-golf-apparel-market-102520))
- Women-specific apparel is now ~41% of total golf apparel sales worldwide.
  North America is ~38% of global revenue. No reliable UK/EU-specific breakdown found
  in this pass — worth commissioning if this goes further.

### Competitor landscape

Four distinct tiers emerged from research — useful because Lily Golf's positioning
decision (Phase 2) is really a decision about which gap between these tiers to sit in.

**1. Mainstream sportswear giants (Nike Golf, Adidas Golf, Puma Golf, Lululemon).**
Broad, well-distributed, technically excellent, brand-safe. Lululemon's 2025/26
women's golf range is its largest golf/tennis assortment yet, built on its existing
"Science of Feel" fabric tech and Lydia Ko as ambassador — it's leveraging an existing
loyal athleisure customer into golf, not building a golf-first identity.
J.Lindeberg sits a notch above these on price (Scandinavian, design-led since 1996,
compared by reviewers to Peter Millar and G/FORE rather than Nike/Adidas) and just did
a womenswear-focused collab (adidas × JAY3LLE, co-founded by Johan Lindeberg's daughter
Blue) explicitly aimed at "transforming women's golf fashion." ([SI](https://www.si.com/golf/lululemon-launches-new-womens-golf-collection), [The Review Caddie](https://thereviewcaddie.com/brands/j-lindeberg-golf-apparel/), [TrendyGolf](https://trendygolfusa.com/blogs/magazine/introducing-the-adidas-x-jay3lle-collection))
*Gap:* these are performance-first, style-second. None of them are a lifestyle brand
a young woman would wear to brunch.

**2. Fashion-led streetwear-golf crossovers (Malbon, G/FORE).** This is the tier
Lily Golf is most likely competing with directly. Malbon (founded 2017, LA, by
non-golf-industry founders Stephen & Erica Malbon) built a menswear-first streetwear
identity for six years before finally shipping "Malbon Women" after a two-year
development process — LPGA ambassadors Charley Hull and Jeongeun Lee6 signed since.
G/FORE (founded by Mossimo Giannulli) is "bold colours, streetwear-inspired,
disrupt-without-disrespecting-the-sport," premium-priced ($90+ starting for tops),
targeting golfers with $100k+ household income. ([WWD](https://wwd.com/business-news/retail/malbon-golf-erica-stephen-malbon-new-store-los-angeles-womens-collection-1235719454/), [Haven Golf](https://havengolfcompany.com/blogs/news/is-g-fore-worth-it-in-2026-an-honest-review-2))
*Gap:* both are still men's-brand-first with a women's line added later, not a
women's-first brand. Neither is explicitly beginner-friendly or community-first —
they sell to golfers who already golf.

**3. Heritage women's-specialist golfwear (Röhnisch, Daily Sports, Swing Control).**
Röhnisch has been making golf clothing "for women, by women" since 2002 — genuinely
first-mover on the category — Swedish-designed, sustainability-positioned,
performance-fabric-led. ([Röhnisch](https://www.rohnisch.com/us))
*Gap:* these read as golf-specialist, not lifestyle-brand — built for existing
golfers, not for making golf feel accessible to new ones, and the aesthetic skews
older than an 18–30 target.

**4. New women-founded challenger brands — the most directly relevant comparables.**
This is the tier to study hardest:
- **CSARA** (launched UK, 2025, founder Claire Griffiths) — explicitly built for
  women moving "from business meetings, to the fairway, to the clubhouse" in the same
  outfit; press coverage frames the founder as reacting against golf brands that
  "pink it and shrink it" (take a men's cut, resize it, recolour it pink) rather than
  designing for women from scratch. ([Golf Business News](https://golfbusinessnews.com/news/new-products/csara-launches-spring-apparel-collection/), [National World headline](https://www.nationalworld.com/business/no-more-pink-it-and-shrink-it-meet-the-woman-aiming-to-revolutionise-womens-golf-fashion-5238545) — full article was behind a 403 in this pass, headline/framing only, flagged as such)
- **Birdie & Ace** (founded 2022, women-owned) — golf + racquet sports + everyday,
  softer fabrics, comfort-first reworking of the golf skirt.
- **Abendroth** — founded by a female PGA professional, focused specifically on
  women's golf trousers for "young professional / working mom / active golfer" —
  narrower product focus than Lily Golf should have, but a useful signal that
  trousers/bottoms specifically are an underserved silhouette.
([GolfPass roundup](https://www.golfpass.com/travel-advisor/articles/7-up-and-coming-womens-golf-apparel-brands))
*This is Lily Golf's real competitive set* — small, founder-led, 2022–2025 vintage,
proving the "gap" is real and being actively chased right now, but none of them (from
what's publicly visible) have gone all-in on the specific 18–28, TikTok-native,
beginner-through-intermediate segment with a genuine content/community engine — most
read as apparel-first brands that happen to have a founder story, not community-first
brands that happen to sell apparel. **That's the opening.**

### The market gap, stated plainly

Research converges on the same gap from multiple angles: existing women's golf
apparel is disproportionately built by *resizing and recolouring men's designs*
("pink it and shrink it," explicitly named by a 2025 competitor as the thing she's
reacting against) or, where it is built for women, built for women who are already
golfers — not for the much larger, faster-growing population of women *becoming*
golfers who don't own any golf clothes yet and are put off by the idea that they'd
need to. Nobody researched so far combines: (a) genuinely modern, wear-off-the-course
design, (b) a beginner-first, community-first brand mission rather than an
apparel-first one, and (c) price/positioning between the streetwear-golf tier (Malbon/
G/FORE, $90–200+) and the mainstream tier (Nike/Adidas/Lululemon, $50–120) rather than
matching one exactly.

### Adjacent trends worth designing around

- **"Technical lifestyle" is the 2026 athleisure direction**, not loungewear: premium
  seamless sets, oversized performance hoodies in muted/earthy tones, tailored
  athletic trousers, elevated sports bras worn as outerwear. Directly compatible with
  an on-course/off-course crossover product strategy (Phase 3). ([GWI](https://www.gwi.com/blog/athleisure-trends))
- **Gen Z shops slowly and follows influencers disproportionately** — 50% sit on a
  cart 2+ days before buying (vs 24% of Boomers) and are 46% more likely than average
  to look to fashion influencers/bloggers for ideas — this argues for a content/
  community engine that nurtures over weeks, not a hard-sell funnel (feeds Phase 6).
  ([theapparelfactory.com](https://theapparelfactory.com/blog/gen-z-fashion-trends-2026/))
- **#GolfTok is an active, named community**, not a hypothetical — creators like
  Haley Bookholdt (114k+ TikTok followers, 3.3M+ likes) are already doing
  outfit-to-obsession content arcs. Real, nameable potential ambassador/partner
  targets exist today, not "influencers in general." ([Women's Golf Journal](https://womensgolfjournal.com/p/female-golfers-tiktok-accounts-tips/))

### Explicitly flagged: what's still assumption, not research

- No UK/EU-specific women's golf apparel market sizing was found in this pass (all
  hard numbers above are global or US-weighted) — worth a dedicated search before
  this goes in front of investors.
- The CSARA "pink it and shrink it" framing is sourced from a headline/search
  snippet, not the full article (blocked at fetch time) — worth re-verifying by
  reading the piece directly before quoting the founder.
- "What younger female golfers actually want from golf clothing" (brief's own
  question) is answered here indirectly, through brand positioning and press framing,
  not through direct primary research (surveys, interviews) — a real limitation.
  If this goes further, primary research (even informal — a poll in a Scottish Golf
  women's programme, or DMs to a few #GolfTok creators) would meaningfully de-risk
  Phase 2's target customer definition.

---

## Phase 2 — Brand Strategy, Target Customer & Naming

### Target customer

**Primary: "The social beginner," 20–29.** Entered golf in the last 0–3 years, most
likely through a short/social format — Topgolf, a corporate outing, a friend's
invite to a 9-hole round — rather than junior competitive golf. Lives in or near a
city. Already fluent in athleisure (owns Lululemon, follows the "old money"/quiet-
luxury aesthetic on TikTok) and treats golf as one of several social-fitness
activities — alongside padel, pilates, run clubs — not a singular identity. Discovers
brands on TikTok/Instagram via creator content, not search or golf retail, and
(per the Gen Z data in Phase 1) sits on a cart 2+ days before buying — she is
persuaded over time by repeated, trusted content, not a single ad. She spends more
per golf-specific purchase than an experienced golfer would (42% more per occasion,
per Phase 1), precisely because she golfs occasionally and wants the one outfit she
owns to be right. She buys not just to perform on the course but to feel like she
belongs in a space that can still feel intimidating — and to get cost-per-wear value
by wearing the same pieces off the course.

**Secondary: "The stylish improver," 25–35.** A year or more into golf, plays more
regularly, increasingly frustrated that the brands built for her (Röhnisch, Daily
Sports, mainstream Nike/Adidas/Puma) read as "golf-first" rather than "her-first."
Buys Lily Golf once she's already golfing more seriously, as an upgrade from her
starter kit.

Both segments matter, but every early decision (Phase 3 product mix, Phase 4 visual
identity, Phase 6 content) should be built for the primary segment first — the
secondary segment converts once the brand exists, the primary segment is who decides
whether it should.

### Brand positioning

**Working statement:** *A golf brand for women who didn't grow up playing golf —
clothing built to move from the first tee to the first round of drinks after, and a
community that makes getting good at golf feel as fun as getting dressed for it.*

This deliberately sits in the gap Phase 1 identified: not mainstream-performance
(Nike/Adidas/Lululemon — technically excellent, no lifestyle identity of their own),
not fashion-led-but-men's-brand-first (Malbon/G/FORE — arrived at womenswear second,
after building a men's identity), not heritage-specialist (Röhnisch/Daily Sports —
built for people who already golf), and distinct from the closest true comparables
(CSARA, Birdie & Ace, Featherie — see below) by being community-first rather than
product-first: the product exists to fund and equip the community, not the other way
round.

### Brand personality

Confident, not competitive. Encouraging, not gatekeeping. Social — the brand voice
should default to "we/us," never a lone-athlete voice. A knowing wink rather than
reverence for tradition (golf's stuffiness is material to have fun with, not to
inherit). Style-first in tone, sport-second — closer to how a fashion brand talks
than how a sports brand talks. Explicitly not: twee, apologetic, over-explained, or
"cute" in a way that undersells the product's technical seriousness.

### Naming assessment — "Lily Golf" has real, verifiable problems

Checked rather than assumed, per the brief. Four separate, independent issues:

1. **Direct confusion risk with an established, dominant competitor.** Lilly
   Pulitzer is *already* one of the best-known names in women's golf apparel —
   vibrant florals, resort-preppy, sold at PGA Tour Superstore, Nordstrom, Dick's.
   "Lily Golf" and "Lilly Pulitzer['s] Golf[wear]" are phonetically close enough to
   invite real confusion in retail and search contexts, and — worse for the brand
   strategically — Lilly Pulitzer *is* the floral, stereotypically-feminine
   aesthetic Phase 1's research and this brief explicitly want Lily Golf to avoid.
   Sharing a near-identical name with the brand you're positioning against undercuts
   the positioning before a single product ships. ([Lilly Pulitzer golf](https://www.lillypulitzer.com/active/golf/))
2. **The generic term is already saturated.** Search results for "Lily Golf" surface
   a golf course in Taiwan (lilygolf.com.tw), a golf-coaching site
   (lilygolfcoach.com), and — most damaging for discoverability — LPGA Tour
   professional Muni "Lily" He, who has 2 million+ Instagram followers and is
   routinely referred to as "Lily" in golf media. A new apparel brand would be
   fighting an established professional athlete for the same search real estate
   indefinitely. ([@lilymhe](https://www.instagram.com/lilymhe/?hl=en))
3. **A real, if narrow, US trademark precedent exists in the exact category.**
   LilyBeth Golf LLC holds registered US trademarks for "LILYBETH GOLF" covering golf
   accessories (balls, headcovers, gloves, tees, club covers) — not apparel, but
   close enough in the same "LILY + GOLF" construction and the same broad goods
   category that it's a real risk factor a trademark attorney would flag, not a
   dealbreaker on its own. ([Justia Trademarks](https://trademark.justia.com/owners/lilybeth-golf-llc-2176978))
4. **Both direct domains are unavailable, and the obvious social handle is taken.**
   `lilygolf.com` and `lilygolf.co.uk` are both registered and parked for resale via
   Sedo (checked live) — buyable in theory, at an unknown and likely inflated price,
   never guaranteed. `@lilygolf` on Instagram is an active, unrelated personal
   account, not a squatted placeholder. None of this is fatal individually. Together,
   it's a brand that would spend its first year fighting its own name for
   visibility. ([whois.com/lilygolf.com](https://www.whois.com/whois/lilygolf.com))

**Recommendation: change the name.** Not because "Lily" is a bad word, but because
this specific combination collides with an established competitor, a working
professional athlete, and a registered trademark, all in the same category.

### What was explored as alternatives, and what was learned

The obvious next move — a golf-culture-slang name paired with a lifestyle angle — was
tried first and rejected on evidence, which is itself a useful finding: **this
naming territory is far more crowded than it looks.**

| Candidate | Verdict | Evidence |
|---|---|---|
| Front Nine (Golf) | Taken | Front Nine Golf, an existing premium Irish golf apparel brand with near-identical "understated luxury, on-and-off-course" positioning to what's proposed here. ([frontninegolf.eu](https://frontninegolf.eu/)) |
| The Nineteenth / Nineteenth Club | Taken (multiple times) | Nineteenth Clothing Co., Club Nineteen, and Nineteenth Golf Collective are all existing golf-lifestyle apparel brands built on the same "19th hole" concept. |
| Iron & Ivy | Taken | Iron & Ivy Golf Co and Iron & Ivy Activewear both already trade on almost exactly this "fairway to streetwear" positioning. |
| Cleek | Risky | LIV Golf's "Cleeks GC" team owns real brand attention here, and "CLEEKMARK" is a registered US trademark for golf apparel (shirts, pants, jackets, polos) specifically — a direct category conflict. |
| Isla (Golf) | Not clean | No brand trades on the exact phrase, but "Isla" alone is an existing general fashion label, and Island Green Golf is a real, established UK women's/men's golf apparel brand close enough in sound to raise the same category of risk as the Lilly Pulitzer problem, just smaller. |
| Featherie *(found while checking "Feathery")* | Taken — and notable | An actual existing brand, not a naming collision to route around but a **competitor that should be added to the Phase 1 landscape**: founded by then-14-year-old Kate Korngold specifically because she couldn't find golf clothing between "kids'" and "adult women's," now sold at wholesale via RepSpark and exhibiting at the PGA Show. Different exact age band (teen girls) to Lily Golf's 20–29 primary target, but close enough that it belongs in any future competitor deck. ([Golf.com](https://golf.com/lifestyle/kate-korngold-featherie-girls-golf-attire/)) |

### The strongest verified candidate: **Gowf**

The archaic Scots spelling of "golf" (pronounced the same). No apparel brand, no
Companies House registration, no live trademark, and no meaningful search-result
collision found in this pass. It carries a genuine, ownable story none of the
researched competitors have — Malbon is LA streetwear, G/FORE is LA design-world,
J.Lindeberg and Röhnisch are Scandinavian, CSARA is unspecified-UK — while Lily Golf
would be **from the actual home of golf**, made explicit rather than left as an
address on an invoice. That's a real differentiator, not just a nicer name.

Honest caveats, exactly as the brief asked for:
- `gowf.com` and `gowf.co.uk` are *also* both registered and parked (checked live) —
  ordinary for any short, dictionary-adjacent word, and evidence that no name in this
  category comes with a free clean `.com` waiting. A realistic domain strategy is
  `wearegowf.com` / `gowfgolf.com` (also currently parked, checked) / `.golf` or
  `.co` TLDs / or a Sedo offer on the parked domain — this needs a real domain
  strategy decision, not an assumption that any name "just works."
- This pass checked live search results, Companies House—adjacent search, and US
  trademark search coverage — it did **not** run a formal UK IPO or EUIPO trademark
  clearance search (those tools are interactive/JS-driven and weren't reachable by
  this pass's tools). Before any money is spent on branding, packaging, or a
  trademark filing, a proper clearance search (or five minutes with a trademark
  agent) is a hard prerequisite, not optional due diligence.

### Recommendation

Treat "Gowf" as the front-running placeholder to design against for Phases 3–5
(cheap to change later, and having *a* real name makes the visual identity and
product naming work concrete rather than abstract), while flagging clearly to
whoever signs off the brand that final naming needs a proper UK trademark clearance
search before anything is locked in or spent against. Continuing to call the project
"Lily Golf" internally for now is fine — it's the working name for *this test
project*, not a claim that it's the launch name.

---

## Phase 3 — Product Strategy: The Launch Collection

### Pricing calibration (real reference points, not invented)

Checked live rather than guessed, to anchor target prices in the actual market
Phase 1 mapped:

| Brand | Tier | Real price range found |
|---|---|---|
| Lululemon (UK) | Mainstream | Polos £44–78, skirts £44–108 ([lululemon.co.uk](https://www.lululemon.co.uk/en-gb/c/womens/sports/golf)) |
| CSARA | New women-founder challenger | $42–91 (≈£33–72) ([csaraofficial.com](https://csaraofficial.com/collections/golf)) |
| G/FORE | Fashion-led premium | Tops from $89.99 (≈£71) ([Haven Golf](https://havengolfcompany.com/blogs/news/is-g-fore-worth-it-in-2026-an-honest-review-2)) |
| Malbon Women | Fashion-led premium/hype | Polos $68–240 (≈£54–190) ([Lyst](https://www.lyst.com/shop/malbon-golf-tops/)) |

Gowf's target prices below sit just above Lululemon's core and roughly level with
CSARA — a genuine debut brand can't yet charge Malbon's hype premium, but pricing at
Lululemon-basic would undersell design intent and make the unit economics in
Phase 7 very hard to hit. All prices below are **targets, not confirmed costings** —
real prices depend on the manufacturing decisions in Phase 7.

### Colour direction (carried through into Phase 4)

Deliberately not pink or floral, per the brief. Two neutral bases plus one signature
accent that nods to Scotland without being literal tartan or thistle-print:

- **Neutrals:** Stone, Ecru, Charcoal, Black, Chalk White
- **Signature accent — "Thistle":** a dusty heather-mauve, closer to a Scottish
  hillside in late summer than to any "girls' golf" pastel pink
- **Secondary accent — "Fairway":** a deep bottle green
- Seasonal only: **"Clay"** — a warm terracotta, used sparingly

### The launch collection — 13 pieces

Deliberately tight rather than sprawling. A debut collection that tries to cover
every category thinly is a worse first impression than a small collection that's
fully resolved — and a narrower SKU count is a real MOQ/cash-flow advantage covered
properly in Phase 7.

**On-course (6)**

1. **The Signature Polo** — £58. Description: the wordmark piece; fitted-but-not-tight
   through the body, slightly cropped hem so it sits right over both a skort and
   tailored trousers. Material: recycled polyester/elastane pique (four-way stretch),
   quick-dry finish. Colours: Stone, Charcoal, Thistle. Purpose: the entry point —
   the one piece most people buy first. Differentiator: no chest logo; the wordmark
   sits small on the left cuff, not the chest — deliberately the opposite of
   logo-forward mainstream golf polos.
2. **The Fairway Skort** — £68. Description: bias-cut with a soft wrap-front seam
   line instead of the standard box-pleat tennis-skirt silhouette every mainstream
   brand uses. Built-in performance short underneath. Material: matte stretch twill,
   elastane blend. Colours: Stone, Black, Fairway. Purpose: the category-standard
   piece, redesigned. Differentiator: the wrap seamline reads as a fashion skirt at
   a glance, not instantly identifiable as "golf" — directly answers the brief's
   "wear it off the course too" test.
3. **The Clubhouse Dress** — £85. Description: sheath-cut golf dress with the same
   built-in short as the skort, designed to go straight from the 18th green to
   dinner without changing. Material: matte stretch twill, four-way stretch.
   Colours: Charcoal, Thistle. Purpose: the "hero" photography piece and the
   highest-margin item in the launch range. Differentiator: no other researched
   competitor at this price tier photographs their golf dress as convincingly
   off-course as on it — this is designed to be shot both ways from day one.
4. **The Tailored Trouser** — £78. Description: a wide-leg, ankle-grazer trouser —
   deliberately not the skinny/legging-style trouser most golf brands default to.
   Material: brushed stretch twill, four-way stretch waistband. Colours: Stone,
   Charcoal, Black. Purpose: answers the "modern silhouette, not generic golf-with-a-
   female-palette" brief requirement directly — this is the piece most likely to be
   photographed by fashion press rather than golf press.
5. **The Featherweight Quarter-Zip** — £92. Description: a fine-gauge technical
   knit midlayer, feels like cashmere, performs like a base layer. Material:
   merino-blend technical knit, moisture-wicking, temperature-regulating.
   Colours: Ecru, Fairway, Charcoal. Purpose: the "investment piece" — the one
   likely to be worn most often off-course. Differentiator: the fine-gauge knit
   avoids the boxy, quilted look of most golf midlayers.
6. **The Windshirt** — £110. Description: packable, water-resistant lightweight
   jacket that folds into its own pocket small enough for a golf bag or a handbag.
   Material: recycled ripstop nylon shell, DWR finish. Colours: Stone, Black.
   Purpose: the practical, weather-driven purchase (genuinely necessary for a
   Scottish course). Differentiator: cut as a fashion jacket, not a branded
   golf-tour-style shell — no oversized back logo.

**Off-course (3) — the crossover pieces the brief specifically asked for**

7. **The Half-Zip Sweatshirt** — £75. Description: works as an early-tee-time layer
   over the polo, or on its own off-course. Material: brushed-back technical fleece,
   four-way stretch. Colours: Stone, Charcoal, Thistle. Purpose: the single piece
   most likely to be worn by someone who has never picked up a golf club — the
   "gateway" product. Differentiator: cut oversized, matching the 2026 "technical
   lifestyle" athleisure direction (Phase 1) rather than a fitted golf silhouette.
8. **The Wide-Leg Jogger** — £70. Description: a tailored, cropped-ankle jogger —
   travel-to-course-to-brunch piece. Material: same brushed technical fleece as the
   half-zip, for a matching-set option. Colours: Stone, Charcoal. Purpose: extends
   the on-course wardrobe into pure lifestyle wear, increasing cost-per-wear value.
   Differentiator: designed explicitly as a matching set with item 7, a merchandising
   lever most golf-specific brands don't use.
9. **The Boyfriend Tee** — £38. Description: oversized, dropped-shoulder tee with a
   small embroidered wordmark. Material: heavyweight organic cotton/elastane blend.
   Colours: Chalk White, Charcoal, Thistle. Purpose: the accessible entry price
   point and the most "wear literally anywhere" piece — the one most likely to be
   gifted or bought as a first purchase before someone's tried the brand's golf
   pieces at all.

**Technical accessory (1)**

10. **The Sunday Long-Sleeve** — £52. Description: a UPF50+ base layer built for the
    4–5 hours of direct sun exposure a round of golf actually involves (real figure
    from Phase 1 fabric research, not assumed) — designed to be worn alone or under
    the polo, addressing sun protection without defaulting to a bulky layer or a
    floppy hat. Material: UPF50+ treated technical jersey, four-way stretch, flat-lock
    seams. Colours: Ecru, Charcoal. Purpose: a genuine functional gap-filler — most
    competitors treat sun protection as an afterthought rather than a design brief.
    Differentiator: this is the one piece in the range that leads with a stated
    technical claim (UPF50+) rather than style, deliberately, to build fabric-tech
    credibility for the whole range.

**Accessories (3)**

11. **The Structured Cap** — £32. Six-panel, mid-crown, embroidered wordmark on the
    side (not centred) — Stone, Black, Thistle.
12. **The Course Bucket Hat** — £30. A deliberate alternative to the golf visor,
    which reads as an older, more traditional silhouette — bucket hats are an
    active streetwear/festival crossover trend among the target age group, and this
    doubles as sun coverage. Stone, Fairway.
13. **The Ribbed Crew Sock (2-pack)** — £18. Ribbed, mid-calf, a small jacquard
    wordmark at the ankle. Stone/Charcoal pack, Thistle/Ecru pack. Purpose: the
    lowest-price entry point in the whole range and a natural gift/add-to-cart item.

### What's deliberately not in the launch range

No golf glove, despite being on the brief's own list of options — gloves are a
highly technical, fit-critical, low-margin category dominated by specialists
(FootJoy, Callaway) that a debut apparel brand has no credibility advantage in yet;
better to earn a right to that category later once the brand exists, not in the
first 13 SKUs. No dedicated golf shoe for the same reason, plus real footwear
manufacturing is a materially different (and much more expensive) supply chain than
apparel — a genuine Phase 7 commercial consideration, not an oversight.

---

## Phase 4 — Visual Identity Direction

The full system — colour, typography, logo lockups and usage rules, photography
direction, packaging, and a social grid rhythm — is built as an actual page, not just
described: **[`docs/lily-golf/visual-identity.html`](./lily-golf/visual-identity.html)**.
Open it directly (self-contained, works offline, fonts embedded) or ask to have it
reopened as an artifact.

Highlights and the reasoning behind them:

- **Wordmark set lowercase, in Fraunces** (a soft-shouldered editorial serif that
  hardens up at display size) — a capitalised wordmark reads corporate, and this
  brand's whole point is that it isn't. Body/UI text runs in Archivo, a grotesque
  sans with enough personality not to default to Inter or Space Grotesk, which the
  brief's own instruction to avoid generic, templated design was taken seriously on.
- **Colour system carried forward exactly from Phase 3** (Stone/Ecru/Charcoal/Black/
  Chalk White neutrals, Thistle signature accent, Fairway secondary, Clay seasonal-
  only) — with an explicit usage rule that Thistle never appears as a background
  larger than a swatch or a button, so the one bold colour in the system stays bold
  by staying rare.
- **The mark** is a minimal line-drawn flag-and-pin, reduced to two strokes and a
  circle — no golfer silhouettes, no crossed clubs, no crest/shield (which reads as
  a country-club badge, the opposite of the brief's instruction).
- **Photography direction is presented as direction, not photography** — four
  art-directed mood panels with specific notes ("mid-stride, not mid-swing," "skin
  and fabric texture kept, not retouched smooth") rather than fabricated stock
  images standing in for a shoot that hasn't happened. Said so explicitly on the
  page, per the brief's instruction not to fabricate what isn't real.
- **Packaging** uses the actual golf term "swing tag" rather than a generic hangtag,
  uncoated recycled card, no printed tissue — reasoned as a premium-and-cheaper
  choice together, not premium-because-more.
- Both light and dark themes are fully designed (not just inverted) and verified live
  in the browser at both a narrow and a full desktop width — a real layout bug (the
  cover section's meta row overlapping the tagline at certain viewport heights,
  caused by absolute positioning) was caught and fixed during that verification
  pass, not left in.

A genuine tooling note for Phase 8: the plan was to generate real logo concept
images (`nano-banana`/Gemini image generation is available in this environment), but
the underlying model (`gemini-2.5-flash-image-preview`) returned a 404 as
unavailable. Built the identity page without raster images instead — real inlined
web fonts (Fraunces + Archivo, fetched and embedded as base64 so the page works
offline) and CSS/SVG for the mark, mood panels, and mockups, rather than describing
a visual system in prose alone.

---

## Phase 5 — Concept Website + Live Platform Run

This phase had two deliverables that turned out to be inseparable: a real concept
website for Gowf, and a genuine end-to-end run through HamishAI's actual lead →
research → concept → client → portal pipeline — not a simulation of it. Every step
below happened in the real live admin tool and portal against the real database,
using the real "add lead" / "invite by email" / magic-link forms, not direct SQL.

### The concept website

**[`/concepts/gowf`](../src/app/concepts/gowf/page.tsx)** — built using the same
conventions as every other HamishAI concept page (`Reveal`-animated sections, a
bespoke Google-font pairing via `next/font/google`, a working embedded AI chat wired
to its own `/api/concepts/gowf/chat` route), carrying the Phase 4 visual system
through exactly (Fraunces/Archivo, the colour tokens, the flag-and-pin motif). Six of
the 13 launch pieces are previewed as colour-block cards rather than product
photography, captioned explicitly as such — no fabricated product shots for a brand
that's never had a shoot. The live AI assistant is grounded only in the brand facts
documented in Phases 1-4 (positioning, collection, pricing, name story) and correctly
refuses to claim it's a real store when asked. Verified live: hero, stat chips,
positioning pull-quote, collection grid, and the chat (tested with "Why is it called
Gowf?" — answered correctly, on-brand, and only from documented facts) all render and
work correctly. Both the page and disclaimer banner ("a HamishAI test project… not a
real company") were checked to make sure nothing on the page could be mistaken for a
real, operating business.

### The live pipeline run

1. **Lead created** via the real `/admin/leads` "Add a lead" form — business name,
   category, neighbourhood filled in; email/phone deliberately left blank and the
   signal field explicitly states "not a real prospect; do not contact," so nothing
   in this record can trigger real outreach automation.
2. **AI research triggered** via the lead detail page's Research button —
   **immediately surfaced a real platform gap**: *"This lead has no website on file
   to research."* The tool hard-requires an existing website before it can research
   a business at all.
3. **Concept page linked** to the lead via the `concept_slug` dropdown (which reads
   `src/app/concepts/` directly off disk — confirming, in the codebase's own comment,
   that *"concept pages are hand-authored static files, not something the app
   'creates' as an event"* — there is no in-app concept-generation feature; building
   `/concepts/gowf` above **was** the real, correct way to do this step). Setting the
   slug correctly auto-fired the deep research pipeline (confirmed via the
   `research_jobs` table) — which hit the identical website-required gap and
   resolved itself cleanly to a `needs_review` status with the same clear error,
   rather than failing silently.
4. **AI sales kit generated** — worked well even with no website or contact email:
   produced a genuinely good, contextually correct outreach email referencing the
   real concept URL. Not saved or sent anywhere, per the plan agreed before starting
   this phase. Minor, harmless quirk worth noting: it addressed the email "Hi Lily,"
   — inferring a person's name from the business name "Lily Golf" with no contact
   name on file.
5. **Client created** via the real `/admin/clients` "Add a Client" form — a fully
   manual re-entry (business name, email, package) with **zero data carried over**
   from the lead record above. **Confirms a second real platform gap**: there is no
   lead → client conversion anywhere in the product.
6. **Portal access invited** via the client detail page's real "Invite by email"
   team flow — this is the correct, working path (a separate, well-built feature
   from the vestigial "Email" field on the client-creation form itself, which is
   stored but never checked by portal auth — worth flagging as a confusing
   near-duplicate, see Phase 8).
7. **Portal tested as a real magic-link session** (same technique as the client
   portal redesign work): Home correctly greeted the right contact name and showed
   an accurate empty state ("You're all caught up"); Ask HamishAI's AI Copilot
   correctly answered "0 requests" for this brand-new client rather than leaking
   another client's data; Insights rendered a clean "Not enough data yet" state
   instead of crashing on an account with zero history.
8. **A real data-isolation edge case was hit and worked around during this
   process**: inviting the same test email (`hamishwebdesign1@gmail.com`, already a
   member of the Craigie & Sons Joinery test client from earlier session work) to
   Gowf silently would never have worked — `getPortalMembership()`'s own code
   comment confirms *"this product doesn't support one email belonging to more than
   one client's portal today."* Removed that invite and used a `+gowf` Gmail alias
   instead so the portal side could actually be tested — but a real admin doing this
   for two genuine clients sharing a contact would hit exactly the same wall with no
   workaround available to them.

### Summary of platform findings from this phase (full writeup in Phase 8)

- **Gap:** AI research requires an existing website — can't research the exact
  pre-launch/no-website businesses that most need HamishAI.
- **Gap:** No self-service or AI-assisted concept-page generation — every concept
  page is hand-coded and deployed by a developer.
- **Gap:** No lead → client conversion — converting a prospect to a client means
  retyping everything from scratch.
- **Gap:** The client-creation form's "Email" field is vestigial for portal
  access — the real invite flow lives separately on the client detail page, and nothing
  warns an admin filling in the creation form that it won't grant login access.
- **Gap:** One email can only ever belong to one client's portal — no error or
  warning when inviting an email already attached elsewhere, it just silently
  resolves to the wrong (oldest) account.
- **Working well:** the deep research pipeline's auto-trigger on `concept_slug`
  being set worked exactly as designed; the sales kit tool produced strong output
  even from a sparse lead; portal data isolation between clients is correctly
  enforced end-to-end; empty/zero-data states are handled gracefully everywhere
  tested rather than erroring.

---

## Phase 6 — AI Opportunities + Community & Social Strategy

### AI opportunities, mapped against what HamishAI actually has today

The brief's six AI ideas aren't equally hypothetical — Phase 5 already proved two of
them live. Rating each honestly against HamishAI's real infrastructure (not what
would be nice to assume):

| AI opportunity | Reality |
|---|---|
| **AI Golf Assistant** (beginner Q&A) | **Already built and demonstrated live** — the `/concepts/gowf` chat *is* this, running today. Tested with "I'm new to golf — where do I start?" in Phase 5. |
| **AI Business Intelligence** | **Already built, already running for Gowf** — the portal's Insights/"AI Business Analytics" page is real, account-scoped, live infrastructure, verified in Phase 5 showing a correct empty state for Gowf's zero sales history. This is the single most mature AI feature in the whole platform relative to the brief's ask. |
| **AI Content Engine** | **One click away from existing infrastructure** — the sales kit generator (`SalesKitButton`) is exactly this pattern (draft → human review → approve) already proven reliable in Phase 5. A "draft this week's Journal post" or "write this product's Instagram caption" button is the same component shape pointed at a different prompt, not new architecture. |
| **AI Customer Service** | **The pattern exists, the audience doesn't yet** — the portal's AI Copilot (account-scoped, grounded in real data, proven in Phase 5) is architecturally the same thing, but it's built for HamishAI's own B2B clients checking their account, not Gowf's B2C shoppers asking about a return. Same wiring, genuinely different product surface — a storefront-facing chat doesn't exist anywhere in HamishAI today. |
| **AI Shopping Assistant** (recommend products from a described need) | **Net new.** Every existing chat in HamishAI (concept pages, portal copilot) is freeform Q&A grounded in a static system prompt, not structured retrieval against a real product catalogue with filters (price, weather, category). Gowf's `/concepts/gowf` chat can *talk about* the collection because I wrote the whole collection into its prompt — it can't yet actually filter or recommend from a real catalogue table. Buildable on the same Claude-wiring pattern, but the catalogue + tool-use layer is genuinely new work. |
| **AI Size Assistant** (height/weight/fit preference → size recommendation) | **Fully net new.** Nothing in HamishAI today takes structured intake and returns a reasoned recommendation — every existing AI feature is either freeform chat or read-only analytics. Would need its own small schema (a size chart + fit notes per garment, which Phase 3's per-product "differentiator" fields already partially provide) and a dedicated reasoning prompt. |

The honest read: HamishAI is much further along on *account intelligence for its own
B2B clients* (copilot, analytics, sales kits) than it is on *commerce AI for a
client's own end customers* (shopping/sizing assistants). That's a real, useful
finding in its own right — Section 12/13 of the brief asked to prove the platform
can take an idea to a "sophisticated digital business," and the honest gap is that
today it proves that much more convincingly for the *agency-to-client* relationship
than the *client-to-shopper* one. Worth HamishAI's own product roadmap knowing that
directly, not just inferring it.

### Community strategy

The brief is explicit that this shouldn't just be "sell golf clothing" — and Phase 1
already found the real opening: none of Gowf's direct comparables (CSARA, Birdie &
Ace) are community-first the way the brand needs to be to win the beginner segment.

**Real, named partnership targets (found via research, not invented):**
- **Scottish Golf's Women and Girls Strategy (2025–2035)** — the exact tailwind
  Phase 1 found. Scottish Golf funds "Get into Golf" starter grants (£400 per club)
  to clubs running girls'/women's starter programmes — a concrete, fundable reason
  for Gowf to approach Scottish Golf directly and offer to kit out starter-programme
  participants, not a cold pitch. ([Get into Golf funding](https://thegolfbusiness.co.uk/2026/06/record-scottish-club-sign-ups-for-junior-golf-programmes/))
- **Women On Course** — a real, national (not Scotland-specific, but active and
  established) women's golf community organisation running a "year-round calendar of
  local and travel events" for total beginners through to existing players — a
  natural events/co-marketing partner rather than a competitor, since they're
  community-first and don't sell apparel.
- **University of Edinburgh Golf Club** — hyper-local, and already runs exactly the
  "no experience needed" recreational membership + weekly beginner range sessions
  model Gowf's target customer wants. A realistic first real-world pilot partner
  given Hamish AI's own Edinburgh base — sponsor kit for one term, get direct access
  to exactly the target segment.
- **Girls-Only GolfSixes** — a real, growing (76 girls at the Scottish Open week
  event alone) Scottish Golf junior initiative. Not Gowf's direct customer (product
  targets 20-29-year-olds, not juniors), but the pipeline Gowf's *future* customer is
  currently inside — worth a long-horizon brand-awareness relationship, not a sales
  one.

**Content, not just partnerships:**
- A recurring **"First Round"** guide series — what to actually expect (not generic
  etiquette-shaming), what to wear (genuinely useful, not just a product plug), how
  tee times/handicaps/scoring work explained once, plainly, without condescension.
- **Beginner meetups**, run the same low-stakes way as the "Do this next"/"jump to
  it" pattern HamishAI's own admin uses internally for reducing decision friction —
  a monthly 9-hole social round, explicitly no-pressure, explicitly not about score.
- **Ambassador programme deliberately not chasing LPGA names first** — every
  researched competitor (Malbon, G/FORE, Lululemon) signs a tour pro. Gowf's honest
  differentiator is partnering with #GolfTok creators *at* the "just started, posting
  the journey" stage identified in Phase 1 (e.g. the Haley Bookholdt/Cailyn
  Henderson tier, not tour pros) — cheaper, more attainable, and more credible to the
  exact customer being targeted, since the creator's own beginner arc mirrors the
  customer's.

### Social strategy

**Priority call, stated honestly rather than pretending four platforms can be run
equally well from day one:** TikTok and Instagram first (where Phase 1's research
shows the actual #GolfTok activity and the target customer's own discovery
behaviour lives), Pinterest second (a real, lower-effort channel — outfit boards
have long organic search life and fashion-golf crossover is a genuinely underused
niche there), YouTube deferred until there's an actual video-production budget
rather than committed to as a fourth equal channel with no resourcing behind it.

**Content pillars** (the same 3×3 grid rhythm already built into Phase 4's visual
identity page):

| Pillar | What it is | Not what it is |
|---|---|---|
| Golf | Product in use, on-course | Not swing tips — Gowf sells clothing, not coaching |
| Fashion | Styling, outfit builds, on/off-course crossover | Not generic golf-fashion round-ups of other brands |
| Off-course | The same pieces worn away from golf | The category proof-point competitors under-use |
| Beginner golf | "First Round" series, etiquette, what to expect | Never condescending — assume intelligence, not experience |
| Community | Meetup recaps, partner clubs, real customers | Not stock UGC — real faces, real rounds |
| Behind the brand | Process, fabric, the Gowf/Scotland name story | Not founder-worship — the brand, not a personality cult |

**Example content concepts** (illustrative starting points, not a content calendar):
- TikTok: "Rating my golf fits by how many holes I'd actually survive in them" —
  self-aware, product-adjacent, native to the platform's humour.
- TikTok: a real "First Round" — filming an actual beginner's first 9 holes,
  unscripted, in Gowf kit.
- Instagram Reels: the Half-Zip Sweatshirt + Wide-Leg Jogger set, shot identically
  on-course and at a coffee shop, cut together — the crossover pitch made visually
  in one 15-second cut rather than explained.
- Pinterest: "Golf date outfit," "first golf lesson outfit," "what to wear golfing
  when you don't own golf clothes yet" boards — built around search terms a
  beginner actually types, not brand-first boards.
- Instagram static: the Phase 4 colour-swatch/packaging aesthetic reused directly as
  a real content format ("this month's palette"), so the visual identity system pays
  for itself twice.

---

## Phase 7 — Commercial Reality & Launch Roadmap

### Manufacturing — real, named options, real MOQs

**UK options** (fits the "actual home of golf" brand story directly, and several
offer genuinely small first-run quantities):
- **Hook & Eye UK** — fully custom cut-and-sew activewear, MOQ 50 units per style,
  fabric/fit/trims/branding developed from scratch. ([hookandeyeuk.com](https://hookandeyeuk.com/en-us/pages/activewear-manufacturers))
- **Blue Associates Sportswear** — UK factory at Silverstone Technology Park;
  MOQs as low as 5 units per style scaling to monthly drip-feed production,
  in-house flatlock/overlock/bonding/sublimation. ([blueassociatessportswear.com](https://blueassociatessportswear.com/post/made-in-england-sportswear-production-in-our-brand-new-uk-activewear-factory/))
- **CanvasWhisper** — no-MOQ custom apparel manufacturing, technical activewear
  capability, single-unit production available for sampling. ([canvaswhisper.co.uk](https://www.canvaswhisper.co.uk/))

**Portugal (EU) options** — better unit economics at real scale, still low-MOQ
friendly, strong technical-fabric and OEKO-TEX credentials:
- **White Cotton** (Barcelos) — MOQ 50 units, OEKO-TEX certified performance
  fabrics. ([whitecotton.pt](https://www.whitecotton.pt/activewear-manufacturer-portugal))
- **Create Fashion Brand** — vertical production, MOQ 100 units per colour/style.
  ([createfashionbrand.com](https://createfashionbrand.com/clothing-manufacturer-portugal-small-quantity/))
- General Portuguese low-MOQ activewear production is available from as low as
  70pcs per style/colour with 3–5 week turnaround via aggregator networks like
  Athleisure Basics. ([athleisurebasics.com](https://athleisurebasics.com/blogs/news/trusted-low-moq-clothing-manufacturers-in-portugal-for-2025))

**Recommendation:** sample and validate (Phase 3 of the launch roadmap below)
through a UK low-MOQ specialist — Blue Associates' sub-10-unit flexibility in
particular makes real fit-sampling affordable before committing to anything — both
because the quantities genuinely match a first-run's real needs and because "cut and
sewn in Britain" is a stronger, truer story for a brand built on "the actual home of
golf" than a Portugal credit line would be. Revisit Portugal for the *scaled-up*
production run once the launch collection validates real demand and unit cost starts
to matter more than story.

### Margins — a real worked example, clearly labelled as an estimate

DTC apparel brands typically run 50–65% gross margin (COGS 35–50% of retail),
with public apparel/DTC comparables clustering around 55–60%. ([Eightx](https://eightx.co/blog/average-dtc-gross-margin-public-companies), [True Margin](https://truemargin.ai/blog/clothing-brand-profit-margins))
Applying that real benchmark range to a real Phase 3 price — **not** inventing a
brand-new number:

| | The Signature Polo, £58 retail |
|---|---|
| COGS (fabric, construction, trims, freight-in) at 35–40% of retail | **£20–23** (estimate, industry benchmark applied — not a real supplier quote) |
| Packaging (swing tag + mailer) | **~£0.80** — the tag alone is a real, cited figure (~30p each); the mailer cost is an unverified rough estimate, flagged as such |
| Payment processing (Shopify, ~2%) | **~£1.16** |
| Outbound shipping (Evri small parcel, under 1kg) | **£2.62–3.29** |
| **Gross margin before returns** | **~50–55%**, in line with the real benchmark range |

**The number that actually matters more than gross margin: returns.** UK clothing
returns run ~23.6% (UK online overall is 19.5%; clothing is the worst category),
and fashion ecommerce broadly sees 25–40% — driven substantially by "bracketing"
(63% of shoppers admit to buying multiple sizes intending to return the rest).
([Eightx UK return benchmark](https://eightx.co/blog/uk-ecommerce-return-rate-benchmark), [bestcolorfulsocks.com stats roundup](https://bestcolorfulsocks.com/blogs/news/online-vs-offline-clothing-return-statistics))
Roughly 1 in 4 Gowf orders coming back — each one costing a second shipping leg plus
reprocessing — is a bigger real threat to margin than any single line item above,
and it's the one lever genuinely inside Gowf's control: **this is exactly what
Phase 6 flagged the AI Size Assistant as net-new, unbuilt work for** — it stops
being a "nice AI feature" and becomes the single most direct unit-economics lever
available, worth prioritising ahead of the shopping assistant for that reason alone.

### Platform & ongoing costs (real, current pricing)

- **Shopify**: Basic plan £19–25/month; Shopify Payments card rate 1.5–2.0% + 25p
  depending on plan tier. ([avada.io Shopify UK pricing](https://avada.io/blog/shopify-price-uk/))
- **Shipping**: Evri small parcel (under 1kg — covers most Phase 3 pieces except
  outerwear) from £2.62–3.29; Royal Mail 2nd class small parcel £4.25 up to 2kg as
  a tracked-delivery alternative. ([ShippyPro](https://www.shippypro.com/blog/en/how-much-does-it-cost-to-ship-a-package-in-the-uk), [Evri pricing](https://www.evri.com/our-services/our-prices))
- **Packaging**: swing tags ~30p each in small quantities, no-minimum-order
  printers exist for brands this size. ([UK swing tag pricing roundup](https://www.solopress.com/swing-tags/)) Mailer cost is not independently sourced in
  this pass — flagged as an assumption, not a researched figure.

### Launch roadmap

| Phase | Focus | What must be validated before spending real money |
|---|---|---|
| **1. Brand validation** | Finalise naming (real UK trademark clearance search — Phase 2's naming work checked live search/domain/US-trademark signals but explicitly not a formal UK IPO search), pricing sense-check against Phase 3 targets | Don't spend on packaging, samples, or a company name filing until naming is actually cleared, not just researched-and-looking-clean |
| **2. Audience building** | Start the Phase 6 content pillars and Instagram/TikTok presence *before* any product exists — waitlist signup, "First Round" content, first outreach to Women On Course / Edinburgh Uni Golf Club | Real signal (waitlist size, engagement, community response) before committing to a production run sized on guesswork |
| **3. Prototype products** | Sample 2–3 hero pieces only (not all 13) — The Signature Polo, The Fairway Skort, The Sunday Long-Sleeve are the highest-signal choices, covering the brand's clearest differentiators — via a UK low-MOQ partner (Blue Associates' sub-10-unit flexibility fits this exactly) | Real fit-testing on real bodies from the actual target segment, not just an internal review — this is where the 23.6% return-rate risk either gets designed out or doesn't |
| **4. Launch collection** | Full 13-piece range, manufactured at validated MOQs once Phase 3 fit feedback is in, Shopify storefront live | — |
| **5. Community growth** | Partnerships from Phase 6 become real once there's product to put in people's hands — club sponsorships, meetups, Get into Golf co-marketing | — |
| **6. Product expansion** | Gloves, footwear, deeper size range — deliberately excluded from the Phase 3 launch range; revisit only once the initial collection has proven real demand | Don't build category #14 until category #1–13 has sold through |

---

*Next: Phase 8 — the HamishAI platform findings report, consolidating everything
surfaced across all seven phases into a concrete improvements list.*
