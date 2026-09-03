"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { PROJECT_STAGES, type ProjectStage, type ProjectStageMeta } from "@/lib/project-stages";
import { ProjectKanbanCard, type KanbanProject, type TeamMember } from "./project-kanban-card";
import { ProjectStageSelect } from "./project-stage-select";

type Task = { id: string; project_id: string | null; status: string };

// Projects Kanban Command Centre, Phase A — mobile responsive behaviour
// (BACKLOG.md's Phase 3 Design, point 7): per-stage Accordion below `md`,
// not horizontal-scroll Kanban. Drag-and-drop is not attempted here —
// each card gets the same stage <select> the detail page's quick-change
// control uses, reusing one honest mechanism rather than a crippled drag
// hidden behind a media query.
const DEFAULT_OPEN: ProjectStage[] = ["in_progress", "client_review"];

export function ProjectStageAccordion({
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
  return (
    <Accordion defaultValue={DEFAULT_OPEN} className="md:hidden">
      {stages.map((stage) => {
        const projects = projectsByStage.get(stage.id) ?? [];
        return (
          <AccordionItem key={stage.id} value={stage.id}>
            <AccordionTrigger>
              <span className="flex items-center gap-1.5">
                {stage.columnDot && <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />}
                {stage.label}
                <span className="text-muted-foreground">({projects.length})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground">No projects in this stage.</p>
              ) : (
                <div className="space-y-3">
                  {projects.map((p) => {
                    const tasks = tasksByProject.get(p.id) ?? [];
                    const done = tasks.filter((t) => t.status === "done").length;
                    return (
                      <div key={p.id} className="flex items-start gap-2">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => onToggleSelect(p.id)}
                            aria-label={`Select ${p.name}`}
                            className="mt-4 size-4 shrink-0 rounded border-border accent-accent"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <ProjectKanbanCard
                            project={p}
                            taskDone={done}
                            taskTotal={tasks.length}
                            teamMembers={teamMembers}
                            pending={pendingId === p.id}
                            rollbackMessage={rollbackMap[p.id] ?? null}
                          />
                          <div className="mt-1.5 flex justify-end">
                            <ProjectStageSelect
                              stage={p.stage}
                              disabled={pendingId === p.id}
                              onChange={(next) => onMove(p.id, next as ProjectStage)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
