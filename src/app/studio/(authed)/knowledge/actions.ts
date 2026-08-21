"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";

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
