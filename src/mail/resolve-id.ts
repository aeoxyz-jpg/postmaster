import type { MailContext } from "./context.js";

// Message ids are account::mailbox::rowid[::msgid]. The rowid is Mail's volatile
// per-message id (it changes when a message is moved/archived or re-indexed), so an
// id captured by search can go stale before a later write. msgid is the stable
// Envelope-Index message_id hash; when present we re-resolve the *current* rowid +
// mailbox from SQLite right before the write, so search -> archive -> delete keeps working.

function mailboxNameFromUrl(url: string, fallback: string): string {
  const m = /^imap:\/\/[^/]+\/(.+)$/.exec(url);
  return m ? decodeURIComponent(m[1].split("/").pop() ?? "") : fallback;
}

/** Convert a (possibly stale, possibly 4-part) id into a fresh 3-part
 *  account::mailbox::rowid that the JXA write scripts understand. Legacy 3-part ids
 *  and ids whose msgid can no longer be found pass through unchanged (3-part). */
export function resolveLiveId(ctx: MailContext, id: string): string {
  const parts = id.split("::");
  const threePart = parts.slice(0, 3).join("::");
  if (parts.length < 4) return id;
  const account = parts[0];
  const msgid = parts[parts.length - 1];
  const acct = ctx.accounts.find((a) => a.name === account);
  if (!acct) return threePart;
  const row = ctx.db
    .prepare(
      `SELECT m.ROWID AS rowid, mb.url AS url
         FROM messages m
         JOIN mailboxes mb ON mb.ROWID = m.mailbox
        WHERE CAST(m.message_id AS TEXT) = ? AND m.deleted = 0 AND mb.url LIKE ?
        ORDER BY m.ROWID
        LIMIT 1`
    )
    .get(msgid, `imap://${acct.uuid}/%`) as { rowid: number; url: string } | undefined;
  if (!row) return threePart;
  const mailbox = mailboxNameFromUrl(row.url, parts[1]);
  return `${account}::${mailbox}::${row.rowid}`;
}

export interface MessageDescribe {
  subject: string;
  from: string;
  date: string; // ISO 8601 Z
}

/** Look up subject/sender/date for a message id (by stable msgid when present,
 *  else by rowid) — used to make the delete confirmation human-readable. */
export function describeMessage(ctx: MailContext, id: string): MessageDescribe | null {
  const parts = id.split("::");
  const acct = ctx.accounts.find((a) => a.name === parts[0]);
  if (!acct) return null;
  const select =
    `SELECT COALESCE(s.subject, '') AS subject, COALESCE(a.address, '') AS address,
            COALESCE(a.comment, '') AS comment, m.date_sent AS date_sent
       FROM messages m
       LEFT JOIN subjects s ON s.ROWID = m.subject
       LEFT JOIN addresses a ON a.ROWID = m.sender
       JOIN mailboxes mb ON mb.ROWID = m.mailbox
      WHERE mb.url LIKE ? AND m.deleted = 0 AND `;
  const acctLike = `imap://${acct.uuid}/%`;
  let row: { subject: string; address: string; comment: string; date_sent: number } | undefined;
  if (parts.length >= 4) {
    row = ctx.db.prepare(select + "CAST(m.message_id AS TEXT) = ? ORDER BY m.ROWID LIMIT 1")
      .get(acctLike, parts[parts.length - 1]) as typeof row;
  } else if (/^\d+$/.test(parts[2] ?? "")) {
    row = ctx.db.prepare(select + "m.ROWID = ? LIMIT 1").get(acctLike, Number(parts[2])) as typeof row;
  }
  if (!row) return null;
  const from = row.comment ? `"${row.comment}" <${row.address}>` : row.address;
  return { subject: row.subject, from, date: new Date(row.date_sent * 1000).toISOString() };
}
