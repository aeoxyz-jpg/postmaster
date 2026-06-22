import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHealthChecks, formatHealthReport } from "../src/health.js";
import { buildFixtureDb } from "./fixtures/build-db.js";

const ACCOUNTS_JSON = JSON.stringify([
  { name: "Gmail", uuid: "AAAA-testuser", type: "imap", serverName: "imap.gmail.com", emailAddresses: ["t@gmail.com"] },
]);
const okRunner = async () => ACCOUNTS_JSON;
const failRunner = async () => { throw new Error("Not authorized to send Apple events to Mail."); };

let root: string;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "health-"));
  mkdirSync(join(root, "V10", "MailData"), { recursive: true });
  buildFixtureDb(join(root, "V10", "MailData", "Envelope Index"));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("runHealthChecks", () => {
  it("reports all green when mail root + envelope + accounts resolve", async () => {
    const r = await runHealthChecks({ mailRoot: root, runner: okRunner });
    expect(r.ok).toBe(true);
    const names = r.checks.map((c) => c.name);
    expect(names).toEqual(["Mail library", "Envelope Index", "Accounts"]);
    expect(r.checks.every((c) => c.ok)).toBe(true);
    const accts = r.checks.find((c) => c.name === "Accounts")!;
    expect(accts.detail).toContain("Gmail");
  });

  it("flags a missing mail library with remediation and skips the envelope check detail", async () => {
    const r = await runHealthChecks({ mailRoot: join(root, "does-not-exist"), runner: okRunner });
    expect(r.ok).toBe(false);
    const lib = r.checks.find((c) => c.name === "Mail library")!;
    expect(lib.ok).toBe(false);
    expect(lib.remediation).toMatch(/Full Disk Access/i);
    // envelope check cannot run without a version dir
    const env = r.checks.find((c) => c.name === "Envelope Index")!;
    expect(env.ok).toBe(false);
  });

  it("flags account-enumeration failure with automation remediation", async () => {
    const r = await runHealthChecks({ mailRoot: root, runner: failRunner });
    expect(r.ok).toBe(false);
    const accts = r.checks.find((c) => c.name === "Accounts")!;
    expect(accts.ok).toBe(false);
    expect(accts.remediation).toMatch(/Automation/i);
  });

  it("formats a readable text report", async () => {
    const r = await runHealthChecks({ mailRoot: root, runner: okRunner });
    const text = formatHealthReport(r);
    expect(text).toContain("postmaster health");
    expect(text).toMatch(/✓ Mail library/);
  });
});
