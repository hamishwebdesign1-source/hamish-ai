"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { convertProspectToClient } from "@/app/studio/(authed)/prospects/actions";
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
    return <Badge variant="secondary">Client</Badge>;
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
