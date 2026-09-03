"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/app/studio/(authed)/projects/actions";

// Projects Kanban Command Centre, Phase A — extracted into its own small
// component, mirroring DeleteWebsiteProjectControl's exact confirm-then-
// delete shape, rather than staying inlined the way it is in
// ProjectCard/the old flat list. The page being viewed is the thing
// being deleted, so success navigates back to the board instead of just
// hiding a card in place.
export function DeleteProjectControl({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const r = await deleteProject(projectId);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to delete.");
        return;
      }
      router.push("/studio/projects");
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
    <Button size="icon-xs" variant="ghost" aria-label="Delete this project" onClick={() => setConfirming(true)}>
      <Trash2 className="size-3.5" />
    </Button>
  );
}
