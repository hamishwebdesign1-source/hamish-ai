"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";

export async function updateTaskStatus(taskId: string, status: string, revalidate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("title, request_id")
    .single();

  if (error) console.error("Failed to update task status:", error);

  // Only "done" gets a client email — todo/in_progress are internal-workflow
  // states the client has no action to take on, so notifying them would just
  // be noise (same reasoning as the awaiting_info-only trigger in triageRequest).
  if (status === "done" && task?.request_id) {
    const { data: request } = await supabase
      .from("requests")
      .select("client_id")
      .eq("id", task.request_id)
      .single();

    if (request?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("business_name, email")
        .eq("id", request.client_id)
        .single();

      if (client?.email) {
        await sendClientEmail(
          client.email,
          `Done: ${task.title}`,
          `Hi,\n\nJust a quick update — "${task.title}" is finished.\n\nLog into your portal any time to see everything else in progress.\n\n— Hamish AI`
        );
      }
    }
  }

  revalidatePath(revalidate);
}

export async function updateDraftResponse(requestId: string, formData: FormData) {
  const draftResponse = String(formData.get("draft_response") || "");
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("requests")
    .update({ draft_response: draftResponse })
    .eq("id", requestId);

  if (error) console.error("Failed to update draft response:", error);

  revalidatePath(`/admin/requests/${requestId}`);
}
