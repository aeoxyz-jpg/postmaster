import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runHealthChecks, formatHealthReport } from "../health.js";

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
      return { content: [{ type: "text" as const, text: formatHealthReport(report) }] };
    }
  );
}
