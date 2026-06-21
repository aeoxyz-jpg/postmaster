// Standalone environment diagnostic. Prints a human report; never throws past the top.
import { findMailVersionDir, envelopeDbPath, openEnvelopeDb } from "./mail/db.js";
import { enumerateAccounts } from "./mail/detect.js";

async function main() {
  console.log("== postmaster diagnostics ==");
  console.log(`platform: ${process.platform} node ${process.version}`);

  let versionDir: string | null = null;
  try {
    versionDir = findMailVersionDir();
    console.log(`✓ Mail library: ${versionDir}`);
  } catch (e) {
    console.log(`✗ Mail library: ${(e as Error).message}`);
    console.log("  → Grant Full Disk Access to your terminal / the host app, then retry.");
  }

  if (versionDir) {
    try {
      const db = openEnvelopeDb(envelopeDbPath(versionDir));
      try {
        const n = db.prepare("SELECT count(*) AS c FROM messages").get() as { c: number };
        console.log(`✓ Envelope Index readable: ${n.c} messages`);
      } finally {
        db.close();
      }
    } catch (e) {
      console.log(`✗ Envelope Index: ${(e as Error).message}`);
    }
  }

  try {
    const accts = await enumerateAccounts();
    console.log(`✓ Accounts (${accts.length}):`);
    for (const a of accts) console.log(`    - ${a.name} [${a.provider.id}] ${a.emailAddresses.join(", ")}`);
  } catch (e) {
    console.log(`✗ Account enumeration via Mail automation: ${(e as Error).message}`);
    console.log("  → Grant Automation → Mail to your terminal / the host app, then retry.");
  }
}
main().catch(e => console.error("DIAGNOSTIC ERROR:", e));
