import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MailContext } from "../mail/context.js";
import { listCalendars } from "../calendar/calendar.js";
import { loadConfig, setDefaults } from "../config.js";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerConfigTools(server: McpServer, ctx: MailContext): void {
  server.registerTool(
    "set_defaults",
    {
      description:
        "Set the default account (for send_message/create_draft) and/or default calendar (for " +
        "prepare_calendar_events) so they don't need to be specified each time. Pass account and/or " +
        "calendar by name. Defaults otherwise auto-seed from macOS on first use.",
      inputSchema: {
        account: z.string().optional().describe("account name from list_accounts"),
        calendar: z.string().optional().describe("calendar name from list_calendars"),
      },
    },
    async ({ account, calendar }) => {
      const accountNames = ctx.accounts.map((a) => a.name);
      const calendarNames = (await listCalendars()).map((c) => c.name);
      const cfg = setDefaults({ account, calendar }, accountNames, calendarNames);
      return json({ defaults: cfg, note: "Defaults saved. Omit account/calendar in future calls to use them." });
    }
  );
}
