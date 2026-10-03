import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { jxaCaller, osaRunner, type Runner } from "../osa/jxa.js";

export type { Runner };
// Calendar scripts are slow (AppleScript date pushdown, ~1.5s per calendar), hence 90s.
const run = jxaCaller(join(dirname(fileURLToPath(import.meta.url)), "jxa"), osaRunner(90000));

export interface CalendarInfo { name: string; writable: boolean; }

export async function listCalendars(opts: { runner?: Runner } = {}): Promise<CalendarInfo[]> {
  return run<CalendarInfo[]>("list-calendars.js", [], opts.runner);
}

export interface CalendarEvent {
  uid: string; title: string; calendar: string;
  start: string | null; end: string | null; allDay: boolean; location: string; writable: boolean;
}
export interface ListEventsOpts {
  start?: string; end?: string; query?: string; limit?: number;
  calendars?: string[]; includeReadOnly?: boolean; runner?: Runner;
}

/** List existing events (with their uid) across calendars, filtered by start-date range +
 *  optional keyword. The uid feeds straight into update_calendar_event / delete_calendar_event.
 *  Scans only writable calendars unless includeReadOnly (their events are the actionable ones). */
export async function listEvents(opts: ListEventsOpts = {}): Promise<CalendarEvent[]> {
  const args = [
    opts.start ?? "",
    opts.end ?? "",
    opts.query ?? "",
    String(opts.limit ?? 50),
    opts.calendars && opts.calendars.length ? JSON.stringify(opts.calendars) : "",
    opts.includeReadOnly ? "1" : "0",
  ];
  return run<CalendarEvent[]>("list-events.js", args, opts.runner);
}

export interface CalendarEventInput {
  title: string; start: string; end: string; allDay: boolean;
  alerts: number[]; location?: string; notes?: string;
}
export interface CreateEventsResult {
  calendar: string;
  created: Array<{ title: string; uid: string }>;
  skipped: Array<{ title: string; reason: string }>;
}

export async function createEvents(
  calendar: string, events: CalendarEventInput[], opts: { runner?: Runner } = {}
): Promise<CreateEventsResult> {
  return run<CreateEventsResult>("create-events.js", [calendar, JSON.stringify(events)], opts.runner);
}

export interface UpdateEventFields {
  title?: string; start?: string; end?: string; location?: string; notes?: string; alerts?: number[];
}
export interface UpdateEventResult { uid: string; recreated: boolean; calendar: string; }

export async function updateEvent(
  uid: string, fields: UpdateEventFields, opts: { runner?: Runner } = {}
): Promise<UpdateEventResult> {
  return run<UpdateEventResult>("update-event.js", [uid, JSON.stringify(fields)], opts.runner);
}

export interface EventDescribe { found: boolean; uid: string; title?: string; calendar?: string; }
export interface DeleteEventResult { uid: string; deleted: boolean; }

export async function describeEvent(uid: string, opts: { runner?: Runner } = {}): Promise<EventDescribe> {
  return run<EventDescribe>("delete-event.js", [uid, "describe"], opts.runner);
}
export async function deleteEvent(uid: string, opts: { runner?: Runner } = {}): Promise<DeleteEventResult> {
  return run<DeleteEventResult>("delete-event.js", [uid, "delete"], opts.runner);
}
