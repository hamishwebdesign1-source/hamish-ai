"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, ExternalLink, Loader2 } from "lucide-react";
import { getMeetingSlotSuggestions, scheduleLeadMeeting } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { MeetingSlot } from "@/lib/teams-meeting";

// Two clicks, not a form: "find times" fetches a short list of free slots
// from the connected Microsoft calendar (src/lib/teams-meeting.ts), then
// picking one creates the real Teams meeting + calendar event via Graph.
// No useActionState here — nothing text-typed to submit, just two RPCs,
// same startTransition style CallScriptButton's "mark as called" uses.
export function ScheduleTeamsMeetingButton({
  leadId,
  initialMeeting,
}: {
  leadId: string;
  initialMeeting: { joinUrl: string; scheduledStart: string } | null;
}) {
  const [slots, setSlots] = useState<MeetingSlot[] | null>(null);
  const [meeting, setMeeting] = useState(initialMeeting);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function findTimes() {
    setError(null);
    startTransition(async () => {
      const result = await getMeetingSlotSuggestions(leadId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSlots(result.slots);
    });
  }

  function confirmSlot(slot: MeetingSlot) {
    startTransition(async () => {
      const result = await scheduleLeadMeeting(leadId, slot.start, slot.end);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMeeting({ joinUrl: result.joinUrl, scheduledStart: result.scheduledStart });
      setSlots(null);
    });
  }

  if (meeting) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">
          {new Date(meeting.scheduledStart).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
        </span>
        <a
          href={meeting.joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
        >
          Join <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <Button type="button" variant="outline" size="xs" onClick={findTimes} disabled={isPending} className="gap-1">
        {isPending && !slots ? <Loader2 className="size-3 animate-spin" /> : <CalendarPlus className="size-3" />}
        {isPending && !slots ? "Finding times…" : "Schedule Teams meeting"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {slots && slots.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {slots.map((slot) => (
            <Button
              key={slot.start}
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => confirmSlot(slot)}
              disabled={isPending}
            >
              {slot.label}
            </Button>
          ))}
        </div>
      )}
      {slots && slots.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">No free slots found in the next week.</p>
      )}
    </div>
  );
}
