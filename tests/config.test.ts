import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig, setDefaults, configPath } from "../src/config.js";

let dir: string, cfgFile: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pmcfg-"));
  cfgFile = join(dir, "config.json");
  process.env.POSTMASTER_CONFIG = cfgFile;
});
afterEach(() => { delete process.env.POSTMASTER_CONFIG; rmSync(dir, { recursive: true, force: true }); });

describe("config", () => {
  it("configPath honors POSTMASTER_CONFIG", () => {
    expect(configPath()).toBe(cfgFile);
  });
  it("loadConfig returns {} when the file is missing", () => {
    expect(loadConfig()).toEqual({});
  });
  it("saveConfig then loadConfig round-trips", () => {
    saveConfig({ defaultAccount: "A", defaultCalendar: "Work" });
    expect(loadConfig()).toEqual({ defaultAccount: "A", defaultCalendar: "Work" });
    expect(existsSync(cfgFile)).toBe(true);
  });
  it("loadConfig returns {} on corrupt JSON", () => {
    writeFileSync(cfgFile, "{ not json");
    expect(loadConfig()).toEqual({});
  });
  it("setDefaults validates account membership and persists", () => {
    const cfg = setDefaults({ account: "A" }, ["A", "B"], ["Work"]);
    expect(cfg).toEqual({ defaultAccount: "A" });
    expect(loadConfig()).toEqual({ defaultAccount: "A" });
  });
  it("setDefaults merges calendar into existing config", () => {
    saveConfig({ defaultAccount: "A" });
    const cfg = setDefaults({ calendar: "Work" }, ["A"], ["Work", "Home"]);
    expect(cfg).toEqual({ defaultAccount: "A", defaultCalendar: "Work" });
  });
  it("setDefaults rejects an unknown account", () => {
    expect(() => setDefaults({ account: "Z" }, ["A"], ["Work"])).toThrow(/unknown account/i);
  });
  it("setDefaults rejects an unknown calendar", () => {
    expect(() => setDefaults({ calendar: "Z" }, ["A"], ["Work"])).toThrow(/unknown calendar/i);
  });
  it("setDefaults requires at least one field", () => {
    expect(() => setDefaults({}, ["A"], ["Work"])).toThrow(/account or calendar/i);
  });
});
