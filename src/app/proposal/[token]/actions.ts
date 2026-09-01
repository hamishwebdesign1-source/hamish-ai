"use server";

import { redirect } from "next/navigation";
import { acceptProposalToken } from "@/lib/proposal-tokens";

// Same GET-renders/POST-executes split as /studio-action/[token] — see
// that route's own actions.ts for why (email security scanners
// pre-fetching the link in the sent email only ever reach page.tsx's
// GET render, never this form submit).
export async function acceptProposal(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/proposal/invalid");

  const result = await acceptProposalToken(token);
  if ("error" in result) {
    redirect(`/proposal/${token}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/proposal/${token}?accepted=1`);
}
