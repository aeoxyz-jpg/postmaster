import { describe, it, expect } from "vitest";
import { listCalendars, createEvents } from "../src/calendar/calendar.js";

describe("listCalendars", () => {
  it("parses calendar list JSON", async () => {
    const cals = await listCalendars({ runner: async () => JSON.stringify([{ name: "Work", writable: true }, { name: "Holidays", writable: false }]) });
    expect(cals).toEqual([{ name: "Work", writable: true }, { name: "Holidays", writable: false }]);
  });
});

describe("createEvents", () => {
  it("passes calendar name + events JSON to JXA and returns created/skipped", async () => {
    let got: string[] = [];
    const res = await createEvents("Work",
      [{ title: "T", start: "2026-06-08", end: "2026-06-09", allDay: true, alerts: [1440], notes: "from: Offer" }],
      { runner: async (_f, args) => { got = args; return JSON.stringify({ calendar: "Work", created: [{ title: "T", uid: "U1" }], skipped: [] }); } });
    expect(got[0]).toBe("Work");
    expect(JSON.parse(got[1])[0].title).toBe("T");
    expect(res.created[0].uid).toBe("U1");
  });
});
