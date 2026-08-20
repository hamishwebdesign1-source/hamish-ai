"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHelpMode } from "@/components/platform/help-mode-context";

export function HelpModeToggle() {
  const { helpMode, toggle } = useHelpMode();

  return (
    <Button
      type="button"
      variant={helpMode ? "secondary" : "ghost"}
      size="sm"
      onClick={toggle}
      className={helpMode ? "text-accent" : "text-muted-foreground"}
      aria-pressed={helpMode}
    >
      <CircleHelp className="size-4" />
      {helpMode ? "Help mode on" : "Help mode"}
    </Button>
  );
}
