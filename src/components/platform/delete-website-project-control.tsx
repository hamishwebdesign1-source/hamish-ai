"use client";

import { useRouter } from "next/navigation";
import { deleteWebsiteProject } from "@/app/studio/(authed)/website-builder/actions";
import { ConfirmDeleteButton } from "@/components/platform/confirm-delete-button";

// Studio big-ticket ("no delete for projects/website-builder projects")
// — same confirm-then-delete shape as campaigns-panel.tsx's own
// CampaignCard/projects-panel.tsx's own ProjectCard, adapted for a
// detail page rather than a list row: the page being viewed is the
// thing being deleted, so success navigates back to the list instead
// of just hiding a card in place.
export function DeleteWebsiteProjectControl({ projectId }: { projectId: string }) {
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      label="Delete this website project"
      onDelete={() => deleteWebsiteProject(projectId)}
      fallbackError="Failed to delete."
      onSuccess={() => router.push("/studio/website-builder")}
      size="icon-xs"
      iconClassName="size-3.5"
      cancelIconClassName="size-3"
      confirmText="Confirm delete"
      pendingText="Deleting…"
      showInlineError
    />
  );
}
