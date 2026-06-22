import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "../src/config.js";
import { detectDefaultCalendar, resolveDefaultCalendar } from "../src/calendar/default-calendar.js";
import type { CalendarInfo } from "../src/calendar/calendar.js";

const CALS: CalendarInfo[] = [
  { name: "US Holidays", writable: false },
  { name: "Work", writable: true },
  { name: "Home", writable: true },
];

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "pmdc-")); process.env.POSTMASTER_CONFIG = join(dir, "c.json"); });
afterEach(() => { delete process.env.POSTMASTER_CONFIG; rmSync(dir, { recursive: true, force: true }); });

describe("detectDefaultCalendar", () => {
  it("parses the EventKit name", async () => {
    const name = await detectDefaultCalendar(async () => JSON.stringify({ name: "Home" }));
    expect(name).toBe("Home");
  });
  it("returns null when EventKit yields none", async () => {
    expect(await detectDefaultCalendar(async () => JSON.stringify({ name: null }))).toBeNull();
  });
  it("returns null when the probe throws", async () => {
    expect(await detectDefaultCalendar(async () => { throw new Error("no access"); })).toBeNull();
  });
});

describe("resolveDefaultCalendar", () => {
  it("uses an explicit calendar verbatim", async () => {
    const r = await resolveDefaultCalendar({ explicit: "Work", calendars: CALS, detect: async () => "Home" });
    expect(r).toEqual({ calendar: "Work", reseeded: false });
    expect(loadConfig()).toEqual({});
  });
  it("uses a stored default that still exists", async () => {
    saveConfig({ defaultCalendar: "Home" });
    const r = await resolveDefaultCalendar({ calendars: CALS, detect: async () => "Work" });
    expect(r).toEqual({ calendar: "Home", reseeded: false });
  });
  it("seeds the EventKit default when nothing is stored", async () => {
    const r = await resolveDefaultCalendar({ calendars: CALS, detect: async () => "Home" });
    expect(r).toEqual({ calendar: "Home", reseeded: true });
    expect(loadConfig().defaultCalendar).toBe("Home");
  });
  it("falls back to the first writable calendar when detection yields nothing", async () => {
    const r = await resolveDefaultCalendar({ calendars: CALS, detect: async () => null });
    expect(r).toEqual({ calendar: "Work", reseeded: true });
    expect(loadConfig().defaultCalendar).toBe("Work");
  });
  it("ignores a detected calendar that is not in the list, using first writable", async () => {
    const r = await resolveDefaultCalendar({ calendars: CALS, detect: async () => "Ghost" });
    expect(r).toEqual({ calendar: "Work", reseeded: true });
  });
  it("re-seeds when the stored default no longer exists", async () => {
    saveConfig({ defaultCalendar: "Gone" });
    const r = await resolveDefaultCalendar({ calendars: CALS, detect: async () => "Home" });
    expect(r).toEqual({ calendar: "Home", reseeded: true });
  });
  it("throws when there is no writable calendar and nothing valid detected", async () => {
    await expect(resolveDefaultCalendar({ calendars: [{ name: "US Holidays", writable: false }], detect: async () => null }))
      .rejects.toThrow(/no writable calendar/i);
  });
});
