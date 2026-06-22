import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runOsa } from "../osa/runner.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const jxa = (name: string) => join(HERE, "jxa", name);

export type Runner = (file: string, args: string[]) => Promise<string>;
const defaultRunner: Runner = (file, args) =>
  runOsa({ language: "JavaScript", file, args, timeoutMs: 60000 });

function parse<T>(json: string, script: string): T {
  try { return JSON.parse(json) as T; }
  catch { throw new Error(`${script} returned unparseable output: ${json.slice(0, 120)}`); }
}

export interface CalendarInfo { name: string; writable: boolean; }

export async function listCalendars(opts: { runner?: Runner } = {}): Promise<CalendarInfo[]> {
  const runner = opts.runner ?? defaultRunner;
  return parse<CalendarInfo[]>(await runner(jxa("list-calendars.js"), []), "list-calendars.js");
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
  const runner = opts.runner ?? defaultRunner;
  const json = await runner(jxa("create-events.js"), [calendar, JSON.stringify(events)]);
  return parse<CreateEventsResult>(json, "create-events.js");
}

export interface UpdateEventFields {
  title?: string; start?: string; end?: string; location?: string; notes?: string; alerts?: number[];
}
export interface UpdateEventResult { uid: string; recreated: boolean; calendar: string; }

export async function updateEvent(
  uid: string, fields: UpdateEventFields, opts: { runner?: Runner } = {}
): Promise<UpdateEventResult> {
  const runner = opts.runner ?? defaultRunner;
  const json = await runner(jxa("update-event.js"), [uid, JSON.stringify(fields)]);
  return parse<UpdateEventResult>(json, "update-event.js");
}

export interface EventDescribe { found: boolean; uid: string; title?: string; calendar?: string; }
export interface DeleteEventResult { uid: string; deleted: boolean; }

export async function describeEvent(uid: string, opts: { runner?: Runner } = {}): Promise<EventDescribe> {
  const runner = opts.runner ?? defaultRunner;
  return parse<EventDescribe>(await runner(jxa("delete-event.js"), [uid, "describe"]), "delete-event.js");
}
export async function deleteEvent(uid: string, opts: { runner?: Runner } = {}): Promise<DeleteEventResult> {
  const runner = opts.runner ?? defaultRunner;
  return parse<DeleteEventResult>(await runner(jxa("delete-event.js"), [uid, "delete"]), "delete-event.js");
}
