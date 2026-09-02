// AI Website Creation Guide, WB6 — the "make it better" prompt library
// (plan doc §14, deferred out of WB1-3). Curated, hand-written templates
// kept as plain data, same principle as ai-coding-tools.ts and
// ai-coding-tool-guides.ts — not an AI call, so it's instant, free, and
// exactly reviewable before it ships (a wrong prompt template here is a
// data edit, not a regenerate-and-hope).
//
// Templates use bracketed tokens — [PAGE NAME], [BUSINESS NAME],
// [LOCATION], [BRAND COLOURS], [TONE], [WHAT'S WRONG], and a handful of
// prompt-specific ones ([FORM NAME], [GA4 MEASUREMENT ID], etc.) — that
// the browser UI (prompt-library-browser.tsx) turns into fill-in fields
// generically (extractTokens() there matches any [BRACKETED] text, no
// per-token registration needed), pre-filled from the project's real
// discovery/brief data for the four shared tokens when opened from a
// real project rather than left blank.
//
// Content enrichment pass — the original 6 categories (copy, design,
// responsive, seo, accessibility, qa) covered real refinement asks well
// but stopped short of everything a real agency actually needs before
// and after handing a site to a client: nothing here touched
// performance, analytics, conversion, content depth, security, or a
// genuine launch checklist. Widened to 12 categories, each with real,
// specific prompts — not padding for its own sake; every category below
// is something a real Website Builder project genuinely runs into.

export type PromptCategory =
  | "copy"
  | "design"
  | "responsive"
  | "seo"
  | "accessibility"
  | "qa"
  | "performance"
  | "analytics"
  | "conversion"
  | "content"
  | "security"
  | "launch";

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  copy: "Copy & content",
  design: "Design & visual polish",
  responsive: "Mobile & responsive",
  seo: "SEO",
  accessibility: "Accessibility",
  qa: "Bug fixes & QA",
  performance: "Speed & performance",
  analytics: "Analytics & tracking",
  conversion: "Conversion & forms",
  content: "Content depth",
  security: "Security & privacy",
  launch: "Launch checklist",
};

export type PromptTemplate = {
  id: string;
  category: PromptCategory;
  title: string;
  whenToUse: string;
  template: string;
};

export const PROMPT_LIBRARY: PromptTemplate[] = [
  // ---------------------------------------------------------------
  // Copy & content
  // ---------------------------------------------------------------
  {
    id: "tighten-page-copy",
    category: "copy",
    whenToUse: "A page reads as a wall of text, or feels wordy compared to the rest of the site.",
    title: "Tighten a page's copy",
    template:
      "Rewrite the copy on the [PAGE NAME] page to be more concise and scannable. Keep every real fact (services, pricing, hours, contact details) exactly as it is — don't invent or drop anything. Break up any dense paragraphs into shorter sentences, and use bullet points where they'd genuinely improve readability. Keep the tone [TONE]. Show me the before and after so I can compare.",
  },
  {
    id: "add-testimonials",
    category: "copy",
    whenToUse: "The brief calls for testimonials but the page doesn't have a proper section for them yet.",
    title: "Add a testimonials section",
    template:
      "Add a testimonials section to the [PAGE NAME] page for [BUSINESS NAME], styled consistently with the rest of the site. Use placeholder testimonial text clearly marked as placeholder (e.g. \"[Replace with a real customer quote]\") rather than inventing fake customer names or quotes — I'll swap in the real ones myself. Make it a card or quote-style layout, not a plain paragraph.",
  },
  {
    id: "stronger-ctas",
    category: "copy",
    whenToUse: "The call-to-action buttons feel generic (\"Submit\", \"Learn more\") rather than specific to what the business does.",
    title: "Write stronger calls-to-action",
    template:
      "Review every call-to-action button and link across the site and rewrite any that are generic (\"Submit\", \"Click here\", \"Learn more\") to be specific to [BUSINESS NAME]'s actual offer — what happens when someone clicks it. List what you changed, old text next to new.",
  },
  {
    id: "sharpen-headlines",
    category: "copy",
    whenToUse: "The main headline on a page states what the business does but doesn't give anyone a reason to keep reading.",
    title: "Make headlines punchier",
    template:
      "Review the main headline (H1) on the [PAGE NAME] page for [BUSINESS NAME] and rewrite it so it leads with the real benefit to the customer, not just a description of the service. Keep it honest — no invented claims, awards, or numbers that aren't already confirmed in the brief. Suggest two alternative versions so I can pick, and keep the tone [TONE].",
  },

  // ---------------------------------------------------------------
  // Design & visual polish
  // ---------------------------------------------------------------
  {
    id: "premium-feel",
    category: "design",
    whenToUse: "The site is functionally complete but doesn't feel as polished or high-end as the brief asks for.",
    title: "Make it feel more premium",
    template:
      "The site currently feels a bit basic rather than premium. Improve the visual hierarchy, spacing, and consistency across every page to make it feel more polished and professional — bigger, more confident headings; more breathing room around sections; consistent card/button styling throughout. Don't change the actual content or layout structure, just the visual execution. Show me which pages you touched.",
  },
  {
    id: "spacing-consistency",
    category: "design",
    whenToUse: "Some sections feel cramped while others have too much whitespace, or spacing looks different page to page.",
    title: "Fix inconsistent spacing",
    template:
      "Go through every page and make the spacing between sections consistent — the same rhythm of padding/margin between major sections site-wide, not different amounts on different pages. Fix anywhere that feels cramped or anywhere with noticeably too much dead space. List every page you adjusted.",
  },
  {
    id: "colour-consistency",
    category: "design",
    whenToUse: "The brand colours are being used slightly differently in different places (buttons, backgrounds, accents).",
    title: "Make the colour palette consistent",
    template:
      "Check every use of [BRAND COLOURS] across the whole site — buttons, backgrounds, links, accents — and make sure the same colour is used consistently for the same purpose everywhere (e.g. the primary CTA colour should be identical on every page). Fix any place where a slightly different shade snuck in.",
  },
  {
    id: "hero-section-impact",
    category: "design",
    whenToUse: "The homepage hero section is functional but doesn't grab attention in the first few seconds.",
    title: "Improve the hero section's first impression",
    template:
      "Improve the hero section on the homepage for [BUSINESS NAME] so it makes a stronger first impression — check the headline is the largest, most confident element on the page, the primary call-to-action stands out visually against everything else, and there's no competing element pulling attention away from it. Keep [BRAND COLOURS] and don't change the copy itself, just the visual weight and hierarchy. Describe exactly what you changed and why.",
  },

  // ---------------------------------------------------------------
  // Mobile & responsive
  // ---------------------------------------------------------------
  {
    id: "fix-mobile-layout",
    category: "responsive",
    whenToUse: "You've spotted a specific layout problem on mobile — something overlapping, cut off, or awkwardly placed.",
    title: "Fix a specific mobile layout problem",
    template:
      "On mobile (narrow screen width), [WHAT'S WRONG] on the [PAGE NAME] page. Fix this specifically — check the rest of the site for the same issue in case it appears elsewhere too, and confirm the page still looks right on mobile, tablet, and desktop after your fix.",
  },
  {
    id: "touch-targets",
    category: "responsive",
    whenToUse: "Buttons or links feel fiddly to tap on a phone during your own testing.",
    title: "Improve touch target sizes",
    template:
      "Go through every page on mobile and check that buttons, links, and form fields are comfortably large enough to tap accurately with a thumb — nothing too small or too close together. Fix any that aren't, and confirm nothing else shifted as a result.",
  },
  {
    id: "tablet-check",
    category: "responsive",
    whenToUse: "You've checked mobile and desktop but tablet-width screens haven't been tested and often fall through the cracks between breakpoints.",
    title: "Check the tablet breakpoint specifically",
    template:
      "Check every page at tablet width (around 768-1024px) specifically — this is the width most often missed between mobile and desktop breakpoints. Look for layouts that look cramped, navigation that behaves oddly, or images/cards that wrap awkwardly at this size. Fix anything you find and confirm mobile and desktop still look right afterwards.",
  },

  // ---------------------------------------------------------------
  // SEO
  // ---------------------------------------------------------------
  {
    id: "page-seo-pass",
    category: "seo",
    whenToUse: "One specific page needs a proper SEO pass — new page, or one that was missed in the main SEO phase.",
    title: "Improve SEO for one page",
    template:
      "Do a full on-page SEO pass on the [PAGE NAME] page for [BUSINESS NAME] in [LOCATION]. Write a unique, descriptive title tag and meta description (150-160 characters) referencing real content on the page. Confirm there's exactly one H1 that clearly describes the page. Check every image on the page has descriptive alt text. Show me the title tag and meta description you wrote so I can review them.",
  },
  {
    id: "local-seo-signals",
    category: "seo",
    whenToUse: "The site needs stronger local search visibility for a specific town/city.",
    title: "Add local SEO signals",
    template:
      "Strengthen local SEO for [BUSINESS NAME] in [LOCATION] across the site: make sure [LOCATION] appears naturally in the Home, About, and Contact page titles and meta descriptions where it reads naturally (not stuffed in awkwardly), confirm LocalBusiness/FoodEstablishment schema markup exists and matches the real address/phone/hours shown on the Contact page, and confirm the NAP (name, address, phone) is consistent everywhere it appears on the site.",
  },
  {
    id: "internal-linking",
    category: "seo",
    whenToUse: "Pages exist in isolation with no links between related content, which is bad for both SEO and visitor navigation.",
    title: "Improve internal linking between pages",
    template:
      "Review the site for internal linking opportunities between related pages — for example, a service page linking to a relevant case study, or the About page linking to Contact. Add natural, contextual links (not a generic \"see more\" everywhere) using descriptive link text rather than \"click here\". List every link you added and where.",
  },

  // ---------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------
  {
    id: "full-accessibility-pass",
    category: "accessibility",
    whenToUse: "You want a genuine accessibility review before treating the site as finished, beyond the checklist you've already ticked off.",
    title: "Run a full accessibility pass",
    template:
      "Do a full accessibility review of the whole site: check every page can be fully navigated by keyboard alone (tab through every interactive element in a sensible order, with a visible focus state), check colour contrast between text and its background meets WCAG AA on every page, confirm every image has meaningful alt text (or empty alt for purely decorative ones), and confirm form fields have proper labels. List every issue you find and fix, page by page.",
  },
  {
    id: "contrast-fix",
    category: "accessibility",
    whenToUse: "Text over a coloured background or image looks hard to read.",
    title: "Fix colour contrast issues",
    template:
      "Check text-to-background colour contrast across the site, especially anywhere text sits on a coloured background or over an image (like the hero section). Fix anywhere the contrast is hard to read, staying within [BRAND COLOURS] as much as possible rather than switching to unrelated colours. Confirm the fixes meet WCAG AA contrast ratios.",
  },
  {
    id: "aria-and-semantics",
    category: "accessibility",
    whenToUse: "You want to confirm the page uses proper heading levels and semantic HTML, not just divs styled to look like headings.",
    title: "Fix heading structure and semantic HTML",
    template:
      "Check every page uses a proper, logical heading structure — one H1 per page, headings nested in order (H2 before H3, no skipped levels), and no text styled to look like a heading that's actually just a styled <div> or <span>. Confirm semantic HTML is used throughout (nav, header, main, footer, button vs div-with-onclick) rather than divs doing everything. List what you found and fixed.",
  },

  // ---------------------------------------------------------------
  // Bug fixes & QA
  // ---------------------------------------------------------------
  {
    id: "fix-broken-element",
    category: "qa",
    whenToUse: "Something specific is visibly broken — a dead link, a button that does nothing, an image that won't load.",
    title: "Fix a specific broken element",
    template:
      "On the [PAGE NAME] page, [WHAT'S WRONG]. Find and fix the actual cause rather than just papering over the symptom, then confirm it works by testing it yourself, and check the rest of the site for the same problem in case it isn't isolated to this one page.",
  },
  {
    id: "pre-client-qa",
    category: "qa",
    whenToUse: "You're about to show the site to the client and want a final sanity check first.",
    title: "Run a pre-client QA pass",
    template:
      "Before I show this site to the client, do a full QA pass: click through every page and every link/button to confirm nothing is broken, confirm there's no leftover placeholder or lorem ipsum text anywhere, confirm the contact/enquiry form actually submits successfully, check the site on mobile and desktop, and check there are no console errors in the browser. Report back a clear list of anything you found and fixed, and anything you found but couldn't fix (e.g. missing real content only I can supply).",
  },
  {
    id: "cross-browser-check",
    category: "qa",
    whenToUse: "The site's only ever been tested in one browser and you want to catch anything that looks different elsewhere before launch.",
    title: "Cross-browser sanity check",
    template:
      "Check the site in at least two different browsers (e.g. Chrome and Safari, or Chrome and Firefox) and flag anything that renders differently, breaks, or looks visually off in one but not the other. Pay particular attention to fonts, form elements, and any animations or transitions. Report what you found, browser by browser.",
  },

  // ---------------------------------------------------------------
  // Speed & performance
  // ---------------------------------------------------------------
  {
    id: "image-optimization",
    category: "performance",
    whenToUse: "Photos or logos were uploaded at full size and the site feels slow to load, especially on mobile connections.",
    title: "Optimise images for speed",
    template:
      "Review every image on the site and optimise them for web performance — compress oversized images, convert to a modern format (WebP) where the tooling supports it, and confirm images are served at a sensible size for where they're displayed rather than a huge original being scaled down in CSS. Add lazy loading for images below the fold. Report the before/after file sizes for the biggest offenders.",
  },
  {
    id: "reduce-load-time",
    category: "performance",
    whenToUse: "The site feels sluggish to load, particularly the first time a visitor opens it.",
    title: "Speed up perceived load time",
    template:
      "Do a performance pass on the homepage: check for render-blocking resources, unnecessarily large JavaScript bundles, and fonts that delay text from appearing. Fix what you reasonably can without changing how the site looks or behaves. Explain in plain language what you found and what you improved — I want to understand the trade-offs, not just accept a change blindly.",
  },
  {
    id: "lazy-load-below-fold",
    category: "performance",
    whenToUse: "The page loads everything at once, including content and scripts a visitor won't see until they scroll.",
    title: "Defer anything not immediately visible",
    template:
      "Check the [PAGE NAME] page for anything being loaded immediately that a visitor won't actually see until they scroll — images, embedded maps, video embeds, third-party widgets. Defer or lazy-load anything below the fold that safely can be, without changing how the page looks once it's fully loaded. Confirm nothing above the fold is affected.",
  },

  // ---------------------------------------------------------------
  // Analytics & tracking
  // ---------------------------------------------------------------
  {
    id: "ga4-setup",
    category: "analytics",
    whenToUse: "The site needs GA4 tracking installed before launch so you can actually see visitor numbers.",
    title: "Set up Google Analytics 4",
    template:
      "Add Google Analytics 4 tracking to the site using this Measurement ID: [GA4 MEASUREMENT ID]. Install it site-wide so every page is tracked, confirm it fires correctly (walk me through how to verify it in GA4's Realtime report), and make sure it doesn't slow down page load noticeably. Don't add any other tracking scripts unless I ask for them.",
  },
  {
    id: "conversion-tracking",
    category: "analytics",
    whenToUse: "You want to know specifically when someone submits the contact form or clicks a key button, not just that they visited the site.",
    title: "Track a specific conversion goal",
    template:
      "Set up event tracking in GA4 for [WHAT'S WRONG — describe the real action, e.g. 'every contact form submission' or 'every click on the Book Now button'] on the site. Fire a clearly-named custom event I can find in GA4's reports, and confirm it doesn't fire more than once per real submission/click. Walk me through how to check it's working.",
  },
  {
    id: "search-console-setup",
    category: "analytics",
    whenToUse: "The site is live but hasn't been submitted to Google Search Console, so you have no visibility into search performance or indexing issues.",
    title: "Connect Google Search Console",
    template:
      "Help me connect [BUSINESS NAME]'s site to Google Search Console: generate or confirm the verification method (HTML file, meta tag, or DNS record — whichever fits how the site is hosted), and once verified, submit an XML sitemap. Confirm the sitemap is accessible at the URL you submit it from.",
  },

  // ---------------------------------------------------------------
  // Conversion & forms
  // ---------------------------------------------------------------
  {
    id: "improve-contact-form",
    category: "conversion",
    whenToUse: "The contact form has more fields than it needs, or doesn't clearly confirm submission.",
    title: "Make the contact form easier to complete",
    template:
      "Review the contact form on the [PAGE NAME] page: check every field is actually necessary (remove anything [BUSINESS NAME] doesn't genuinely need to follow up), confirm required fields are clearly marked, and confirm there's a clear success message or redirect after submission so a visitor knows it worked. Don't remove a field without telling me which one and why.",
  },
  {
    id: "add-booking-cta",
    category: "conversion",
    whenToUse: "Visitors have to hunt for how to actually get in touch or book, rather than it being obvious from anywhere on the site.",
    title: "Add a clear booking/enquiry call-to-action",
    template:
      "Make it obvious from every page how a visitor books or enquires with [BUSINESS NAME] — add a persistent, clearly visible call-to-action (a header button, sticky button, or equivalent) that leads to the contact form, booking page, or phone number, styled consistently with [BRAND COLOURS]. Don't make it intrusive or block content on mobile.",
  },
  {
    id: "reduce-form-friction",
    category: "conversion",
    whenToUse: "A specific form (booking, quote request, newsletter) has a low completion rate and you suspect it's too much effort to fill in.",
    title: "Reduce friction on a specific form",
    template:
      "Review the [FORM NAME] form specifically for friction — is every field genuinely required, is the button copy specific rather than generic (\"Get my quote\" vs \"Submit\"), and does it give a clear indication of how many steps are left if it's multi-step? Suggest concrete changes to reduce drop-off, and only apply the ones I confirm.",
  },

  // ---------------------------------------------------------------
  // Content depth
  // ---------------------------------------------------------------
  {
    id: "faq-section",
    category: "content",
    whenToUse: "The brief mentions common customer questions that aren't answered anywhere on the site yet.",
    title: "Add a genuine FAQ section",
    template:
      "Add an FAQ section to the [PAGE NAME] page for [BUSINESS NAME] covering the real questions customers actually ask — use only what's already in the brief or what I give you below, never invented answers about pricing, policies, or availability: [WHAT'S WRONG — list the real questions/answers here]. Use an expandable accordion style consistent with the rest of the site.",
  },
  {
    id: "case-study-section",
    category: "content",
    whenToUse: "The brief calls for showcasing past work but there's no dedicated section for it yet.",
    title: "Add a case study or portfolio section",
    template:
      "Add a case study / portfolio section to the [PAGE NAME] page for [BUSINESS NAME], structured to show real work clearly — a short description, the outcome, and a placeholder for an image, clearly marked as placeholder where I haven't supplied a real photo yet. Don't invent client names, results, or numbers — use \"[Add real example]\" markers for anything you don't have real content for.",
  },
  {
    id: "about-page-depth",
    category: "content",
    whenToUse: "The About page is thin — a couple of generic sentences rather than something that actually builds trust.",
    title: "Give the About page real substance",
    template:
      "Review the About page for [BUSINESS NAME] and strengthen it using only real information from the brief — the actual story, real experience/qualifications, what genuinely makes them different locally in [LOCATION]. Don't invent history, years in business, or credentials that aren't already confirmed. Flag clearly anywhere you think a real detail from me would make it stronger, rather than filling the gap yourself.",
  },

  // ---------------------------------------------------------------
  // Security & privacy
  // ---------------------------------------------------------------
  {
    id: "https-and-headers",
    category: "security",
    whenToUse: "Pre-launch check to confirm the site is served securely and has sensible baseline security headers.",
    title: "Confirm HTTPS and basic security headers",
    template:
      "Confirm the site is served over HTTPS everywhere (no mixed content warnings, no page reachable over plain HTTP), and add sensible baseline security headers if the hosting setup supports it (e.g. a Content-Security-Policy that doesn't break anything, X-Content-Type-Options). Explain what each header does in plain language before you add it, and confirm the site still works exactly the same afterwards.",
  },
  {
    id: "spam-protection",
    category: "security",
    whenToUse: "You're worried the contact form will get flooded with bot spam once it's live.",
    title: "Add spam protection to forms",
    template:
      "Add spam protection to the contact form on the [PAGE NAME] page — a honeypot field or equivalent lightweight method that blocks bots without adding a visible CAPTCHA that makes real visitors work harder. Confirm the form still works normally for a real person filling it in properly.",
  },
  {
    id: "cookie-consent",
    category: "security",
    whenToUse: "The site uses analytics or other cookies and needs a genuine consent mechanism, not just a decorative banner.",
    title: "Add a cookie consent banner",
    template:
      "Add a cookie consent banner to the site that actually blocks non-essential cookies (like GA4) from firing until the visitor consents, not just a banner that appears while tracking runs anyway. Keep it simple — accept/decline, no dark patterns steering people toward accept. Confirm analytics genuinely doesn't fire before consent by testing it.",
  },

  // ---------------------------------------------------------------
  // Launch checklist
  // ---------------------------------------------------------------
  {
    id: "pre-launch-checklist",
    category: "launch",
    whenToUse: "The site is built and reviewed, and you want one final structured pass before pointing the domain at it.",
    title: "Run the full pre-launch checklist",
    template:
      "Run a full pre-launch checklist on the site: confirm there's a custom 404 page (not the framework default), confirm a robots.txt and XML sitemap exist and are correct, confirm favicon and social share preview images (Open Graph tags) are set for every page, confirm there's no leftover placeholder content or broken links, and confirm forms submit successfully end to end. Report back a clear pass/fail list.",
  },
  {
    id: "redirects-check",
    category: "launch",
    whenToUse: "The site is replacing an existing website and you need old URLs to redirect properly rather than 404ing.",
    title: "Set up redirects for a domain/URL change",
    template:
      "Set up 301 redirects from the old site's URLs to their equivalent new pages: [WHAT'S WRONG — list the old URLs and which new page each should redirect to]. Confirm each redirect works and that there's no redirect chain (a redirect pointing to another redirect rather than the final destination).",
  },
  {
    id: "social-share-previews",
    category: "launch",
    whenToUse: "Sharing the site's link on Facebook, LinkedIn, or WhatsApp shows no image or the wrong text.",
    title: "Fix how the site looks when shared on social media",
    template:
      "Add proper Open Graph and Twitter Card meta tags to every page so the site looks right when its link is shared on social media or messaging apps — a real image (not the default placeholder), an accurate title, and a short accurate description for each page. Use [BUSINESS NAME] and real page content, not generic filler. Show me how to test this before we call it done.",
  },
];
