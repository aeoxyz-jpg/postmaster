import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openEnvelopeDb } from "../src/mail/db.js";
import { buildFixtureDb } from "./fixtures/build-db.js";
import { resolveLiveId, describeMessage } from "../src/mail/resolve-id.js";
import type { MailContext } from "../src/mail/context.js";

let root: string, ctx: MailContext;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "resolveid-"));
  const dbPath = join(root, "idx");
  buildFixtureDb(dbPath);
  ctx = {
    db: openEnvelopeDb(dbPath),
    versionDir: root,
    accounts: [
      { name: "testuser", uuid: "AAAA-testuser" },
      { name: "iCloud", uuid: "IIII-icloud" },
    ] as MailContext["accounts"],
    accountNames: new Map([["AAAA-testuser", "testuser"], ["IIII-icloud", "iCloud"]]),
  };
});
afterAll(() => { ctx.db.close(); rmSync(root, { recursive: true, force: true }); });

describe("resolveLiveId", () => {
  it("re-resolves the current rowid+mailbox from the stable msgid (stale rowid in id)", () => {
    // msgid 9001 currently lives at rowid 101 in All Mail, even though the id carries a stale rowid
    expect(resolveLiveId(ctx, "testuser::All Mail::999::9001")).toBe("testuser::All Mail::101");
  });

  it("passes a legacy 3-part id through unchanged", () => {
    expect(resolveLiveId(ctx, "testuser::All Mail::101")).toBe("testuser::All Mail::101");
  });

  it("falls back to the 3-part id when the msgid no longer exists", () => {
    expect(resolveLiveId(ctx, "testuser::All Mail::101::99999")).toBe("testuser::All Mail::101");
  });

  it("ignores a deleted row when re-resolving (msgid 9004 is deleted)", () => {
    // 9004 is marked deleted -> no live row -> fall back to the 3-part id
    expect(resolveLiveId(ctx, "testuser::All Mail::104::9004")).toBe("testuser::All Mail::104");
  });
});

describe("describeMessage", () => {
  it("returns subject + sender + date for a stable msgid", () => {
    const d = describeMessage(ctx, "testuser::All Mail::999::9001");
    expect(d).not.toBeNull();
    expect(d!.subject).toBe("Offer accepted on 123 Main St");
    expect(d!.from).toBe('"Jane Agent" <agent@realty.com>');
    expect(d!.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null when the message can't be found", () => {
    expect(describeMessage(ctx, "testuser::All Mail::101::99999")).toBeNull();
  });
});
