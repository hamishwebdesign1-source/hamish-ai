"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInvoice } from "@/lib/create-invoice";

// Same session-derivation as every other /studio actions.ts file.
async function requireOrgId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return membership.orgId;
}

// createInvoice() itself refuses to run for a tenant with no Connect
// account or unfinished onboarding (create-invoice.ts) — this action's
// own ownership check is the same belt-and-braces pattern as every other
// /studio Server Action, confirming the client id passed in actually
// belongs to the caller's own org before spending an API call on it.
export async function createClientInvoice(clientId: string, amountPounds: number, description: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!amountPounds || amountPounds <= 0) return { error: "Enter an amount greater than £0." };
  if (!description.trim()) return { error: "Enter what this invoice is for." };

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
  if (!client) return { error: "Client not found." };

  const result = await createInvoice({
    clientId,
    amountPence: Math.round(amountPounds * 100),
    description: description.trim(),
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/studio/clients");
  return { ok: true as const, invoiceUrl: result.invoiceUrl };
}
