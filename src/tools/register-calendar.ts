import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfirmStore } from "../mail/confirm.js";
import { resolveEvents, type EventDraft, type ResolvedEvent } from "../calendar/resolve.js";
import { listCalendars, listEvents, createEvents, updateEvent, describeEvent, deleteEvent, type CalendarEventInput } from "../calendar/calendar.js";

const DAY_MS = 86400_000;
// Date-only inputs are interpreted as a full local day so a 'YYYY-MM-DD' filter is intuitive.
function normStart(s?: string): string | undefined {
  if (!s) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s;
}
function normEnd(s?: string): string | undefined {
  if (!s) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T23:59:59` : s;
}

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

  server.registerTool("list_calendar_events",
    { description: "Find existing calendar events and their uid (to feed update_calendar_event / delete_calendar_event). Filters by start-date range + optional keyword (substring on title/location). Times are local 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM'; start/end default to 30 days ago through 180 days ahead. Scans only WRITABLE calendars by default (those are the editable ones; set includeReadOnly to also list subscriptions like Holidays — slower). Narrowing with `calendars` is much faster (~1.5s/calendar).",
      inputSchema: {
        calendars: z.array(z.string()).optional().describe("filter to these calendar names; default all writable"),
        start: z.string().optional().describe("range lower bound on event start"),
        end: z.string().optional().describe("range upper bound on event start"),
        query: z.string().optional().describe("case-insensitive substring on title/location"),
        includeReadOnly: z.boolean().optional().describe("also scan read-only subscription calendars (slower)"),
        limit: z.number().default(50),
      } },
    async ({ calendars, start, end, query, includeReadOnly, limit }) => {
      const now = Date.now();
      const startISO = normStart(start) ?? new Date(now - 30 * DAY_MS).toISOString();
      const endISO = normEnd(end) ?? new Date(now + 180 * DAY_MS).toISOString();
      const events = await listEvents({ start: startISO, end: endISO, query, limit, calendars, includeReadOnly });
      return json({ window: { start: startISO, end: endISO }, count: events.length, events });
    });

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

  server.registerTool("update_calendar_event",
    { description: "Update a calendar event by uid: change title/start/end/location/notes and/or its reminders. Field edits apply in place. Providing `alerts` sets the event's exact reminder set — because Calendar cannot remove individual alarms, this recreates the event and returns a NEW uid (recreated: true). Times are local 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM'; alerts are minutes before start.",
      inputSchema: { uid: z.string(), title: z.string().optional(), start: z.string().optional(), end: z.string().optional(), location: z.string().optional(), notes: z.string().optional(), alerts: z.array(z.number()).optional() } },
    async ({ uid, title, start, end, location, notes, alerts }) =>
      json(await updateEvent(uid, { title, start, end, location, notes, alerts })));

  server.registerTool("delete_calendar_event",
    { description: "Delete a calendar event by uid (also removes its reminders). TWO-STEP: call without confirm_token to get a token + a summary of which event; call again with the token to delete. Cannot be undone.",
      inputSchema: { uid: z.string(), confirm_token: z.string().optional() } },
    async ({ uid, confirm_token }) => {
      if (!confirm_token) {
        const info = await describeEvent(uid);
        if (!info.found) throw new Error(`calendar event not found: ${uid}`);
        const summary = `Delete event "${info.title}" from "${info.calendar}"`;
        const { token } = confirms.stage("delete_calendar_event", { uid }, summary);
        return json({ pending: true, confirm_token: token, summary, note: "Re-call delete_calendar_event with this confirm_token to delete." });
      }
      const action = confirms.consume(confirm_token);
      if (action.kind !== "delete_calendar_event" || action.args.uid !== uid) {
        throw new Error("confirm_token does not match this delete request");
      }
      return json(await deleteEvent(uid));
    });
}
