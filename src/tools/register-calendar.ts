import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfirmStore } from "../mail/confirm.js";
import { resolveEvents, type EventDraft, type ResolvedEvent } from "../calendar/resolve.js";
import { listCalendars, createEvents, type CalendarEventInput } from "../calendar/calendar.js";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const draftSchema = z.object({
  title: z.string(),
  absoluteDate: z.string().optional(),
  relative: z.object({ anchor: z.string(), offsetDays: z.number() }).optional(),
  fuzzy: z.string().optional(),
  allDay: z.boolean().optional(),
  durationMin: z.number().optional(),
  alerts: z.array(z.number()).optional(),
  location: z.string().optional(),
  sourceSubject: z.string().optional(),
});

function toCalendarInput(e: ResolvedEvent): CalendarEventInput {
  const notes = e.sourceSubject ? `Source email: ${e.sourceSubject}` : "";
  return { title: e.title, start: e.start as string, end: e.end as string, allDay: e.allDay, alerts: e.alerts, location: e.location, notes };
}

export function registerCalendarTools(server: McpServer, confirms: ConfirmStore): void {
  server.registerTool("list_calendars",
    { description: "List writable calendars by name (choose a target for commit_calendar_events).", inputSchema: {} },
    async () => json(await listCalendars()));

  server.registerTool("prepare_calendar_events",
    { description: "Resolve event drafts (relative/absolute/fuzzy dates) into a reviewable list. Does NOT write. Returns the normalized events (with uncertainty flags) + a confirm_token. Review with the user, then call commit_calendar_events with the token.",
      inputSchema: { calendar: z.string(), events: z.array(draftSchema) } },
    async ({ calendar, events }) => {
      const resolved = resolveEvents(events as EventDraft[]);
      const writable = resolved.filter((e) => !e.uncertain).map(toCalendarInput);
      const uncertain = resolved.filter((e) => e.uncertain);
      const { token } = confirms.stage("commit_calendar_events", { calendar, events: writable }, `Create ${writable.length} event(s) in "${calendar}"`);
      return json({
        calendar,
        to_create: resolved,                 // full list incl. uncertain, for user review
        will_write: writable.length,
        uncertain_count: uncertain.length,
        confirm_token: token,
        note: "Review the events (especially uncertain ones — they will NOT be written). Call commit_calendar_events with this confirm_token to write the certain ones.",
      });
    });

  server.registerTool("commit_calendar_events",
    { description: "Write the prepared events to the calendar (after review). Requires the confirm_token from prepare_calendar_events.",
      inputSchema: { confirm_token: z.string() } },
    async ({ confirm_token }) => {
      const action = confirms.consume(confirm_token);
      if (action.kind !== "commit_calendar_events") throw new Error("token is not for a calendar commit");
      const calendar = action.args.calendar as string;
      const events = action.args.events as CalendarEventInput[];
      if (!events.length) return json({ calendar, created: [], skipped: [], note: "no certain events to write" });
      return json(await createEvents(calendar, events));
    });
}
