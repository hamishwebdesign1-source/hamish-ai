import { getSupabaseAdmin } from "@/lib/supabase";
import { researchLead } from "@/lib/research-lead";
import { logAuditEvent } from "@/lib/audit-log";

// Deep research pipeline Phase 1 (docs/deep-research-pipeline-plan.md) —
// the orchestrator that turns "a lead just got a concept page linked"
// into a tracked background run. researchLead() itself already does the
// actual work (site-check + one Claude call, now concept-page-aware —
// see research-lead.ts); this just wraps it with a research_jobs row so
// the Queued/Researching/Analysing/Completed/Failed/Needs Review status
// the brief asked for is real and durable, not implied.

export async function createResearchJob(prospectId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("research_jobs")
    .insert({ prospect_id: prospectId, status: "queued" })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create research job:", error);
    return null;
  }
  return data.id;
}

async function setJobStatus(jobId: string, status: string, extra: Record<string, unknown> = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from("research_jobs").update({ status, ...extra }).eq("id", jobId);
  if (error) console.error(`Failed to update research job ${jobId} to ${status}:`, error);
}

// Called from Next's after() in updateLeadConceptSlug — runs post-response,
// without blocking the concept-slug save the admin is waiting on. Never
// throws outward: this executes with no request left to return an error
// to, so every failure path has to resolve into a job-status row instead.
export async function runResearchJob(jobId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: job } = await supabase.from("research_jobs").select("prospect_id").eq("id", jobId).single();
  if (!job) return;

  try {
    await setJobStatus(jobId, "researching", { started_at: new Date().toISOString() });

    // researchLead() does the deterministic site-check and the one Claude
    // call as a single pass — there's no clean midpoint to report
    // "analysing" from separately without a redundant extra write, so this
    // status simply covers researchLead()'s full run, site-check through
    // to the AI call.
    await setJobStatus(jobId, "analysing");

    const result = await researchLead(job.prospect_id);

    if ("error" in result) {
      // Not a crash — a lead with no website on file, or the AI genuinely
      // not returning usable output, is something a human should glance
      // at, same distinction the brief's own status list draws between
      // "failed" and "needs review".
      await setJobStatus(jobId, "needs_review", { error: result.error, completed_at: new Date().toISOString() });
      return;
    }

    await setJobStatus(jobId, "completed", { completed_at: new Date().toISOString() });
    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "lead.deep_research_completed",
      targetType: "prospect",
      targetId: job.prospect_id,
      metadata: { job_id: jobId, score: result.score },
    });
  } catch (err) {
    console.error(`Research job ${jobId} crashed:`, err);
    await setJobStatus(jobId, "failed", { error: String(err), completed_at: new Date().toISOString() });
  }
}
