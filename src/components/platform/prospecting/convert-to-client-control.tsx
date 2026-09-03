"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { convertProspectToClient } from "@/app/studio/(authed)/prospects/actions";
import { prospectHasPrefillSource } from "@/lib/website-brief";
import type { Prospect } from "./types";

// A single row's own convert-to-client mini-form — its own component so
// each prospect card's open/closed and pending state is independent, not
// one shared bit of state on the parent tracking "which row is open."
export function ConvertToClientControl({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(prospect.email ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof convertProspectToClient>> | null>(null);

  if (prospect.status === "converted") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="secondary">Client</Badge>
        {/* Prospects → Website Builder prefill (BACKLOG.md, 2026-09-03)
            — a secondary pointer back to the real entry point
            (StartWebsiteBuildFromProspectControl, inside this client's
            own expanded ClientCard), same "no toast, inline text"
            convention as everywhere else in this app. Deliberately just
            a link to Clients, not a deep link to this specific client —
            this control doesn't know the resulting client_id and isn't
            worth a second query just to look it up. */}
        {prospectHasPrefillSource(prospect) && (
          <Link href="/studio/clients" className="text-[11px] text-accent underline underline-offset-2">
            Start website build in Clients
          </Link>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5" /> Convert to client
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@business.com"
          className="h-8 w-44 text-xs"
          autoFocus
        />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await convertProspectToClient(prospect.id, email);
              setResult(r);
              if ("ok" in r) setOpen(false);
            })
          }
        >
          {pending ? "…" : "Confirm"}
        </Button>
      </div>
      {result && "error" in result && <span className="text-xs text-destructive">{result.error}</span>}
    </div>
  );
}
