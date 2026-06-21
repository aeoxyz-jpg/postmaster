export interface EventDraft {
  title: string;
  /** Full ISO datetime "YYYY-MM-DDTHH:MM" (timed) or "YYYY-MM-DD" (all-day). */
  absoluteDate?: string;
  /** Relative to an anchor date; produces an all-day event on anchor+offsetDays. */
  relative?: { anchor: string; offsetDays: number };
  /** Free-text the caller could not resolve to a date — flagged uncertain, never guessed. */
  fuzzy?: string;
  allDay?: boolean;
  durationMin?: number;
  alerts?: number[];
  location?: string;
  sourceSubject?: string;
}

export interface ResolvedEvent {
  title: string;
  start: string | null;       // ISO local; null when uncertain
  end: string | null;
  allDay: boolean;
  alerts: number[];           // minutes before start
  location?: string;
  uncertain: boolean;
  uncertaintyReason?: string;
  sourceSubject?: string;
}

const DEFAULT_ALERTS = [1440, 0]; // 1 day before + day-of (design §4.5)
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function pad(n: number): string { return String(n).padStart(2, "0"); }
function ymd(d: Date): string { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }

function uncertain(d: EventDraft, reason: string): ResolvedEvent {
  return {
    title: d.title, start: null, end: null, allDay: d.allDay ?? true,
    alerts: d.alerts ?? DEFAULT_ALERTS, location: d.location,
    uncertain: true, uncertaintyReason: reason, sourceSubject: d.sourceSubject,
  };
}

export function resolveEvents(drafts: EventDraft[]): ResolvedEvent[] {
  return drafts.map((d) => {
    const alerts = d.alerts ?? DEFAULT_ALERTS;

    if (d.fuzzy) return uncertain(d, `fuzzy date "${d.fuzzy}" — flagged for manual review`);

    if (d.relative) {
      if (!DATE_ONLY.test(d.relative.anchor)) {
        // parse loosely; reject if invalid
        const t = Date.parse(d.relative.anchor + "T00:00:00Z");
        if (Number.isNaN(t)) return uncertain(d, `could not parse anchor "${d.relative.anchor}"`);
      }
      const base = Date.parse(d.relative.anchor.slice(0, 10) + "T00:00:00Z");
      if (Number.isNaN(base)) return uncertain(d, `could not parse anchor "${d.relative.anchor}"`);
      const start = new Date(base + d.relative.offsetDays * 86400000);
      const end = new Date(start.getTime() + 86400000);
      return {
        title: d.title, start: ymd(start), end: ymd(end), allDay: true,
        alerts, location: d.location, uncertain: false, sourceSubject: d.sourceSubject,
      };
    }

    if (d.absoluteDate) {
      if (DATE_ONLY.test(d.absoluteDate)) {
        const base = Date.parse(d.absoluteDate + "T00:00:00Z");
        if (Number.isNaN(base)) return uncertain(d, `could not parse date "${d.absoluteDate}"`);
        const end = new Date(base + 86400000);
        return {
          title: d.title, start: d.absoluteDate, end: ymd(end), allDay: true,
          alerts, location: d.location, uncertain: false, sourceSubject: d.sourceSubject,
        };
      }
      if (DATE_TIME.test(d.absoluteDate)) {
        const base = Date.parse(d.absoluteDate + ":00Z");
        if (Number.isNaN(base)) return uncertain(d, `could not parse datetime "${d.absoluteDate}"`);
        const dur = d.durationMin ?? 60;
        const end = new Date(base + dur * 60000);
        const endIso = `${ymd(end)}T${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`;
        return {
          title: d.title, start: d.absoluteDate, end: endIso, allDay: false,
          alerts, location: d.location, uncertain: false, sourceSubject: d.sourceSubject,
        };
      }
      return uncertain(d, `unrecognized date format "${d.absoluteDate}" (expect YYYY-MM-DD or YYYY-MM-DDTHH:MM)`);
    }

    return uncertain(d, "no date information provided");
  });
}
