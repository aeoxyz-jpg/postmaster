import { describe, it, expect } from "vitest";
import { resolveEvents, type EventDraft } from "../src/calendar/resolve.js";

describe("resolveEvents", () => {
  it("resolves a relative date against an anchor (all-day deadline)", () => {
    const drafts: EventDraft[] = [
      { title: "Inspection deadline", relative: { anchor: "2026-06-01", offsetDays: 7 }, sourceSubject: "Offer accepted" },
    ];
    const [e] = resolveEvents(drafts);
    expect(e.uncertain).toBe(false);
    expect(e.allDay).toBe(true);
    expect(e.start).toBe("2026-06-08");
    expect(e.end).toBe("2026-06-09"); // all-day end is next day
    expect(e.alerts).toEqual([1440, 0]); // default: 1 day before + day-of
    expect(e.sourceSubject).toBe("Offer accepted");
  });

  it("keeps an explicit absolute timed event with duration + explicit alerts", () => {
    const [e] = resolveEvents([
      { title: "Call agent", absoluteDate: "2026-06-10T14:00", durationMin: 30, alerts: [15] },
    ]);
    expect(e.allDay).toBe(false);
    expect(e.start).toBe("2026-06-10T14:00");
    expect(e.end).toBe("2026-06-10T14:30");
    expect(e.alerts).toEqual([15]);
    expect(e.uncertain).toBe(false);
  });

  it("flags a fuzzy date as uncertain without guessing", () => {
    const [e] = resolveEvents([{ title: "Loan contingency", fuzzy: "about three weeks after acceptance" }]);
    expect(e.uncertain).toBe(true);
    expect(e.start).toBeNull();
    expect(e.end).toBeNull();
    expect(e.uncertaintyReason).toMatch(/fuzzy|could not/i);
  });

  it("flags a draft with no date information as uncertain", () => {
    const [e] = resolveEvents([{ title: "Mystery event" }]);
    expect(e.uncertain).toBe(true);
    expect(e.start).toBeNull();
  });

  it("rejects an invalid anchor as uncertain rather than producing NaN", () => {
    const [e] = resolveEvents([{ title: "Bad anchor", relative: { anchor: "not-a-date", offsetDays: 5 } }]);
    expect(e.uncertain).toBe(true);
    expect(e.start).toBeNull();
  });
});
