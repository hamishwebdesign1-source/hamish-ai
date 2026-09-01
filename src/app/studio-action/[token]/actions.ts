"use server";

import { redirect } from "next/navigation";
import { consumeDigestActionToken } from "@/lib/digest-action-tokens";

// Roadmap item #4 — the one write path this whole route exists for.
// Deliberately a form POST, not the GET the link in the email itself
// carries: an email security scanner pre-fetching that GET link only
// ever renders the confirmation page (page.tsx), never reaches this
// function. Only a real click on the page's own Confirm button submits
// this form.
export async function confirmDigestAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/studio-action/invalid");

  const result = await consumeDigestActionToken(token);
  if ("error" in result) {
    redirect(`/studio-action/${token}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/studio-action/${token}?done=1`);
}
