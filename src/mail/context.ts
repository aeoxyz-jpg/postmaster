import { findMailVersionDir, envelopeDbPath, openEnvelopeDb, type EnvelopeDb } from "./db.js";
import { enumerateAccounts, buildAccountMap, type DetectedAccount } from "./detect.js";

export interface MailContext {
  db: EnvelopeDb;
  versionDir: string;
  accounts: DetectedAccount[];
  accountNames: Map<string, string>; // uuid -> name
}

/** Union of each account's provider mailbox patterns (dedup). */
export function computeMailboxPatterns(accts: Pick<DetectedAccount, "provider">[]): string[] {
  const set = new Set<string>();
  for (const a of accts) for (const p of a.provider.defaultMailboxLikePatterns()) set.add(p);
  return [...set];
}

/** Resolve account-name filters to uuids; empty -> all. */
export function resolveUuids(ctx: MailContext, names?: string[]): string[] {
  if (!names || names.length === 0) return ctx.accounts.map((a) => a.uuid);
  const byName = new Map(ctx.accounts.map((a) => [a.name, a.uuid]));
  return names.map((n) => {
    const u = byName.get(n);
    if (!u) throw new Error(`unknown account: ${n}. Known: ${[...byName.keys()].join(", ")}`);
    return u;
  });
}

export async function buildMailContext(): Promise<MailContext> {
  const versionDir = findMailVersionDir();
  // DB is intentionally long-lived for the server process; closed at process exit.
  const db = openEnvelopeDb(envelopeDbPath(versionDir));
  const accounts = await enumerateAccounts();
  return { db, versionDir, accounts, accountNames: buildAccountMap(accounts) };
}
