import { Badge } from "@/components/ui/badge";

const priorityVariant: Record<string, "destructive" | "warning" | "accent" | "secondary"> = {
  urgent: "destructive",
  high: "warning",
  medium: "accent",
  low: "secondary",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={priorityVariant[priority] ?? "secondary"} className="uppercase">
      {priority}
    </Badge>
  );
}

const requestStatusMeta: Record<string, { label: string; variant: "secondary" | "warning" | "accent" }> = {
  new: { label: "Received", variant: "secondary" },
  awaiting_info: { label: "Needs your input", variant: "warning" },
  triaged: { label: "In progress", variant: "accent" },
};

export function RequestStatusBadge({ status }: { status: string }) {
  const meta = requestStatusMeta[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const taskStatusMeta: Record<string, { label: string; variant: "secondary" | "accent" | "success" }> = {
  todo: { label: "To do", variant: "secondary" },
  in_progress: { label: "In progress", variant: "accent" },
  done: { label: "Done", variant: "success" },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const meta = taskStatusMeta[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
