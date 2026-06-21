import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openEnvelopeDb } from "../src/mail/db.js";
import { buildFixtureDb } from "./fixtures/build-db.js";
import { summarize } from "../src/mail/summarize.js";

let dbPath: string, root: string;
const NAMES = new Map([["AAAA-testuser", "testuser"], ["IIII-icloud", "iCloud"]]);
beforeAll(() => { root = mkdtempSync(join(tmpdir(), "sum-")); dbPath = join(root, "idx"); buildFixtureDb(dbPath); });
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("summarize", () => {
  it("counts total/unread/flagged per account in the window", () => {
    const db = openEnvelopeDb(dbPath);
    const res = summarize(db, { accountNames: NAMES, mailboxPatterns: ["%/All%20Mail", "%/INBOX"], sinceEpoch: 0 });
    db.close();
    const testuser = res.perAccount.find((a) => a.account === "testuser")!;
    expect(testuser.total).toBe(2);
    expect(testuser.unread).toBe(1);
    expect(testuser.flagged).toBe(1);
    expect(res.totals.total).toBe(3);
    expect(res.totals.unread).toBe(2); // 101 (testuser) + 103 (iCloud)
    // iCloud bucket present, and perAccount sorted by total DESC
    const icloud = res.perAccount.find((a) => a.account === "iCloud")!;
    expect(icloud.total).toBe(1);
    expect(icloud.unread).toBe(1);
    expect(res.perAccount[0].account).toBe("testuser");
  });

  it("scopes to a single account via accountUuids", () => {
    const db = openEnvelopeDb(dbPath);
    const res = summarize(db, { accountNames: NAMES, accountUuids: ["AAAA-testuser"], mailboxPatterns: ["%/All%20Mail", "%/INBOX"], sinceEpoch: 0 });
    db.close();
    expect(res.totals.total).toBe(2); // only testuser's 101,102 (iCloud 103 excluded)
    expect(res.perAccount.map((a) => a.account)).toEqual(["testuser"]);
  });
});
