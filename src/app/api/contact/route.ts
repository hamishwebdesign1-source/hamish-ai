import { NextResponse } from "next/server";
import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, business, email, message } = body ?? {};

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("New contact enquiry (RESEND_API_KEY not set, not emailed):", {
      name,
      business,
      email,
      message,
    });
    return NextResponse.json({ ok: true });
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env.CONTACT_TO_EMAIL || siteConfig.email;

  const { error } = await resend.emails.send({
    from: "Hamish AI <onboarding@resend.dev>",
    to: toEmail,
    replyTo: email,
    subject: `New audit request from ${business || name}`,
    text: [
      `Name: ${name}`,
      `Business: ${business || "-"}`,
      `Email: ${email}`,
      "",
      message,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend send failed:", error);
    return NextResponse.json({ error: "Failed to send." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
