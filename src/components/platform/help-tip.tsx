"use client";

import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useHelpMode } from "@/components/platform/help-mode-context";

// Renders nothing unless Help Mode is on — so a tenant who's never
// touched the toggle sees exactly the interface they already know,
// nothing added by default. Deliberately placed on the newest, least
// self-explanatory Command Centre concepts (Business Health, Actions
// Required, Insights, Analytics KPIs) rather than an exhaustive sweep of
// every control in Studio — most of the existing app doesn't need this.
export function HelpTip({ explanation }: { explanation: string }) {
  const { helpMode } = useHelpMode();
  if (!helpMode) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex shrink-0 items-center text-accent outline-none">
          <CircleHelp className="size-3.5" />
          <span className="sr-only">What is this?</span>
        </TooltipTrigger>
        <TooltipContent>{explanation}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
