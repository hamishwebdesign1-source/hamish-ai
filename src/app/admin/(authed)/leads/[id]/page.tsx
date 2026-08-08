import fs from "fs";
import path from "path";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Phone,
  Mail,
  MessageCircleReply,
  X,
  History,
  Sparkles,
  Send,
  Users,
} from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  updateLeadStatus,
  deleteLead,
  updateLeadEmail,
  updateLeadPhone,
  updateLeadConceptSlug,
  updateLeadNotes,
  markLeadReplied,
} from "@/app/admin/actions";
import { STATUSES, statusMeta, websiteHref, describeAuditEntry, COMMUNICATION_ACTIONS, type AuditEntry } from "@/lib/lead-meta";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactBadge } from "@/components/admin/contact-badge";
import { ResearchLeadButton } from "@/components/admin/research-lead-button";
import { SalesKitButton } from "@/components/admin/sales-kit-button";
import { ScheduleTeamsMeetingButton } from "@/components/admin/schedule-teams-meeting-button";

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// Detail-page-only wrapper around the shared deleteLead action — the list
// page just needs the row to disappear (revalidatePath handles that), but
// deleting from the page *showing* that lead needs to actually navigate
// away, or the next render has nothing to show.
async function deleteAndRedirect(leadId: string) {
  "use server";
  await deleteLead(leadId);
  redirect("/admin/leads");
}

// Wrapping Date.now() in a named helper, rather than calling it directly
// inside the component body, keeps the react-hooks purity lint rule happy
// — same pattern as daysSince() in lib/lead-meta.ts.
function isFuture(iso: string) {
  return new Date(iso).getTime() > Date.now();
}

// Portal redesign Stage 4 — the "complete AI account workspace" the brief
// asks for. Every section reuses an existing component or server action
// as-is (ResearchLeadButton, SalesKitButton, ScheduleTeamsMeetingButton,
// the contact-info edit forms, status buttons) — this page is an
// information-architecture change, not new functionality.
export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const [{ data: lead }, { data: auditRows }, { data: meetingRows }] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", id).single(),
    supabase
      .from("audit_log")
      .select("id, action, created_at, metadata")
      .eq("target_type", "prospect")
      .eq("target_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("lead_meetings").select("*").eq("prospect_id", id).order("scheduled_start", { ascending: false }),
  ]);

  if (!lead) notFound();

  let conceptSlugs: string[] = [];
  try {
    conceptSlugs = fs
      .readdirSync(path.join(process.cwd(), "src/app/concepts"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (err) {
    console.error("Failed to list concept pages:", err);
  }

  const audit: AuditEntry[] = auditRows ?? [];
  const meetings = meetingRows ?? [];
  const upcomingMeetings = meetings.filter((m) => m.status === "scheduled" && isFuture(m.scheduled_start));
  const pastMeetings = meetings.filter((m) => !upcomingMeetings.includes(m));
  const communications = audit.filter((e) => COMMUNICATION_ACTIONS.has(e.action));
  const nextMeeting = upcomingMeetings[upcomingMeetings.length - 1]; // ascending within the filtered set since source is desc

  const research = lead.research as {
    business_summary?: string;
    pursue_because?: string;
    weaknesses?: string[];
    ai_opportunities?: string[];
    recommended_services?: string[];
    suggested_sales_angle?: string;
    estimated_project_value_band?: string;
    conversion_probability_band?: string;
  } | null;

  return (
    <div>
      <Link href="/admin/leads" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" />
        Back to leads
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page-title">{lead.business_name}</h1>
            {lead.discovery_source && (
              <Badge variant="ai" className="gap-1">
                <Sparkles className="size-3" />
                AI-discovered
              </Badge>
            )}
          </div>
          <p className="text-page-subtitle mt-1">
            {[lead.category, lead.neighbourhood].filter(Boolean).join(" · ")}
            {lead.website && (
              <>
                {" · "}
                <a
                  href={websiteHref(lead.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-accent hover:underline"
                >
                  {lead.website}
                  <ExternalLink className="size-3" />
                </a>
              </>
            )}
            {lead.phone && (
              <>
                {" · "}
                <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-0.5 hover:underline">
                  <Phone className="size-3" />
                  {lead.phone}
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={statusMeta[lead.status as keyof typeof statusMeta]?.variant ?? "secondary"}>
            {statusMeta[lead.status as keyof typeof statusMeta]?.label ?? lead.status}
          </Badge>
          <ContactBadge lead={lead} />
          {lead.score != null && (
            <div className="flex items-center gap-0.5" title={`Score: ${lead.score}/5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`size-1.5 rounded-full ${n <= lead.score ? "bg-accent" : "bg-border"}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          {/* Overview — who they are, why they matter, and the fields that
              only a human ever edits directly. */}
          <section>
            <p className="text-section-title">Overview</p>
            <Card className="mt-3">
              <CardContent className="space-y-4 pt-6">
                {lead.signal && <p className="text-sm">{lead.signal}</p>}
                {lead.outreach_note && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Outreach: </span>
                    {lead.outreach_note}
                  </p>
                )}
                {research?.pursue_because && (
                  <p className="flex items-start gap-1.5 text-xs">
                    <Sparkles className="mt-0.5 size-3 shrink-0 text-[var(--gradient-violet)]" />
                    <span className="text-muted-foreground italic">&ldquo;{research.pursue_because}&rdquo;</span>
                  </p>
                )}

                <form action={updateLeadEmail.bind(null, lead.id)} className="flex items-center gap-1.5">
                  <Input name="email" type="email" defaultValue={lead.email ?? ""} placeholder="Add contact email…" className="h-8 max-w-72 text-xs" />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                </form>
                <form action={updateLeadPhone.bind(null, lead.id)} className="flex items-center gap-1.5">
                  <Input name="phone" type="tel" defaultValue={lead.phone ?? ""} placeholder="Add contact number…" className="h-8 max-w-72 text-xs" />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                </form>
                <form action={updateLeadConceptSlug.bind(null, lead.id)} className="flex items-center gap-1.5">
                  <select name="concept_slug" defaultValue={lead.concept_slug ?? ""} className={`${selectClasses} max-w-72`}>
                    <option value="">No concept page</option>
                    {conceptSlugs.map((slug) => (
                      <option key={slug} value={slug}>
                        {slug}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                  {lead.concept_slug && (
                    <a
                      href={`/concepts/${lead.concept_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                    >
                      View <ExternalLink className="size-3" />
                    </a>
                  )}
                </form>
                <form action={updateLeadNotes.bind(null, lead.id)} className="flex items-start gap-1.5">
                  <Textarea
                    name="notes"
                    defaultValue={lead.notes ?? ""}
                    placeholder="Notes — called, no answer, try Thursday…"
                    rows={2}
                    className="max-w-96 text-xs"
                  />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <form key={s} action={updateLeadStatus.bind(null, lead.id, s)}>
                        <Button type="submit" size="xs" variant={lead.status === s ? "default" : "outline"}>
                          {statusMeta[s].label}
                        </Button>
                      </form>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.status === "contacted" && !lead.replied_at && (
                      <form action={markLeadReplied.bind(null, lead.id)}>
                        <Button type="submit" variant="ghost" size="xs" className="gap-1 text-muted-foreground">
                          <MessageCircleReply className="size-3" />
                          Mark replied
                        </Button>
                      </form>
                    )}
                    <form action={deleteAndRedirect.bind(null, lead.id)}>
                      <Button type="submit" variant="ghost" size="xs" className="gap-1 text-muted-foreground hover:text-destructive">
                        <X className="size-3" />
                        Delete lead
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* AI Intelligence — company research, opportunities, pain
              points, buying signals, recommended strategy. Open by default
              here (unlike the list page) since it's a primary section of
              this workspace, not one of several buttons on a dense row. */}
          <section>
            <p className="text-section-title">AI Intelligence</p>
            <div className="mt-3">
              <ResearchLeadButton
                leadId={lead.id}
                initialResearch={lead.research ?? null}
                initialGeneratedAt={lead.research_generated_at ?? null}
                defaultExpanded
              />
            </div>
          </section>

          {/* AI Actions + Human Actions — the sales kit's own "generate,
              review, Approve & Send / Copy / Regenerate" pattern already
              implements the brief's human-in-the-loop principle; this
              section just gives it a proper home instead of a small
              button buried on the list row. */}
          <section>
            <p className="text-section-title">AI Actions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              What AI has drafted. Nothing sends without you reviewing it first — Save to Gmail creates a real draft, it never sends automatically.
            </p>
            <div className="mt-3">
              <SalesKitButton
                leadId={lead.id}
                phone={lead.phone}
                isFollowUp={lead.status === "contacted"}
                hasPendingDraft={Boolean(lead.pending_email_message_id)}
                alreadySent={lead.status === "contacted" && lead.last_contact_method !== "call"}
                initialKit={lead.sales_kit ?? null}
                initialGeneratedAt={lead.sales_kit_generated_at ?? null}
                defaultExpanded
              />
            </div>
          </section>

          {/* Meetings — schedule new ones, see what's upcoming, and a
              record of past ones. Transcript/summary fields aren't here
              yet — that's Phase 2/3 of docs/teams-meeting-intelligence-plan.md,
              currently paused on cost. */}
          <section>
            <p className="text-section-title">Meetings</p>
            <div className="mt-3">
              <ScheduleTeamsMeetingButton
                leadId={lead.id}
                initialMeeting={
                  nextMeeting ? { joinUrl: nextMeeting.join_url, scheduledStart: nextMeeting.scheduled_start } : null
                }
              />
            </div>
            {pastMeetings.length > 0 && (
              <ul className="mt-3 space-y-2">
                {pastMeetings.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                    <span>{new Date(m.scheduled_start).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <Badge variant="outline">{m.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Communications — a filtered view of the same audit log the
              full Timeline shows below, scoped to actual email/call
              touches, per the brief's separate "Communications" ask.
              There's no separate email-log table to build this from — every
              real communications event already gets logged via
              logAuditEvent() on the actions that send it. */}
          <section>
            <p className="text-section-title">Communications</p>
            {communications.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No emails or calls logged yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {communications.map((entry, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <Send className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p>{describeAuditEntry(entry)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(entry.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Timeline — every interaction and automated action, full
              history (the list page's version of this is a truncated
              <details> per row; here it's the primary record). */}
          <section>
            <p className="flex items-center gap-1.5 text-section-title">
              <History className="size-4" />
              Timeline
            </p>
            {audit.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 border-l border-border pl-3">
                {audit.map((entry, i) => (
                  <li key={i} className="text-sm">
                    <span>{describeAuditEntry(entry)}</span>{" "}
                    <span className="text-xs text-muted-foreground">— {timeAgo(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Quick-facts sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Found</span>
                <span>{lead.found_at ? new Date(lead.found_at).toLocaleDateString("en-GB") : "—"}</span>
              </div>
              {research?.estimated_project_value_band && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Est. value</span>
                  <Badge variant="secondary">{research.estimated_project_value_band}</Badge>
                </div>
              )}
              {research?.conversion_probability_band && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Conversion</span>
                  <Badge variant={research.conversion_probability_band === "high" ? "success" : "secondary"}>
                    {research.conversion_probability_band}
                  </Badge>
                </div>
              )}
              {research?.recommended_services && research.recommended_services.length > 0 && (
                <div>
                  <p className="text-muted-foreground">Recommended</p>
                  <p className="mt-0.5 text-foreground">{research.recommended_services.join(", ")}</p>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-accent hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {lead.discovery_source && (
            <Card className="border-[color-mix(in_oklch,var(--gradient-violet),transparent_75%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Users className="size-3.5" />
                  Why AI suggested this
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {(lead.discovery_source as { why_suggested?: string }).why_suggested}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
