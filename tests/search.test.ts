import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openEnvelopeDb } from "../src/mail/db.js";
import { buildFixtureDb } from "./fixtures/build-db.js";
import { searchMessages } from "../src/mail/search.js";

let dbPath: string, root: string;
const NAMES = new Map([["AAAA-testuser", "testuser"], ["IIII-icloud", "iCloud"]]);
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "search-"));
  dbPath = join(root, "idx");
  buildFixtureDb(dbPath);
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("searchMessages", () => {
  it("matches subject, excludes deleted, newest-first, with account names + id format", () => {
    const db = openEnvelopeDb(dbPath);
    const res = searchMessages(db, { query: "offer", accountNames: NAMES, mailboxPatterns: ["%/All%20Mail", "%/INBOX"], sinceEpoch: 0, limit: 30 });
    db.close();
    expect(res.map((m) => m.id)).toEqual([
      "testuser::All Mail::101",
      "iCloud::INBOX::103",
    ]);
    expect(res[0]).toMatchObject({ from: '"Jane Agent" <agent@realty.com>', flagged: true, read: false });
  });

  it("filters unread-only and by account uuid", () => {
    const db = openEnvelopeDb(dbPath);
    const res = searchMessages(db, { query: "", accountNames: NAMES, accountUuids: ["AAAA-testuser"], mailboxPatterns: ["%/All%20Mail"], unreadOnly: true, sinceEpoch: 0, limit: 30 });
    db.close();
    expect(res.map((m) => m.id)).toEqual(["testuser::All Mail::101"]);
  });

  it("includes messages that have no subject row (LEFT JOIN)", () => {
    const p = join(root, "nosubj");
    const raw = new DatabaseSync(p);
    raw.exec(`
      CREATE TABLE subjects (ROWID INTEGER PRIMARY KEY, subject TEXT);
      CREATE TABLE addresses (ROWID INTEGER PRIMARY KEY, address TEXT, comment TEXT);
      CREATE TABLE mailboxes (ROWID INTEGER PRIMARY KEY, url TEXT);
      CREATE TABLE messages (ROWID INTEGER PRIMARY KEY, subject INTEGER, sender INTEGER, mailbox INTEGER, date_sent INTEGER, read INTEGER, flagged INTEGER, deleted INTEGER);
    `);
    raw.prepare("INSERT INTO mailboxes VALUES (?,?)").run(10, "imap://AAAA-testuser/[Gmail]/All%20Mail");
    // subject FK 999 has no matching subjects row
    raw.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?)").run(201, 999, null, 10, 1700000200, 0, 0, 0);
    raw.close();

    const db = openEnvelopeDb(p);
    const res = searchMessages(db, { query: "", accountNames: NAMES, mailboxPatterns: ["%/All%20Mail"], sinceEpoch: 0, limit: 30 });
    db.close();
    expect(res.map((m) => m.id)).toEqual(["testuser::All Mail::201"]);
    expect(res[0].subject).toBe("");
  });
});
