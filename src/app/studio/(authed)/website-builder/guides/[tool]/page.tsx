import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench, MessageSquare, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/eyebrow";
import { AI_CODING_TOOLS, type ToolId } from "@/lib/ai-coding-tools";
import { AI_CODING_TOOL_GUIDES } from "@/lib/ai-coding-tool-guides";

function isToolId(value: string): value is ToolId {
  return value in AI_CODING_TOOLS;
}

function GuideSection({ icon: Icon, title, paragraphs }: { icon: typeof Wrench; title: string; paragraphs: string[] }) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-accent" />
        <p className="font-heading text-sm font-semibold">{title}</p>
      </div>
      <div className="mt-2 space-y-2.5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

// AI Website Creation Guide, WB4 — the dedicated tool walkthrough pages
// (plan doc §6-8, deliberately deferred out of WB1-3). Auth is already
// gated by studio/(authed)/layout.tsx for the whole tree, and this page
// has no org-scoped data to fetch (the content is generic tool
// documentation, not tied to a project), so it doesn't repeat its own
// getUser()/membership check the way pages with real data queries do.
export default async function ToolGuidePage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!isToolId(tool)) notFound();

  const profile = AI_CODING_TOOLS[tool];
  const guide = AI_CODING_TOOL_GUIDES[tool];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/studio/website-builder" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Website Builder
      </Link>
      <Eyebrow className="mt-4">Tool guide</Eyebrow>
      <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">Using {profile.name}</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">{profile.description}</p>

      <GuideSection icon={Wrench} title="Getting set up" paragraphs={guide.gettingSetUp} />
      <GuideSection icon={MessageSquare} title="How working with it actually feels" paragraphs={guide.workingWithIt} />
      <GuideSection icon={Sparkles} title="Making the most of it for this build" paragraphs={guide.makingTheMostOfIt} />

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-accent" />
          <p className="font-heading text-sm font-semibold">Common issues</p>
        </div>
        <div className="mt-2 space-y-2">
          {guide.commonIssues.map((c, i) => (
            <Card key={i}>
              <CardContent className="py-3.5">
                <p className="text-sm font-medium">{c.issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.fix}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-accent" />
          <p className="font-heading text-sm font-semibold">Good habits</p>
        </div>
        <ul className="mt-2 space-y-1.5">
          {guide.goodHabits.map((habit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
              {habit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
