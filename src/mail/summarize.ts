import type { EnvelopeDb } from "./db.js";

export interface AccountSummary { account: string; total: number; unread: number; flagged: number; }
export interface Summary { perAccount: AccountSummary[]; totals: { total: number; unread: number; flagged: number }; }

export interface SummarizeOpts {
  accountNames: Map<string, string>;  // uuid -> name
  accountUuids?: string[];
  mailboxPatterns: string[];
  sinceEpoch: number;
}

export function summarize(db: EnvelopeDb, opts: SummarizeOpts): Summary {
  const where: string[] = ["m.deleted = 0", "m.date_sent > ?"];
  const params: (string | number)[] = [opts.sinceEpoch];
  if (opts.accountUuids && opts.accountUuids.length) {
    where.push("(" + opts.accountUuids.map(() => "mb.url LIKE ?").join(" OR ") + ")");
    params.push(...opts.accountUuids.map((u) => `imap://${u}/%`));
  }
  if (opts.mailboxPatterns.length) {
    where.push("(" + opts.mailboxPatterns.map(() => "mb.url LIKE ?").join(" OR ") + ")");
    params.push(...opts.mailboxPatterns);
  }
  const sql = `
    SELECT mb.url AS url, m.read AS read, m.flagged AS flagged
    FROM messages m JOIN mailboxes mb ON mb.ROWID = m.mailbox
    WHERE ${where.join(" AND ")}`;
  const rows = db.prepare(sql).all(...params) as Array<{ url: string; read: number; flagged: number }>;

  const byAcct = new Map<string, AccountSummary>();
  const totals = { total: 0, unread: 0, flagged: 0 };
  for (const r of rows) {
    const m = /^imap:\/\/([^/]+)\//.exec(r.url);
    const account = m ? opts.accountNames.get(m[1]) ?? m[1] : "unknown";
    let s = byAcct.get(account);
    if (!s) { s = { account, total: 0, unread: 0, flagged: 0 }; byAcct.set(account, s); }
    s.total++; totals.total++;
    if (r.read === 0) { s.unread++; totals.unread++; }
    if (r.flagged === 1) { s.flagged++; totals.flagged++; }
  }
  return { perAccount: [...byAcct.values()].sort((a, b) => b.total - a.total), totals };
}
