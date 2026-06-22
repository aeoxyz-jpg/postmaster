import { DatabaseSync } from "node:sqlite";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type EnvelopeDb = DatabaseSync;

export function defaultMailRoot(): string {
  // POSTMASTER_MAIL_ROOT lets diagnostics/tests point at a non-default (or bogus)
  // Mail library; normal runs fall back to ~/Library/Mail.
  return process.env.POSTMASTER_MAIL_ROOT || join(homedir(), "Library", "Mail");
}

/** Find the live Mail version directory (e.g. V10) that contains an Envelope Index.
 *  Picks the highest version number. Never hardcodes V10. */
export function findMailVersionDir(mailRoot: string = defaultMailRoot()): string {
  if (!existsSync(mailRoot)) {
    throw new Error(`Mail directory not found: ${mailRoot}. Is Mail.app set up for this user?`);
  }
  const candidates = readdirSync(mailRoot)
    .filter((n) => /^V\d+$/.test(n))
    .filter((n) => {
      const st = statSync(join(mailRoot, n), { throwIfNoEntry: false });
      return st?.isDirectory() ?? false;
    })
    .filter((n) => existsSync(join(mailRoot, n, "MailData", "Envelope Index")))
    .sort((a, b) => parseInt(b.slice(1), 10) - parseInt(a.slice(1), 10));
  if (candidates.length === 0) {
    throw new Error(
      `No Mail version dir with an "Envelope Index" found under ${mailRoot}. ` +
        `Full Disk Access may be missing, or Mail.app has not finished indexing.`
    );
  }
  return join(mailRoot, candidates[0]);
}

export function envelopeDbPath(versionDir: string): string {
  return join(versionDir, "MailData", "Envelope Index");
}

/** Open the Envelope Index strictly read-only. */
export function openEnvelopeDb(dbPath: string): EnvelopeDb {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}
