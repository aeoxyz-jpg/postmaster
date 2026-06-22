import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "../src/config.js";
import { resolveDefaultAccount, type AccountLike } from "../src/mail/default-account.js";

const ACCTS: AccountLike[] = [
  { name: "Gmail", emailAddresses: ["a@gmail.com"] },
  { name: "iCloud", emailAddresses: ["b@icloud.com"] },
  { name: "NoSend", emailAddresses: [] },
];

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "pmda-")); process.env.POSTMASTER_CONFIG = join(dir, "c.json"); });
afterEach(() => { delete process.env.POSTMASTER_CONFIG; rmSync(dir, { recursive: true, force: true }); });

describe("resolveDefaultAccount", () => {
  it("uses an explicit account verbatim (no seeding)", () => {
    const r = resolveDefaultAccount(ACCTS, "iCloud");
    expect(r).toEqual({ account: "iCloud", reseeded: false });
    expect(loadConfig()).toEqual({});
  });
  it("seeds the first sendable account when nothing is stored", () => {
    const r = resolveDefaultAccount(ACCTS);
    expect(r).toEqual({ account: "Gmail", reseeded: true });
    expect(loadConfig().defaultAccount).toBe("Gmail");
  });
  it("uses a stored default that still exists", () => {
    saveConfig({ defaultAccount: "iCloud" });
    const r = resolveDefaultAccount(ACCTS);
    expect(r).toEqual({ account: "iCloud", reseeded: false });
  });
  it("re-seeds when the stored default no longer exists", () => {
    saveConfig({ defaultAccount: "Gone" });
    const r = resolveDefaultAccount(ACCTS);
    expect(r).toEqual({ account: "Gmail", reseeded: true });
    expect(loadConfig().defaultAccount).toBe("Gmail");
  });
  it("throws when there is no sendable account", () => {
    expect(() => resolveDefaultAccount([{ name: "NoSend", emailAddresses: [] }])).toThrow(/no sendable account/i);
  });
});
