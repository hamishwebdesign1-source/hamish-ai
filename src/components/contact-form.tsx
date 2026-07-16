"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-border bg-secondary/40 p-8 text-center">
        <p className="font-heading text-xl font-medium">Thanks — got it.</p>
        <p className="mt-2 text-muted-foreground">
          We&apos;ll take a look at your website and get back to you within
          1–2 working days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business">Business name</Label>
          <Input id="business" name="business" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          What would you like AI to help with? (or paste your current
          website link)
        </Label>
        <Textarea id="message" name="message" rows={5} required />
      </div>

      <Button type="submit" size="lg" variant="gradient" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Book my free AI consultation"}
      </Button>

      {status === "error" && (
        <p className="text-sm text-destructive">
          Something went wrong — please email us directly instead.
        </p>
      )}
    </form>
  );
}
