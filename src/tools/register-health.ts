import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runHealthChecks, formatHealthReport } from "../health.js";
import { loadConfig } from "../config.js";

/** Always-available health tool. Explains missing permissions in-conversation so
 *  the user never sees a bare "disconnected" with no reason. */
export function registerHealthTools(server: McpServer): void {
  server.registerTool(
    "doctor",
    {
      description:
        "Diagnose postmaster's setup: whether the Mail library is found, the " +
        "Envelope Index is readable (Full Disk Access), and accounts enumerate " +
        "(Automation → Mail). Returns a report with remediation for anything missing.",
      inputSchema: {},
    },
    async () => {
      const report = await runHealthChecks();
      const cfg = loadConfig();
      const defaults =
        `\nDefaults: account=${cfg.defaultAccount ?? "(auto on first use)"}, ` +
        `calendar=${cfg.defaultCalendar ?? "(auto on first use)"}`;
      return { content: [{ type: "text" as const, text: formatHealthReport(report) + defaults }] };
    }
  );
}
