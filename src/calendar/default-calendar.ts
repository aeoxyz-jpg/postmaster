import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runOsa } from "../osa/runner.js";
import { loadConfig, saveConfig } from "../config.js";
import type { CalendarInfo } from "./calendar.js";

const HERE = dirname(fileURLToPath(import.meta.url));

export type Runner = (file: string, args: string[]) => Promise<string>;
const defaultRunner: Runner = (file, args) =>
  runOsa({ language: "JavaScript", file, args, timeoutMs: 15000 });

/** EventKit's "default calendar for new events" title, or null if unavailable/ungranted. */
export async function detectDefaultCalendar(runner: Runner = defaultRunner): Promise<string | null> {
  try {
    const json = await runner(join(HERE, "jxa", "default-calendar.js"), []);
    const parsed = JSON.parse(json) as { name: string | null };
    return parsed.name ?? null;
  } catch {
    return null;
  }
}

export interface ResolvedCalendar {
  calendar: string;
  reseeded: boolean;
}

/** Resolve the calendar to write to: explicit > stored-and-still-present > EventKit default
 *  (if present in the list) > first writable calendar. Seeds + persists when it had to choose. */
export async function resolveDefaultCalendar(opts: {
  calendars: CalendarInfo[];
  detect: () => Promise<string | null>;
  explicit?: string;
}): Promise<ResolvedCalendar> {
  const { calendars, detect, explicit } = opts;
  if (explicit) return { calendar: explicit, reseeded: false };

  const cfg = loadConfig();
  const exists = (n: string | null | undefined) => !!n && calendars.some((c) => c.name === n);
  if (exists(cfg.defaultCalendar)) return { calendar: cfg.defaultCalendar!, reseeded: false };

  const detected = await detect();
  let chosen = exists(detected) ? detected! : calendars.find((c) => c.writable)?.name;
  if (!chosen) throw new Error("no writable calendar to use as a default");

  cfg.defaultCalendar = chosen;
  saveConfig(cfg);
  return { calendar: chosen, reseeded: true };
}
