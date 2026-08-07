import { getMsAccessToken } from "@/lib/ms-graph-auth";

// Phase 1 of docs/teams-meeting-intelligence-plan.md — scheduling only,
// no AI yet. Deliberately doesn't use Graph's findMeetingTimes: that API's
// value is weighing multiple attendees' free/busy signals, and an external
// prospect's calendar is never visible to it anyway (no cross-tenant
// free/busy for a cold-outreach contact) — it would just fall back to
// "unknown", making the extra complexity pointless here. Simpler and just
// as correct for this case: read Hamish's own calendar directly and offer
// a short list of free business-hour slots over the next week.

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TIME_ZONE = "Europe/London";
const BUSINESS_HOURS = [9, 10, 11, 14, 15, 16]; // skips 12-13 (lunch) and outside 9-5

export type MeetingSlot = { start: string; end: string; label: string };

// All date/time values below are "YYYY-MM-DDTHH:mm:ss" wall-clock strings
// meant as Europe/London local time, paired with an explicit timeZone
// field wherever Graph accepts one — deliberately never round-tripped
// through `new Date(...)`'s implicit timezone parsing, which would silently
// reinterpret them. Arithmetic is done on the string's own numeric
// components instead, so none of this depends on what timezone the server
// process itself happens to run in (Vercel functions run in UTC).

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`); // date-only arithmetic is TZ-safe
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextWeekdays(count: number): string[] {
  const days: string[] = [];
  let cursor = addDays(new Date().toISOString().slice(0, 10), 1); // start tomorrow
  while (days.length < count) {
    const weekday = new Date(`${cursor}T00:00:00Z`).getUTCDay(); // 0 Sun, 6 Sat
    if (weekday !== 0 && weekday !== 6) days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

function addMinutes(wallClock: string, minutes: number): string {
  const [datePart, timePart] = wallClock.split("T");
  const [h, m, s] = timePart.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${datePart}T${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSlotLabel(wallClock: string): string {
  const [datePart, timePart] = wallClock.split("T");
  const d = new Date(`${datePart}T00:00:00Z`);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const [hStr, mStr] = timePart.split(":");
  const hour = Number(hStr);
  const ampm = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${weekday} ${d.getUTCDate()} ${month}, ${hour12}${mStr === "00" ? "" : `:${mStr}`}${ampm}`;
}

type BusyBlock = { start: string; end: string };

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function getBusyBlocks(accessToken: string, fromDate: string, toDateExclusive: string): Promise<BusyBlock[] | { error: string }> {
  const url = `${GRAPH_BASE}/me/calendarView?startDateTime=${fromDate}T00:00:00&endDateTime=${toDateExclusive}T00:00:00&$select=start,end,subject`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: `outlook.timezone="${TIME_ZONE}"` },
    });
  } catch (error) {
    console.error("Graph calendarView request failed:", error);
    return { error: "Failed to reach Microsoft Graph." };
  }
  if (!res.ok) {
    console.error("Graph calendarView failed:", await res.text());
    return { error: "Failed to read calendar availability." };
  }
  const json = (await res.json()) as { value?: { start: { dateTime: string }; end: { dateTime: string } }[] };
  return (json.value ?? []).map((e) => ({ start: e.start.dateTime.slice(0, 19), end: e.end.dateTime.slice(0, 19) }));
}

export async function findAvailableSlots(durationMinutes = 30, count = 5): Promise<{ slots: MeetingSlot[] } | { error: string }> {
  const tokenResult = await getMsAccessToken();
  if ("error" in tokenResult) return tokenResult;

  const days = nextWeekdays(7);
  const busyResult = await getBusyBlocks(tokenResult.accessToken, days[0], addDays(days[days.length - 1], 1));
  if ("error" in busyResult) return busyResult;

  const slots: MeetingSlot[] = [];
  outer: for (const day of days) {
    for (const hour of BUSINESS_HOURS) {
      if (slots.length >= count) break outer;
      const start = `${day}T${String(hour).padStart(2, "0")}:00:00`;
      const end = addMinutes(start, durationMinutes);
      const isBusy = busyResult.some((b) => overlaps(start, end, b.start, b.end));
      if (!isBusy) slots.push({ start, end, label: formatSlotLabel(start) });
    }
  }
  return { slots };
}

export async function createTeamsMeeting(params: {
  subject: string;
  attendeeEmail: string | null;
  attendeeName: string;
  startLocal: string;
  endLocal: string;
  bodyHtml: string;
}): Promise<{ eventId: string; meetingId: string | null; joinUrl: string; startIso: string; endIso: string } | { error: string }> {
  const tokenResult = await getMsAccessToken();
  if ("error" in tokenResult) return tokenResult;

  const attendees = params.attendeeEmail
    ? [{ emailAddress: { address: params.attendeeEmail, name: params.attendeeName }, type: "required" }]
    : [];

  let res: Response;
  try {
    res = await fetch(`${GRAPH_BASE}/me/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenResult.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: params.subject,
        start: { dateTime: params.startLocal, timeZone: TIME_ZONE },
        end: { dateTime: params.endLocal, timeZone: TIME_ZONE },
        attendees,
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
        body: { contentType: "HTML", content: params.bodyHtml },
      }),
    });
  } catch (error) {
    console.error("Graph event creation request failed:", error);
    return { error: "Failed to reach Microsoft Graph." };
  }

  if (!res.ok) {
    console.error("Graph event creation failed:", await res.text());
    return { error: "Failed to create the Teams meeting." };
  }

  const json = (await res.json()) as {
    id: string;
    start?: { dateTime: string };
    end?: { dateTime: string };
    onlineMeeting?: { joinUrl?: string };
  };
  const joinUrl = json.onlineMeeting?.joinUrl;
  if (!joinUrl) return { error: "Meeting created but no Teams join link was returned." };

  // The onlineMeeting resource id (needed later for transcript/recording
  // lookups in Phase 3) isn't on the event response itself — Graph only
  // returns it via a follow-up lookup keyed on the join URL. Best-effort:
  // the meeting is fully usable without it (the join link works either
  // way), so a failure here shouldn't fail the whole booking.
  let meetingId: string | null = null;
  try {
    const filterValue = `JoinWebUrl eq '${joinUrl}'`;
    const lookup = await fetch(`${GRAPH_BASE}/me/onlineMeetings?$filter=${encodeURIComponent(filterValue)}`, {
      headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
    });
    if (lookup.ok) {
      const lookupJson = (await lookup.json()) as { value?: { id: string }[] };
      meetingId = lookupJson.value?.[0]?.id ?? null;
    }
  } catch (error) {
    console.error("Online meeting id lookup failed (non-fatal):", error);
  }

  return {
    eventId: json.id,
    meetingId,
    joinUrl,
    startIso: json.start?.dateTime ?? params.startLocal,
    endIso: json.end?.dateTime ?? params.endLocal,
  };
}
