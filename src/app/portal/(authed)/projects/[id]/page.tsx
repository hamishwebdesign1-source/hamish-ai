import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { PORTAL_PROJECT_STAGE_META, isProjectStage } from "@/lib/project-stages";
import { formatDate, daysUntil, dueDateNote } from "@/lib/project-dates";

// Projects Kanban Command Centre, Phase C1 — the portal's first-ever
// per-project detail page (docs/ai-team/BACKLOG.md's matching entry;
// DECISIONS.md's matching 2026-09-03 design-pass entry). Copies
// /studio/projects/[id]'s *structure* (back-link → title → stacked
// sections) only, rendered in the portal's own established idiom
// (text-page-title/text-page-subtitle, no Eyebrow, no extra max-w-3xl —
// portal/(authed)/layout.tsx already constrains `main` to max-w-6xl
// minus the sidebar) per DESIGN-SYSTEM.md's "Page structure" addendum.
// Never renders ProjectStageTracker/PROJECT_STAGES — project-stages.ts's
// own comment is explicit that a client should never see an internal
// stage label like "Internal review" verbatim; the single portal-safe
// pill (PORTAL_PROJECT_STAGE_META) is the only stage UI this page gets.
export default async function PortalProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");

  // Session-scoped client — projects_select_own RLS
  // (schema-rls-projects-client-portal.sql) enforces the same
  // client_members boundary independently of this .eq() getting it right.
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, stage, status, target_date")
    .eq("id", id)
    .eq("client_id", membership.clientId)
    .maybeSingle();

  if (!project) notFound();

  const visibleToClient = project.stage === "client_review" || project.stage === "completed";

  // deliverables_select_own RLS (schema-deliverables.sql) already gates
  // this on the exact same stage check — only querying when the stage
  // makes rows visible avoids a round trip that RLS would return empty
  // anyway, and keeps the two honest empty-state reasons below distinct
  // rather than conflated into one generic "nothing here."
  const { data: deliverablesData } = visibleToClient
    ? await supabase
        .from("deliverables")
        .select("id, title, description, link_url, submitted_at")
        .eq("project_id", project.id)
        .order("submitted_at", { ascending: true })
    : { data: [] };
  const deliverables = deliverablesData ?? [];

  const stageMeta = isProjectStage(project.stage)
    ? PORTAL_PROJECT_STAGE_META[project.stage]
    : project.status === "done"
      ? { label: "Completed", className: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]" }
      : { label: "In progress", className: "bg-accent/15 text-accent" };

  const days = project.target_date && project.status !== "done" ? daysUntil(project.target_date) : null;

  return (
    <div>
      <Link href="/portal/insights" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Insights
      </Link>

      <h1 className="text-page-title mt-4">{project.name}</h1>
      <p className="text-page-subtitle mt-1 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${stageMeta.className}`}>
          {stageMeta.label}
        </span>
        {days !== null && <span>{dueDateNote(project.target_date!)}</span>}
      </p>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Deliverables</h2>
        {!visibleToClient ? (
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ll share what we&apos;re working on here once this project moves to review.
          </p>
        ) : deliverables.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing shared for review yet — check back soon.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {deliverables.map((d) => (
              <li key={d.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium">{d.title}</p>
                {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
                {d.link_url && (
                  <a
                    href={d.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex w-fit items-center gap-1 text-xs text-accent underline underline-offset-2"
                  >
                    <ExternalLink className="size-3" /> View link
                  </a>
                )}
                {/* submitted_by is staff-only even on a client-visible row
                    (DECISIONS.md's matching entry) — no display-name
                    resolution layer exists anywhere in this codebase, and
                    a deliverable becoming client-visible doesn't mean
                    every column on it should. Second person, date only. */}
                <p className="mt-2 text-xs text-muted-foreground">Shared with you on {formatDate(d.submitted_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
