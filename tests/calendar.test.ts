import { describe, it, expect } from "vitest";
import { listCalendars, listEvents, createEvents, updateEvent, describeEvent, deleteEvent } from "../src/calendar/calendar.js";

describe("listCalendars", () => {
  it("parses calendar list JSON", async () => {
    const cals = await listCalendars({ runner: async () => JSON.stringify([{ name: "Work", writable: true }, { name: "Holidays", writable: false }]) });
    expect(cals).toEqual([{ name: "Work", writable: true }, { name: "Holidays", writable: false }]);
  });
});

describe("listEvents", () => {
  it("passes start/end/query/limit/calendars JSON to JXA and parses events", async () => {
    let got: string[] = [];
    const res = await listEvents({
      start: "2026-06-01T00:00:00", end: "2026-06-30T23:59:59", query: "flight", limit: 25, calendars: ["Work", "Home"], includeReadOnly: true,
      runner: async (_f, args) => { got = args; return JSON.stringify([{ uid: "U9", title: "Flight to Houston", calendar: "Work", start: "2026-06-21T18:13:00Z", end: "2026-06-21T20:25:00Z", allDay: false, location: "IAH", writable: true }]); },
    });
    expect(got).toEqual(["2026-06-01T00:00:00", "2026-06-30T23:59:59", "flight", "25", JSON.stringify(["Work", "Home"]), "1"]);
    expect(res[0]).toMatchObject({ uid: "U9", title: "Flight to Houston", calendar: "Work" });
  });

  it("defaults: empty filters, writable-only (includeReadOnly off)", async () => {
    let got: string[] = [];
    await listEvents({ runner: async (_f, args) => { got = args; return "[]"; } });
    expect(got).toEqual(["", "", "", "50", "", "0"]);
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

describe("updateEvent", () => {
  it("passes uid + fields JSON to JXA and parses the result", async () => {
    let got: string[] = [];
    const res = await updateEvent("U1", { title: "New", alerts: [60, 1440] }, {
      runner: async (_f, args) => { got = args; return JSON.stringify({ uid: "U2", recreated: true, calendar: "Work" }); },
    });
    expect(got[0]).toBe("U1");
    expect(JSON.parse(got[1])).toMatchObject({ title: "New", alerts: [60, 1440] });
    expect(res).toMatchObject({ uid: "U2", recreated: true, calendar: "Work" });
  });
});

describe("describeEvent / deleteEvent", () => {
  it("describeEvent returns event info for the confirmation summary", async () => {
    let got: string[] = [];
    const res = await describeEvent("U1", { runner: async (_f, args) => { got = args; return JSON.stringify({ found: true, uid: "U1", title: "Standup", calendar: "Work" }); } });
    expect(got).toEqual(["U1", "describe"]);
    expect(res).toMatchObject({ found: true, title: "Standup", calendar: "Work" });
  });
  it("deleteEvent deletes by uid", async () => {
    let got: string[] = [];
    const res = await deleteEvent("U1", { runner: async (_f, args) => { got = args; return JSON.stringify({ uid: "U1", deleted: true }); } });
    expect(got).toEqual(["U1", "delete"]);
    expect(res.deleted).toBe(true);
  });
});
