import type { EnvelopeDb } from "./db.js";

export interface MessageHit {
  id: string;            // account::mailbox::rowid
  date: string;          // ISO 8601 Z
  from: string;          // "Display Name" <addr> or addr
  subject: string;
  read: boolean;
  flagged: boolean;
  mailbox: string;
  account: string;
}

export interface SearchOpts {
  query: string;
  accountNames: Map<string, string>;   // uuid -> name
  accountUuids?: string[];             // restrict to these uuids
  mailboxPatterns: string[];           // mailboxes.url LIKE patterns
  fromFilter?: string;
  sinceEpoch: number;                  // unix seconds lower bound on date_sent
  unreadOnly?: boolean;
  limit: number;
}

export function searchMessages(db: EnvelopeDb, opts: SearchOpts): MessageHit[] {
  const where: string[] = ["m.deleted = 0", "m.date_sent > ?"];
  const params: (string | number)[] = [opts.sinceEpoch];

  if (opts.query) {
    const q = `%${opts.query}%`;
    where.push("(s.subject LIKE ? COLLATE NOCASE OR a.address LIKE ? COLLATE NOCASE OR a.comment LIKE ? COLLATE NOCASE)");
    params.push(q, q, q);
  }
  if (opts.fromFilter) {
    const f = `%${opts.fromFilter}%`;
    where.push("(a.address LIKE ? COLLATE NOCASE OR a.comment LIKE ? COLLATE NOCASE)");
    params.push(f, f);
  }
  if (opts.unreadOnly) where.push("m.read = 0");

  if (opts.accountUuids && opts.accountUuids.length) {
    where.push("(" + opts.accountUuids.map(() => "mb.url LIKE ?").join(" OR ") + ")");
    params.push(...opts.accountUuids.map((u) => `imap://${u}/%`));
  }
  if (opts.mailboxPatterns.length) {
    where.push("(" + opts.mailboxPatterns.map(() => "mb.url LIKE ?").join(" OR ") + ")");
    params.push(...opts.mailboxPatterns);
  }

  const sql = `
    SELECT m.ROWID AS rowid, m.date_sent AS date_sent, COALESCE(s.subject, '') AS subject,
           COALESCE(a.address, '') AS address, COALESCE(a.comment, '') AS comment,
           m.read AS read, m.flagged AS flagged, mb.url AS url
    FROM messages m
    LEFT JOIN subjects s ON s.ROWID = m.subject
    JOIN mailboxes mb ON mb.ROWID = m.mailbox
    LEFT JOIN addresses a ON a.ROWID = m.sender
    WHERE ${where.join(" AND ")}
    ORDER BY m.date_sent DESC
    LIMIT ?`;
  params.push(opts.limit);

  const rows = db.prepare(sql).all(...params) as Array<{
    rowid: number; date_sent: number; subject: string; address: string;
    comment: string; read: number; flagged: number; url: string;
  }>;

  const out: MessageHit[] = [];
  for (const r of rows) {
    // V1 supports imap-backed accounts (Gmail/iCloud); non-imap urls (e.g. local "On My Mac") are skipped.
    const m = /^imap:\/\/([^/]+)\/(.+)$/.exec(r.url);
    if (!m) continue;
    const uuid = m[1];
    const account = opts.accountNames.get(uuid) ?? uuid;
    const mailbox = decodeURIComponent(m[2].split("/").pop() ?? "");
    const from = r.comment ? `"${r.comment}" <${r.address}>` : r.address;
    // id embeds the account NAME (not uuid) because the JXA write side addresses accounts by name (Mail.accounts.byName). ids are session-ephemeral references, not durable keys.
    out.push({
      id: `${account}::${mailbox}::${r.rowid}`,
      date: new Date(r.date_sent * 1000).toISOString(),
      from,
      subject: r.subject,
      read: r.read === 1,
      flagged: r.flagged === 1,
      mailbox,
      account,
    });
  }
  return out;
}
