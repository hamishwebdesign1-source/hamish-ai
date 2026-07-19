# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # run a production build locally
npm run lint     # eslint (flat config, eslint.config.mjs)
```

There is no test suite (no test runner is installed).

## What this is

Hamish AI — a Next.js 16 / React 19 marketing site for a fictional (but being operated as a real, live) one-person Edinburgh AI consultancy. It's both an app and its own case study: the site sells "AI transformation," runs a real Claude-powered chatbot, and its portfolio consists of five fully-built fictional client sites used as live demos.

## Architecture

### Two route groups with different chrome

- `src/app/(site)/*` — the agency's own marketing pages (home, `/services`, `/ai-solutions`, `/portfolio`, `/portfolio/[slug]`, `/contact`). Layout (`(site)/layout.tsx`) wraps children in `SiteHeader` / `SiteFooter` / `ChatWidget`.
- `src/app/demo/*` — five standalone fictional client sites (`the-gannet`, `craigie-and-sons`, `assembly-rooms-hotel`, `forge-fitness`, `lomond-and-grey`). These do **not** get the agency header/footer/chatbot — `demo/layout.tsx` only adds a `DemoBanner` disclaimer strip. Treat each demo page as its own self-contained site design; don't assume agency components apply there.

The portfolio has two layers that must stay in sync manually: the **case study page** (`(site)/portfolio/[slug]`, driven by `src/lib/case-studies-data.ts`) narrates a demo site's fictional results, and the **demo page itself** (`app/demo/<slug>`) is the "real" clickable site being narrated. When updating one, check whether the other needs a matching change (e.g. new photography added to a demo page's gallery vs. the case study's featured image).

### Content lives in data files, not JSX

Three files drive most of the site's copy/structure, so page components are thin renderers over them:
- `src/lib/site-config.ts` — site name/nav/contact info and the three pricing packages.
- `src/lib/ai-solutions-data.ts` — the six AI solutions (shared by the homepage grid and `/ai-solutions`), each with a chat-demo transcript and an `image` path.
- `src/lib/case-studies-data.ts` — one entry per demo site (challenge/solution bullets, stats, testimonial, accent colors, optional `signatureImage`), rendered through the components in `src/components/case-study/*`.

When adding a new AI solution or case study, add data here first — the pages iterate over these arrays and mostly don't need touching.

### Chat widget and lead capture degrade gracefully without env vars

`src/app/api/chat/route.ts` calls the real Anthropic API (model from `ANTHROPIC_MODEL`, default `claude-haiku-4-5-20251001`) with a `save_lead` tool the model calls once it has a name+email. If `ANTHROPIC_API_KEY` is unset, it falls back to canned replies from `src/lib/chat-fallback.ts` instead of erroring — this is deliberate so the site still "works" in environments without the key configured, not a bug to fix.

`src/lib/save-lead.ts` writes to Supabase (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) and emails via Resend (`RESEND_API_KEY`, sent to `CONTACT_TO_EMAIL`) — both are independently optional; missing either just logs and skips that path rather than failing the request. `src/app/api/contact/route.ts` (the `/contact` form) follows the same "log if no Resend key" pattern. Keep new integrations following this same optional/degrade pattern rather than requiring every env var to be set.

The chat widget (`src/components/chat-widget.tsx`) is page-aware: it inspects the current pathname for `/portfolio/<slug>` and, if found, passes that case study's details as `project` context so the assistant can answer questions about the specific project being viewed instead of giving generic answers. `chat-rate-limit.ts` is an in-memory per-IP limiter — note in its own comment that it's a soft cap only (doesn't share state across serverless instances).

Env vars in use: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.

### Design tokens and components

- `src/app/globals.css` defines the whole palette as OKLCH custom properties (`:root`/`.dark`), including brand gradient tokens (`--gradient-blue`, `--gradient-cyan`, `--gradient-violet`) used by the `.gradient-text` / `.gradient-button` / `.aurora-bg` utility classes. Change brand colors here, not per-component.
- `Tailwind v4 + Lightning CSS silently drops any rule using `color-mix()`` with no build error. Use precomputed `oklch(... / X%)` alpha values instead (see how the gradient-soft/-glow tokens are defined).
- `src/components/ui/*` is shadcn/ui built on **Base UI**, not Radix. Polymorphism uses a `render` prop (e.g. `<Button render={<Link href="/contact" />}>`), not `asChild`. `Button` also takes a `nativeButton` prop that defaults to `!props.render` — don't hardcode it without checking this default.
- Verify lucide-react icon names exist before using them (`node_modules/lucide-react/dynamicIconImports.d.ts`) — several expected names don't exist in the installed version (e.g. no `Concierge`, use `ConciergeBell`; no `BarChart3`, use `ChartColumn`).

### Brand imagery pipeline

Custom illustrations/diagrams under `public/images/{ai-solutions,case-studies,homepage}/` were produced via Canva (AI design generation) and Figma (FigJam diagram + Plugin API restyling), not hand-drawn or stock. Both tools have real usage quotas — Canva generation has a daily cap and Figma's Starter plan has an MCP tool-call limit, so batch/verify locally before large re-generation runs. If recreating this workflow: Figma sections in FigJam do not reliably preserve child coordinates when nodes are `appendChild`'d into them (a real, reproducible quirk) — use `figma.group()` instead, or recompute the section's bounds from its children's post-reparent coordinates.

### Deployment

Hosted on Vercel, custom domain `hamishai.org` (apex redirects to `www`), repo at `github.com/hamishwebdesign1-source/hamish-ai`. Outbound email domain is verified on Resend. Env vars are configured in the Vercel project, not committed (`.env.local` is gitignored).
