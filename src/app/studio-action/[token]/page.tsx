import Link from "next/link";
import { CheckCircle2, CircleAlert, ArrowRight } from "lucide-react";
import { readDigestActionToken, type DigestAction } from "@/lib/digest-action-tokens";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { confirmDigestAction } from "./actions";

// Roadmap item #4 — the confirmation page behind every one-click action
// link in owner-digest.ts's weekly email. Deliberately a real page with a
// real button, not a bare GET-triggers-action link: see
// schema-digest-action-tokens.sql for why (email security scanners
// pre-fetch links). No auth here at all — the token itself, minted
// per-item at digest-build time from an already-org-scoped query, is the
// only credential this needs.
//
// Public route, outside both /studio/(authed) (session-gated) and
// middleware.ts's matcher (which only covers /admin and /api/internal) —
// same "a slug is the whole access model" shape as /go/[slug].

const ACTION_VERB: Record<DigestAction, string> = {
  mark_prospect_contacted: "Mark as contacted",
  mark_request_responded: "Mark as responded",
  mark_project_done: "Mark as done",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 text-center">{children}</CardContent>
      </Card>
    </main>
  );
}

function StudioLink() {
  return (
    <Button size="sm" variant="outline" render={<Link href="https://hamishai.org/studio" />}>
      Open Studio
      <ArrowRight className="size-3.5" />
    </Button>
  );
}

export default async function DigestActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const { done, error } = await searchParams;
  const view = await readDigestActionToken(token);

  if (!view) {
    return (
      <Shell>
        <CircleAlert className="mx-auto size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">This link isn&apos;t valid.</p>
        <StudioLink />
      </Shell>
    );
  }

  if (view.used) {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto size-8 text-accent" />
        <p className="text-sm font-medium">{done === "1" ? "Done." : "Already handled."}</p>
        <p className="text-sm text-muted-foreground">{view.label}</p>
        <StudioLink />
      </Shell>
    );
  }

  if (view.expired) {
    return (
      <Shell>
        <CircleAlert className="mx-auto size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">This link has expired.</p>
        <StudioLink />
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm font-medium">{view.label}</p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <form action={confirmDigestAction}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" className="w-full">
          {ACTION_VERB[view.action]}
        </Button>
      </form>
    </Shell>
  );
}
