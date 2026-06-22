import { DatabaseSync } from "node:sqlite";

/** Build a minimal Envelope Index mirroring the real schema subset used by reads. */
export function buildFixtureDb(path: string): void {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE subjects (ROWID INTEGER PRIMARY KEY, subject TEXT);
    CREATE TABLE addresses (ROWID INTEGER PRIMARY KEY, address TEXT, comment TEXT);
    CREATE TABLE mailboxes (ROWID INTEGER PRIMARY KEY, url TEXT);
    CREATE TABLE messages (
      ROWID INTEGER PRIMARY KEY, message_id INTEGER, subject INTEGER, sender INTEGER, mailbox INTEGER,
      date_sent INTEGER, read INTEGER, flagged INTEGER, deleted INTEGER
    );
  `);
  const UUID_A = "AAAA-testuser";
  const UUID_I = "IIII-icloud";
  db.prepare("INSERT INTO subjects VALUES (?,?)").run(1, "Offer accepted on 123 Main St");
  db.prepare("INSERT INTO subjects VALUES (?,?)").run(2, "Weekly newsletter");
  db.prepare("INSERT INTO addresses VALUES (?,?,?)").run(1, "agent@realty.com", "Jane Agent");
  db.prepare("INSERT INTO addresses VALUES (?,?,?)").run(2, "news@promo.com", "Promo");
  db.prepare("INSERT INTO mailboxes VALUES (?,?)").run(10, `imap://${UUID_A}/[Gmail]/All%20Mail`);
  db.prepare("INSERT INTO mailboxes VALUES (?,?)").run(20, `imap://${UUID_I}/INBOX`);
  // ROWID, message_id (stable hash), subject, sender, mailbox, date_sent, read, flagged, deleted
  const t = 1_700_000_000;
  db.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?)").run(101, 9001, 1, 1, 10, t + 100, 0, 1, 0);
  db.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?)").run(102, 9002, 2, 2, 10, t + 50, 1, 0, 0);
  db.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?)").run(103, 9003, 1, 1, 20, t + 10, 0, 0, 0);
  db.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?)").run(104, 9004, 2, 2, 10, t + 5, 0, 0, 1); // deleted
  db.close();
}
