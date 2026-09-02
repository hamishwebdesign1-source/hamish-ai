"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteWebsiteProject } from "@/app/studio/(authed)/website-builder/actions";

// Studio big-ticket ("no delete for projects/website-builder projects")
// — same confirm-then-delete shape as campaigns-panel.tsx's own
// CampaignCard/projects-panel.tsx's own ProjectCard, adapted for a
// detail page rather than a list row: the page being viewed is the
// thing being deleted, so success navigates back to the list instead
// of just hiding a card in place.
export function DeleteWebsiteProjectControl({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const r = await deleteWebsiteProject(projectId);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to delete.");
        return;
      }
      router.push("/studio/website-builder");
    });
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <Button size="xs" variant="destructive" disabled={pending} onClick={remove}>
          {pending ? "Deleting…" : "Confirm delete"}
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Cancel delete" onClick={() => setConfirming(false)}>
          <X className="size-3" />
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    );
  }

  return (
    <Button size="icon-xs" variant="ghost" aria-label="Delete this website project" onClick={() => setConfirming(true)}>
      <Trash2 className="size-3.5" />
    </Button>
  );
}
