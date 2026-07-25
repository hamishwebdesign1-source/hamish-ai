import { google } from "googleapis";
import { getGoogleAuthClient } from "@/lib/google-auth";

// Puts a suggested task straight onto Hamish's calendar the moment it's
// created, so following up doesn't depend on remembering to check the
// admin tool. The due-date offset is a priority-based heuristic, not a
// real deadline commitment — it's a reminder, not a promise to the client.
const DUE_OFFSET_DAYS: Record<string, number> = {
  urgent: 1,
  high: 2,
  medium: 5,
  low: 10,
};

export async function createTaskCalendarEvent(params: {
  taskId: string;
  title: string;
  description: string;
  priority: string;
  businessName: string;
  requestId: string;
}) {
  const auth = getGoogleAuthClient();
  if (!auth) return { error: "Google Calendar is not configured." as const };

  const calendar = google.calendar({ version: "v3", auth });

  const offsetDays = DUE_OFFSET_DAYS[params.priority] ?? 5;
  const due = new Date();
  due.setDate(due.getDate() + offsetDays);
  const dueDateStr = due.toISOString().slice(0, 10);

  try {
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `[HamishAI] ${params.title} — ${params.businessName}`,
        description: `${params.description}\n\nView: https://hamishai.org/admin/requests/${params.requestId}`,
        start: { date: dueDateStr },
        end: { date: dueDateStr },
      },
    });

    return { eventId: event.data.id ?? null };
  } catch (error) {
    console.error(`Failed to create calendar event for task ${params.taskId}:`, error);
    return { error: "Failed to create calendar event." as const };
  }
}
