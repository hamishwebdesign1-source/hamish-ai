// AI Website Creation Guide, WB6 — the "make it better" prompt library
// (plan doc §14, deferred out of WB1-3). Curated, hand-written templates
// kept as plain data, same principle as ai-coding-tools.ts and
// ai-coding-tool-guides.ts — not an AI call, so it's instant, free, and
// exactly reviewable before it ships (a wrong prompt template here is a
// data edit, not a regenerate-and-hope).
//
// Templates use bracketed tokens — [PAGE NAME], [BUSINESS NAME],
// [LOCATION], [BRAND COLOURS], [TONE], [WHAT'S WRONG] — that the browser
// UI (prompt-library-browser.tsx) turns into fill-in fields, pre-filled
// from the project's real discovery/brief data when opened from a real
// project rather than left blank.

export type PromptCategory = "copy" | "design" | "responsive" | "seo" | "accessibility" | "qa";

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  copy: "Copy & content",
  design: "Design & visual polish",
  responsive: "Mobile & responsive",
  seo: "SEO",
  accessibility: "Accessibility",
  qa: "Bug fixes & QA",
};

export type PromptTemplate = {
  id: string;
  category: PromptCategory;
  title: string;
  whenToUse: string;
  template: string;
};

export const PROMPT_LIBRARY: PromptTemplate[] = [
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
];
