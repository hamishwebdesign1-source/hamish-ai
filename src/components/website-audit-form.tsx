"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/lib/site-config";
import type { WebsiteAuditResult } from "@/lib/website-audit";

// Per the "show immediately" decision — the full AI findings render right
// on this page once the report comes back, rather than gating them behind
// checking an inbox. Lead capture still happens (saveLead(), server-side,
// same request) — this only decides what the *visitor* sees, not whether
// the lead is real.

const GRADE_COLOR: Record<string, string> = {
  A: "text-accent",
  B: "text-accent",
  C: "text-warning",
  D: "text-destructive",
  F: "text-destructive",
};

function GradeBadge({ grade, score }: { grade: string; score: number }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/40 p-6">
      <span className={`font-heading text-6xl font-semibold ${GRADE_COLOR[grade] ?? "text-foreground"}`}>{grade}</span>
      <div>
        <p className="text-sm text-muted-foreground">Overall score</p>
        <p className="font-heading text-2xl font-semibold tabular-nums">{score}/100</p>
      </div>
    </div>
  );
}

function FindingsList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-heading text-base font-medium">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className="text-accent">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WebsiteAuditForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WebsiteAuditResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/website-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setResult(data.result);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setStatus("error");
    }
  }

  if (result) {
    return (
      <div className="space-y-8">
        <GradeBadge grade={result.grade} score={result.score} />

        <p className="text-lg text-foreground">{result.overallImpression}</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <FindingsList title="What's working" items={result.strengths} />
          <FindingsList title="Issues found" items={result.issues} />
          <FindingsList title="Quick wins" items={result.quickWins} />
          <FindingsList title="Where AI could help" items={result.aiOpportunities} />
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 p-6 text-center">
          <p className="font-heading text-lg font-medium">Want us to fix any of this?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Free consultation, and we build a working prototype before you pay anything.
          </p>
          <Button size="lg" className="mt-4" render={<Link href="/book" />}>
            Book a free consultation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="audit-name">
            Your name <span className="text-accent">*</span>
          </Label>
          <Input id="audit-name" name="name" autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-business">Business name</Label>
          <Input id="audit-business" name="businessName" autoComplete="organization" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-email">
          Email <span className="text-accent">*</span>
        </Label>
        <Input id="audit-email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-website">
          Your website <span className="text-accent">*</span>
        </Label>
        <Input id="audit-website" name="website" type="text" placeholder="yourbusiness.co.uk" autoComplete="url" required />
      </div>

      <Button type="submit" size="lg" disabled={status === "sending"}>
        {status === "sending" ? "Checking your site…" : "Get my free website check"}
      </Button>

      {status === "error" && (
        <p className="text-sm text-destructive">
          {error || "Something went wrong — please try again"}, or email us directly at{" "}
          <a href={`mailto:${siteConfig.email}`} className="underline">
            {siteConfig.email}
          </a>
          .
        </p>
      )}
    </form>
  );
}
