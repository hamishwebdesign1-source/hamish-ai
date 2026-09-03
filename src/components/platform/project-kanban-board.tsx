"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  defaultKeyboardCoordinateGetter,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PROJECT_STAGES, isProjectStage, type ProjectStage, type ProjectStageMeta } from "@/lib/project-stages";
import { ProjectKanbanCard, type KanbanProject, type TeamMember } from "./project-kanban-card";

type Task = { id: string; project_id: string | null; status: string };

// Projects Kanban Command Centre, Phase A — this codebase's first real
// drag-and-drop board (DESIGN-SYSTEM.md's "Kanban board pattern"
// section). Built on plain useDraggable/useDroppable rather than
// @dnd-kit/sortable's SortableContext/useSortable — there is no
// persisted order *within* a column (a project's position inside its
// stage isn't data this app tracks), so the extra sortable-list
// reordering/animation layer would add real complexity for a visual
// effect this app doesn't actually need. useDraggable's own
// listeners/attributes are the same shape useSortable exposes, so the
// design's real requirements (grip-handle-only activation, KeyboardSensor
// support, custom announcements, optimistic update + rollback) are all
// satisfied without it.
function taskCountsFor(projectId: string, tasksByProject: Map<string, Task[]>) {
  const tasks = tasksByProject.get(projectId) ?? [];
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
}

function DraggableProjectCard({
  project,
  taskDone,
  taskTotal,
  teamMembers,
  pending,
  rollbackMessage,
  selectMode,
  selected,
  onToggleSelect,
}: {
  project: KanbanProject;
  taskDone: number;
  taskTotal: number;
  teamMembers: TeamMember[];
  pending: boolean;
  rollbackMessage: string | null;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { type: "project" },
    disabled: selectMode,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "z-10 opacity-90" : ""}>
      <ProjectKanbanCard
        project={project}
        taskDone={taskDone}
        taskTotal={taskTotal}
        teamMembers={teamMembers}
        pending={pending}
        rollbackMessage={rollbackMessage}
        selectSlot={
          selectMode ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Select ${project.name}`}
              className="mt-1 size-4 shrink-0 rounded border-border accent-accent"
            />
          ) : undefined
        }
        handle={
          !selectMode ? (
            <button
              type="button"
              ref={setActivatorNodeRef}
              aria-label={`Drag to move ${project.name}`}
              className="mt-1 shrink-0 touch-none text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  );
}

function KanbanColumn({
  stage,
  projects,
  tasksByProject,
  teamMembers,
  selectMode,
  selected,
  onToggleSelect,
  pendingId,
  rollbackMap,
}: {
  stage: ProjectStageMeta;
  projects: KanbanProject[];
  tasksByProject: Map<string, Task[]>;
  teamMembers: TeamMember[];
  selectMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  pendingId: string | null;
  rollbackMap: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: "column" } });

  // Reported live (screenshot): 5 fixed-width columns (was w-72, 288px
  // each — 1504px total across the row) meant the last one or two
  // stages always sat past the fold, needing a horizontal scroll just
  // to see "Client review" on an ordinary desktop width. The board
  // already breaks out to max-w-6xl (the studio shell's own outer
  // ceiling, same room Command Centre gets — there's no more to give
  // without changing the sidebar layout itself), and that still isn't
  // wide enough for 5 fixed 288px columns once the sidebar and its gap
  // are subtracted. flex-1 lets all 5 share whatever width is actually
  // available and compress together instead of forcing scroll;
  // min-w-[190px] is the floor before a card's own content (name,
  // client, task progress, date) gets uncomfortably cramped — the
  // outer row's overflow-x-auto (ProjectKanbanBoard, below) stays as a
  // genuine fallback for a narrow window, not the primary mechanism.
  return (
    <div className="flex min-w-[190px] flex-1 flex-col gap-2">
      <div className={`flex items-center gap-1.5 border-b border-border px-1 pb-2 ${stage.columnAccentClassName ?? ""}`}>
        {stage.columnDot && <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />}
        <h2 className="text-sm font-semibold">{stage.label}</h2>
        <span className="text-xs text-muted-foreground">{projects.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${isOver ? "bg-accent/5 ring-2 ring-accent/30" : ""}`}
      >
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No projects in this stage</div>
        ) : (
          projects.map((p) => {
            const counts = taskCountsFor(p.id, tasksByProject);
            return (
              <DraggableProjectCard
                key={p.id}
                project={p}
                taskDone={counts.done}
                taskTotal={counts.total}
                teamMembers={teamMembers}
                pending={pendingId === p.id}
                rollbackMessage={rollbackMap[p.id] ?? null}
                selectMode={selectMode}
                selected={selected.has(p.id)}
                onToggleSelect={() => onToggleSelect(p.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export function ProjectKanbanBoard({
  stages = PROJECT_STAGES,
  projectsByStage,
  tasksByProject,
  teamMembers,
  selectMode,
  selected,
  onToggleSelect,
  pendingId,
  rollbackMap,
  onMove,
}: {
  stages?: ProjectStageMeta[];
  projectsByStage: Map<string, KanbanProject[]>;
  tasksByProject: Map<string, Task[]>;
  teamMembers: TeamMember[];
  selectMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  pendingId: string | null;
  rollbackMap: Record<string, string>;
  onMove: (id: string, stage: ProjectStage) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: defaultKeyboardCoordinateGetter })
  );

  const projectsById = useMemo(() => {
    const map = new Map<string, KanbanProject>();
    for (const list of projectsByStage.values()) for (const p of list) map.set(p.id, p);
    return map;
  }, [projectsByStage]);

  const stageLabelById = useMemo(() => new Map<string, string>(stages.map((s) => [s.id, s.label])), [stages]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const stageId = String(over.id);
    if (!isProjectStage(stageId)) return;
    const project = projectsById.get(String(active.id));
    if (!project || project.stage === stageId) return;
    onMove(project.id, stageId);
  }

  // Custom screen-reader announcements — dnd-kit's generic index-based
  // defaults announce nothing meaningful without real project/stage
  // names (DESIGN-SYSTEM.md's Kanban board pattern / BACKLOG.md's Phase
  // 3 Design, drag-and-drop section).
  const announcements: Announcements = useMemo(
    () => ({
      onDragStart({ active }) {
        const p = projectsById.get(String(active.id));
        return p ? `Picked up ${p.name}.` : undefined;
      },
      onDragOver({ active, over }) {
        const p = projectsById.get(String(active.id));
        const label = over ? stageLabelById.get(String(over.id)) : undefined;
        return p && label ? `${p.name} over the ${label} column.` : undefined;
      },
      onDragEnd({ active, over }) {
        const p = projectsById.get(String(active.id));
        const label = over ? stageLabelById.get(String(over.id)) : undefined;
        if (!p) return undefined;
        return label ? `${p.name} moved to ${label}.` : `${p.name} was dropped outside a column.`;
      },
      onDragCancel({ active }) {
        const p = projectsById.get(String(active.id));
        return p ? `Moving ${p.name} was cancelled.` : undefined;
      },
    }),
    [projectsById, stageLabelById]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} accessibility={{ announcements }}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            projects={projectsByStage.get(stage.id) ?? []}
            tasksByProject={tasksByProject}
            teamMembers={teamMembers}
            selectMode={selectMode}
            selected={selected}
            onToggleSelect={onToggleSelect}
            pendingId={pendingId}
            rollbackMap={rollbackMap}
          />
        ))}
      </div>
    </DndContext>
  );
}
