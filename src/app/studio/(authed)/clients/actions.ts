"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInvoice } from "@/lib/create-invoice";
import { logAuditEvent } from "@/lib/audit-log";
import { trackServerEvent } from "@/lib/analytics";

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

  await trackServerEvent(orgId, "invoice_created", { client_id: clientId, amount_pence: Math.round(amountPounds * 100) });

  revalidatePath("/studio/clients");
  return { ok: true as const, invoiceUrl: result.invoiceUrl };
}

// GDPR minimum-viable compliance, part 2 — real, immediate erasure of one
// client's data, for a tenant fulfilling their own client's deletion
// request. Bounded and appropriate for an instant self-service action
// (one client's data, tenant-initiated) unlike whole-account deletion
// (deleteAccount() in settings/actions.ts), which is request-mediated
// instead — a single unconfirmed click hard-deleting an entire paying
// org's data is a real risk this codebase hasn't earned the right to
// take casually yet.
//
// Clears every table with its own client_id foreign key first (none of
// them cascade), then the client row itself. Confirmed against the
// caller's own org_id before touching anything, same rule as every other
// action in this file. A converted prospect's own row is untouched —
// clients.source_lead_id points at it, not the other way round, so
// nothing else breaks when a client is removed.
export async function deleteClientData(clientId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: client } = await admin
    .from("clients")
    .select("id, business_name, email")
    .eq("id", clientId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!client) return { error: "Client not found." };

  const { data: requests } = await admin.from("requests").select("id").eq("client_id", clientId);
  const requestIds = (requests ?? []).map((r) => r.id);
  if (requestIds.length) {
    await admin.from("tasks").delete().in("request_id", requestIds);
  }

  await admin.from("client_google_analytics").delete().eq("client_id", clientId);
  await admin.from("client_members").delete().eq("client_id", clientId);
  await admin.from("knowledge_base").delete().eq("client_id", clientId);
  await admin.from("invoices").delete().eq("client_id", clientId);
  await admin.from("requests").delete().eq("client_id", clientId);

  // Three more real foreign keys to clients, found by live-testing this
  // function against a real client before shipping it (the delete failed
  // outright the first time — none of these three were in the list
  // above). audit_log and processed_emails have a nullable client_id and
  // exist for operational/security record-keeping rather than being
  // personal data themselves — nulled rather than deleted, so that
  // history survives with the specific client reference severed, the
  // "preserve the record, sever the personal-data link" pattern GDPR
  // erasure actually calls for rather than scorched-earth deletion of
  // every row that ever mentioned this client. site_checks.client_id is
  // NOT NULL (a check result with no client makes no sense), so those
  // rows are deleted outright instead — uptime-check history, not
  // personal data.
  await admin.from("audit_log").update({ client_id: null }).eq("client_id", clientId);
  await admin.from("processed_emails").update({ client_id: null }).eq("client_id", clientId);
  await admin.from("site_checks").delete().eq("client_id", clientId);

  const { error } = await admin.from("clients").delete().eq("id", clientId);
  if (error) return { error: "Failed to delete this client's data." };

  await logAuditEvent({
    actor: orgId,
    actorType: "admin",
    action: "client.data_deleted",
    targetType: "client",
    targetId: clientId,
    metadata: { business_name: client.business_name, email: client.email },
  });

  revalidatePath("/studio/clients");
  return { ok: true as const };
}
