import { Resend } from "resend";
import { getSupabaseAdmin, type Lead } from "@/lib/supabase";
import { siteConfig } from "@/lib/site-config";

export async function saveLead(lead: Lead, source: string) {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from("leads").insert({
      name: lead.name,
      business_name: lead.business_name ?? null,
      business_type: lead.business_type ?? null,
      email: lead.email,
      help_with: lead.help_with ?? null,
      source,
    });
    if (error) console.error("Supabase lead insert failed:", error);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`New lead (${source}, RESEND_API_KEY not set, not emailed):`, lead);
    return;
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env.CONTACT_TO_EMAIL || siteConfig.email;

  const { error } = await resend.emails.send({
    from: "Hamish AI <onboarding@resend.dev>",
    to: toEmail,
    replyTo: lead.email,
    subject: `New AI assistant lead: ${lead.business_name || lead.name}`,
    text: [
      `Source: ${source}`,
      `Name: ${lead.name}`,
      `Business: ${lead.business_name || "-"}`,
      `Business type: ${lead.business_type || "-"}`,
      `Email: ${lead.email}`,
      `Wants help with: ${lead.help_with || "-"}`,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend lead email failed:", error);
  }
}
