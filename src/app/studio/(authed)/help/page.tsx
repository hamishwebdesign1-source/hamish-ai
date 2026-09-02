import { HelpCircle } from "lucide-react";
import { RestartTourButton } from "@/components/platform/restart-tour-button";
import { HelpFaqList } from "@/components/platform/help-faq-list";
import { STUDIO_FAQS } from "@/lib/studio-help-faqs";

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

export default function StudioHelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Help</h1>
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
    </div>
  );
}
