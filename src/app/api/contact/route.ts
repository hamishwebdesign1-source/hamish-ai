import { NextResponse } from "next/server";
import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";
import { isRateLimited, getClientKey } from "@/lib/chat-rate-limit";

const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strip characters that could inject extra headers into an email
// subject/reply-to built from user-supplied strings.
function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { error: "Too many requests — please try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? sanitizeHeaderValue(body.name).slice(0, MAX_FIELD_LENGTH) : "";
  const business =
    typeof body?.business === "string" ? sanitizeHeaderValue(body.business).slice(0, MAX_FIELD_LENGTH) : "";
  const email = typeof body?.email === "string" ? sanitizeHeaderValue(body.email).slice(0, MAX_FIELD_LENGTH) : "";
  const message = typeof body?.message === "string" ? body.message.slice(0, MAX_MESSAGE_LENGTH) : "";

  if (!name || !email || !message || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "A valid name, email, and message are required." },
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
