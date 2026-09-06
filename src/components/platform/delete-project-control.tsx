"use client";

import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/studio/(authed)/projects/actions";
import { ConfirmDeleteButton } from "@/components/platform/confirm-delete-button";

// Projects Kanban Command Centre, Phase A — extracted into its own small
// component, mirroring DeleteWebsiteProjectControl's exact confirm-then-
// delete shape, rather than staying inlined the way it is in
// ProjectCard/the old flat list. The page being viewed is the thing
// being deleted, so success navigates back to the board instead of just
// hiding a card in place.
export function DeleteProjectControl({ projectId }: { projectId: string }) {
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      label="Delete this project"
      onDelete={() => deleteProject(projectId)}
      fallbackError="Failed to delete."
      onSuccess={() => router.push("/studio/projects")}
      size="icon-xs"
      iconClassName="size-3.5"
      cancelIconClassName="size-3"
      confirmText="Confirm delete"
      pendingText="Deleting…"
      showInlineError
    />
  );
}
