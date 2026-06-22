// Shared health/diagnostic checks used by both the standalone diagnose CLI and
// the in-conversation `doctor` MCP tool. Never throws past runHealthChecks.
import { findMailVersionDir, envelopeDbPath, openEnvelopeDb } from "./mail/db.js";
import { enumerateAccounts, type Runner } from "./mail/detect.js";

const FDA_REMEDIATION =
  "Grant Full Disk Access to the app running this server (Claude / your terminal) " +
  "in System Settings → Privacy & Security → Full Disk Access, then restart it.";
const AUTOMATION_REMEDIATION =
  "Grant Automation → Mail to the app running this server in " +
  "System Settings → Privacy & Security → Automation, then restart it.";

export interface HealthCheck {
  name: string;
  ok: boolean;
  detail: string;
  remediation?: string;
}

export interface HealthReport {
  platform: string;
  node: string;
  ok: boolean;
  checks: HealthCheck[];
}

export async function runHealthChecks(
  opts: { mailRoot?: string; runner?: Runner } = {}
): Promise<HealthReport> {
  const checks: HealthCheck[] = [];

  let versionDir: string | null = null;
  try {
    versionDir = findMailVersionDir(opts.mailRoot);
    checks.push({ name: "Mail library", ok: true, detail: versionDir });
  } catch (e) {
    checks.push({
      name: "Mail library",
      ok: false,
      detail: (e as Error).message,
      remediation: FDA_REMEDIATION,
    });
  }

  if (versionDir) {
    try {
      const db = openEnvelopeDb(envelopeDbPath(versionDir));
      try {
        const n = db.prepare("SELECT count(*) AS c FROM messages").get() as { c: number };
        checks.push({ name: "Envelope Index", ok: true, detail: `${n.c} messages` });
      } finally {
        db.close();
      }
    } catch (e) {
      checks.push({
        name: "Envelope Index",
        ok: false,
        detail: (e as Error).message,
        remediation: FDA_REMEDIATION,
      });
    }
  } else {
    checks.push({
      name: "Envelope Index",
      ok: false,
      detail: "skipped — no Mail library found",
      remediation: FDA_REMEDIATION,
    });
  }

  try {
    const accts = await enumerateAccounts({ runner: opts.runner });
    const detail =
      accts.length === 0
        ? "0 accounts found"
        : accts.map((a) => `${a.name} [${a.provider.id}] ${a.emailAddresses.join(", ")}`).join("; ");
    checks.push({ name: "Accounts", ok: accts.length > 0, detail });
  } catch (e) {
    checks.push({
      name: "Accounts",
      ok: false,
      detail: (e as Error).message,
      remediation: AUTOMATION_REMEDIATION,
    });
  }

  return {
    platform: process.platform,
    node: process.version,
    ok: checks.every((c) => c.ok),
    checks,
  };
}

export function formatHealthReport(r: HealthReport): string {
  const lines: string[] = [];
  lines.push("== postmaster health ==");
  lines.push(`platform: ${r.platform} node ${r.node}`);
  for (const c of r.checks) {
    lines.push(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
    if (!c.ok && c.remediation) lines.push(`  → ${c.remediation}`);
  }
  lines.push(r.ok ? "All checks passed." : "Some checks failed — see remediation above.");
  return lines.join("\n");
}
