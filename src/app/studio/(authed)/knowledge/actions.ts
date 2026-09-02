"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractTextFromFile } from "@/lib/document-text";
import { extractKnowledgeEntries } from "@/lib/extract-knowledge-entries";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { logAiCall } from "@/lib/ai-call-log";

// Same session-derivation as every other /studio actions.ts file.
async function requireOrgId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return membership.orgId;
}

// Same usage/rate-limit discipline as every other Studio AI Server
// Action (website-builder/actions.ts's own checkAiUsage()) — kept as
// its own local copy, same convention.
async function checkAiUsage(
  orgId: string
): Promise<
  | { allowed: true; isInternal: boolean }
  | { allowed: false; isInternal: false; rateLimited: true }
  | { allowed: false; isInternal: false; rateLimited: false; used: number; limit: number }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return { allowed: true, isInternal: false };

  const { data: org } = await admin.from("organisations").select("plan, is_internal").eq("id", orgId).single();
  if (!org || org.is_internal) return { allowed: true, isInternal: true };

  if (await isStudioActionRateLimited(orgId)) return { allowed: false, isInternal: false, rateLimited: true };

  const usage = await getUsageStatus(orgId, "knowledge_document_imported", org.plan as PlatformPlanSlug);
  if (!usage.allowed) return { allowed: false, isInternal: false, rateLimited: false, used: usage.used, limit: usage.limit };
  return { allowed: true, isInternal: false };
}

function aiUsageErrorMessage(usageCheck: { rateLimited: true } | { rateLimited: false; used: number; limit: number }): string {
  if (usageCheck.rateLimited) return "You're doing that a lot right now — wait a few minutes and try again.";
  return `Monthly limit reached (${usageCheck.used} of ${usageCheck.limit}) — try again next month.`;
}

// Prerequisite for both the portal's own AI Copilot (which already reads
// this table, but nothing before this let a tenant write to it) and the
// planned embeddable client-website chatbot (same content source, FAQ/
// support facts only). org_id is set explicitly on every insert — the
// column defaults to HamishAI's own internal org id
// (schema-knowledge-base-org-scope.sql), the same hidden-default-org bug
// class already found and fixed on requests.org_id and invoices.org_id
// this session; getting this one right from the first write avoids
// repeating it a third time.
export async function createKnowledgeEntry(clientId: string | null, title: string, content: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  if (!trimmedTitle || !trimmedContent) return { error: "Both a title and the answer are required." };

  if (clientId) {
    const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
    if (!client) return { error: "Client not found." };
  }

  const { error } = await admin
    .from("knowledge_base")
    .insert({ org_id: orgId, client_id: clientId, title: trimmedTitle, content: trimmedContent });
  if (error) return { error: "Failed to save the entry." };

  revalidatePath("/studio/knowledge");
  return { ok: true as const };
}

export async function updateKnowledgeEntry(entryId: string, title: string, content: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  if (!trimmedTitle || !trimmedContent) return { error: "Both a title and the answer are required." };

  const { error } = await admin
    .from("knowledge_base")
    .update({ title: trimmedTitle, content: trimmedContent })
    .eq("id", entryId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to save the entry." };

  revalidatePath("/studio/knowledge");
  return { ok: true as const };
}

export async function deleteKnowledgeEntry(entryId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.from("knowledge_base").delete().eq("id", entryId).eq("org_id", orgId);
  if (error) return { error: "Failed to delete the entry." };

  revalidatePath("/studio/knowledge");
  return { ok: true as const };
}

// Studio big-ticket ("Knowledge Base AI document import") — the tenant
// equivalent of importKnowledgeFromDocument() (/admin/(authed)/knowledge/
// page.tsx), which has existed for HamishAI's own knowledge base since
// extract-knowledge-entries.ts shipped. Deliberately extraction-only,
// not extraction-then-insert the way the admin version is: EntryForm's
// own comment already documents this app's convention for AI-suggested
// content ("importing research doesn't skip the human-reviews-before-it-
// saves step every other AI-touched save in this app follows") — a
// tenant reviews and can edit/drop entries before anything is saved, via
// importKnowledgeEntries() below, same as ResearchImportCard's own flow
// just with more than one entry at a time.
export async function extractKnowledgeFromDocument(
  formData: FormData
): Promise<{ entries: { title: string; content: string }[] } | { error: string }> {
  const orgId = await requireOrgId();

  const usageCheck = await checkAiUsage(orgId);
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  const file = formData.get("document") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file first." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractTextFromFile(buffer, file.name);
  if (!text.trim()) return { error: "Couldn't read any text from that file." };

  const startedAt = Date.now();
  const result = await extractKnowledgeEntries(text);
  // Studio big-ticket ("Model Performance completeness").
  logAiCall(orgId, "knowledge_import", { success: "entries" in result, latencyMs: Date.now() - startedAt });
  if ("error" in result) return result;
  if (!result.entries.length) return { error: "No usable business facts found in that document." };

  if (!usageCheck.isInternal) await recordUsageEvent(orgId, "knowledge_document_imported");
  return result;
}

// The actual save, called once a tenant's reviewed (and possibly edited
// or dropped some of) the extracted entries — same createKnowledgeEntry()
// ownership shape, just a bulk insert since there can be many entries
// from one document.
export async function importKnowledgeEntries(clientId: string | null, entries: { title: string; content: string }[]) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const cleaned = entries.map((e) => ({ title: e.title.trim(), content: e.content.trim() })).filter((e) => e.title && e.content);
  if (!cleaned.length) return { error: "Nothing to save." };

  if (clientId) {
    const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
    if (!client) return { error: "Client not found." };
  }

  const { error } = await admin
    .from("knowledge_base")
    .insert(cleaned.map((e) => ({ org_id: orgId, client_id: clientId, title: e.title, content: e.content })));
  if (error) return { error: "Failed to save the extracted entries." };

  revalidatePath("/studio/knowledge");
  return { ok: true as const, count: cleaned.length };
}
