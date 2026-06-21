import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runOsa } from "../osa/runner.js";
import { providerFor, type AccountProvider, type MailAccount } from "./provider.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_JXA = join(HERE, "jxa", "accounts.js");

export interface DetectedAccount extends MailAccount {
  provider: AccountProvider;
}

export type Runner = (file: string) => Promise<string>;

const defaultRunner: Runner = (file) =>
  runOsa({ language: "JavaScript", file, timeoutMs: 25000 });

/** Enumerate Mail accounts at runtime via JXA. `opts.runner` is injectable for tests. */
export async function enumerateAccounts(
  opts: { runner?: Runner } = {}
): Promise<DetectedAccount[]> {
  const runner = opts.runner ?? defaultRunner;
  const json = await runner(ACCOUNTS_JXA);
  let raw: MailAccount[];
  try {
    raw = JSON.parse(json) as MailAccount[];
  } catch {
    throw new Error(`accounts.js returned unparseable output: ${json.slice(0, 120)}`);
  }
  return raw.map((a) => ({ ...a, provider: providerFor(a) }));
}

/** uuid -> human account name, for resolving SQLite mailbox URLs. */
export function buildAccountMap(accts: DetectedAccount[]): Map<string, string> {
  return new Map(accts.map((a) => [a.uuid, a.name]));
}
