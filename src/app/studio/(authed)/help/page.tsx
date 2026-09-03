import type { Metadata } from "next";
import { HelpCircle, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RestartTourButton } from "@/components/platform/restart-tour-button";
import { HelpFaqList } from "@/components/platform/help-faq-list";
import { STUDIO_FAQS } from "@/lib/studio-help-faqs";
import { submitFeedback } from "./actions";

// SEO/metadata audit (2 Sep 2026) — see studio/(authed)/page.tsx for the
// full reasoning (every real page under here gets its own real title).
// Title updated (Studio Design Audit, Tier 5 item #13) to cover the
// feedback form now rendered on this same page.
export const metadata: Metadata = { title: "Help & Feedback | Studio" };

// Studio-side help (P1 platform readiness item) — the client portal has
// had a Help/FAQ page since Week 3; Studio, the agency owner's own side,
// had none. Unlike the portal's knowledge_base-backed FAQ (tenant-authored
// content about their own business, answered per-client), this is fixed
// platform documentation about how to use the Agency Platform itself —
// the same for every tenant, so static content here is correct, not a
// missing feature to build a CMS for.
// Content enrichment pass — this page hadn't kept up with everything
// shipped since it was first written: team collaboration/assignment,
// proposal send-and-track, the embedded chatbot's lead capture, client
// portal self-serve team management, Knowledge Base document import,
// and Website Builder's own tool guides and prompt library all launched
// with no FAQ coverage at all. Every entry below describes something
// that's genuinely built and live — same "real feature or nothing" rule
// as everywhere else in this app, nothing here is aspirational.
//
// Moved to studio-help-faqs.ts (Studio AI Assistant build) so the new
// global assistant widget can ground "how do I…" questions in the exact
// same content this page shows, rather than a second copy that could
// drift.
//
// Studio Design Audit, Tier 5 item #13 — Feedback (its own standalone
// route/nav item, formerly feedback/page.tsx + feedback/actions.ts) was
// merged onto this page rather than kept separate: both were the two
// thinnest, correctly minimal pages in Studio, and a dedicated nav slot
// for "one textarea, one send action" was real nav clutter, not real
// information architecture. The backend is untouched — submitFeedback
// (now living in this route's own actions.ts, moved verbatim other than
// its redirect target) still does exactly what it always did, straight
// to Hamish's inbox via sendFeedbackAlert. /studio/feedback itself now
// 301s here (see next.config.ts) so no stale bookmark or nav reference
// dead-ends.
export default async function StudioHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Help &amp; Feedback</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Common questions about running your agency on this platform. Something else? Email{" "}
        <a href="mailto:hello@hamishai.org" className="text-accent underline underline-offset-2">
          hello@hamishai.org
        </a>
        .
      </p>

      <div className="mt-4">
        <RestartTourButton />
      </div>

      <div className="mt-8">
        <HelpFaqList faqs={STUDIO_FAQS} />
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <HelpCircle className="size-4 shrink-0" />
        Nothing here covers it? Email us — real questions become real FAQ entries.
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <MessageSquare className="size-4.5" />
          </span>
          <div>
            <h2 className="font-heading text-xl font-semibold">Feedback</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell us what&apos;s working, what isn&apos;t, or what you wish this did.</p>
          </div>
        </div>

        {sent === "success" && (
          <p className="mt-6 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent">
            Sent — thanks. Real feedback shapes what gets built next.
          </p>
        )}
        {error && (
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        <form action={submitFeedback} className="mt-6 space-y-4">
          <Textarea
            name="message"
            required
            rows={6}
            placeholder="What's on your mind — a bug, something confusing, a feature you need..."
          />
          <Button type="submit">Send feedback</Button>
        </form>
      </div>
    </div>
  );
}
