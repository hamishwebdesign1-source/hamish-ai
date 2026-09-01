import { CheckCircle2, CircleAlert } from "lucide-react";
import { readProposalToken } from "@/lib/proposal-tokens";
import { formatRateCardPrice } from "@/lib/rate-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptProposal } from "./actions";

// Studio big-ticket ("proposal send-and-track workflow") — a public,
// no-account "view proposal" page a prospect can open straight from the
// email sendProposal() (prospects/actions.ts) sends them. Same public,
// no-auth shape as /studio-action/[token]: outside both /studio/(authed)
// (session-gated) and /demo (which gets its own DemoBanner chrome) — a
// slug is the whole access model, same as /go/[slug] and /studio-action.
//
// Deliberately neutral chrome, not HamishAI's own brand gradient/aurora
// styling — this page represents whichever *tenant* org sent the
// proposal, not HamishAI itself, so borrowing HamishAI's own visual
// identity here would misrepresent who it's actually from. The one bit
// of brand color it does show is the sending org's own accentColor
// (rate-card.ts/organisations.brand), same accent the PDF version of
// this same proposal already uses.

export const metadata = { title: "Proposal" };

function Shell({ children, accentColor }: { children: React.ReactNode; accentColor?: string | null }) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-12 sm:py-16">
      <Card className="w-full max-w-lg overflow-hidden">
        {accentColor && <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />}
        <CardContent className="space-y-5 py-6">{children}</CardContent>
      </Card>
    </main>
  );
}

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accepted?: string; error?: string }>;
}) {
  const { token } = await params;
  const { accepted: acceptedParam, error } = await searchParams;
  const view = await readProposalToken(token);

  if (!view) {
    return (
      <Shell>
        <div className="text-center">
          <CircleAlert className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">This link isn&apos;t valid.</p>
        </div>
      </Shell>
    );
  }

  if (view.expired) {
    return (
      <Shell accentColor={view.accentColor}>
        <div className="text-center">
          <CircleAlert className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">This proposal link has expired.</p>
          {view.contactEmail && (
            <p className="mt-1 text-sm text-muted-foreground">
              Get in touch with {view.orgName} at{" "}
              <a href={`mailto:${view.contactEmail}`} className="underline">
                {view.contactEmail}
              </a>{" "}
              for an up-to-date copy.
            </p>
          )}
        </div>
      </Shell>
    );
  }

  const accepted = view.accepted || acceptedParam === "1";
  const { overview, included, timeline_note: timelineNote } = view.proposalOutline;

  return (
    <Shell accentColor={view.accentColor}>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase">{view.orgName}</p>
        <h1 className="mt-1 font-heading text-xl font-semibold">Proposal for {view.prospectBusinessName}</h1>
      </div>

      <p className="text-sm text-foreground">{overview}</p>

      {included.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">What&apos;s included</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {included.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {timelineNote && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">Timeline</p>
          <p className="mt-1 text-sm text-muted-foreground">{timelineNote}</p>
        </div>
      )}

      {view.rateCard.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">Pricing</p>
          <div className="mt-1.5 space-y-1">
            {view.rateCard.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-medium">{formatRateCardPrice(item)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {accepted ? (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            Accepted{view.contactEmail ? ` — ${view.orgName} will be in touch at ${view.contactEmail} to get started.` : `. ${view.orgName} will be in touch to get started.`}
          </span>
        </div>
      ) : (
        <form action={acceptProposal}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" className="w-full">
            Accept this proposal
          </Button>
        </form>
      )}

      {view.contactEmail && !accepted && (
        <p className="text-center text-xs text-muted-foreground">
          Questions first? Email{" "}
          <a href={`mailto:${view.contactEmail}`} className="underline">
            {view.contactEmail}
          </a>
          .
        </p>
      )}
    </Shell>
  );
}
