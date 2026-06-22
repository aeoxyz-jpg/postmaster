import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchMessages } from "../mail/search.js";
import { summarize } from "../mail/summarize.js";
import { getMessage } from "../mail/read.js";
import { computeMailboxPatterns, resolveUuids, type MailContext } from "../mail/context.js";
import { loadConfig } from "../config.js";

const DAY = 86400;
function sinceFromDays(days?: number): number {
  if (days == null) return 0;
  return Math.floor(Date.now() / 1000) - days * DAY;
}
function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerReadTools(server: McpServer, ctx: MailContext): void {
  server.registerTool(
    "list_accounts",
    { description: "List Mail accounts detected at runtime (name, type, email addresses, whether it's the default sending account).", inputSchema: {} },
    async () => {
      const def = loadConfig().defaultAccount;
      return json(
        ctx.accounts.map((a) => ({
          name: a.name, type: a.type, provider: a.provider.id, emailAddresses: a.emailAddresses,
          isDefault: a.name === def,
        }))
      );
    }
  );

  server.registerTool(
    "list_mailboxes",
    { description: "List mailbox URLs known to the SQLite index, optionally filtered to accounts.", inputSchema: { accounts: z.array(z.string()).optional() } },
    async ({ accounts }) => {
      const uuids = resolveUuids(ctx, accounts);
      const rows = ctx.db
        .prepare("SELECT url FROM mailboxes ORDER BY url")
        .all() as Array<{ url: string }>;
      const out = rows
        .map((r) => r.url)
        .filter((url) => uuids.some((u) => url.includes(`imap://${u}/`)));
      return json(out);
    }
  );

  server.registerTool(
    "search_messages",
    {
      description: "Search mail by keyword/sender/account/time. Subject+sender only; use get_message for body.",
      inputSchema: {
        query: z.string().default(""),
        accounts: z.array(z.string()).optional(),
        from: z.string().optional(),
        days: z.number().optional().describe("limit to the last N days (default: all)"),
        unreadOnly: z.boolean().optional(),
        limit: z.number().default(30),
      },
    },
    async ({ query, accounts, from, days, unreadOnly, limit }) => {
      const selected = accounts
        ? ctx.accounts.filter((a) => accounts.includes(a.name))
        : ctx.accounts;
      const res = searchMessages(ctx.db, {
        query,
        accountNames: ctx.accountNames,
        accountUuids: resolveUuids(ctx, accounts),
        mailboxPatterns: computeMailboxPatterns(selected),
        fromFilter: from,
        sinceEpoch: sinceFromDays(days),
        unreadOnly,
        limit,
      });
      return json(res);
    }
  );

  server.registerTool(
    "get_message",
    { description: "Read a full message (headers + plain body + attachment metadata) by id.", inputSchema: { id: z.string().describe("account::mailbox::rowid from search_messages") } },
    async ({ id }) => json(await getMessage(id))
  );

  server.registerTool(
    "summarize",
    { description: "Per-account totals (total/unread/flagged) over a time window — daily/weekly digest.", inputSchema: { accounts: z.array(z.string()).optional(), days: z.number().default(7) } },
    async ({ accounts, days }) => {
      const selected = accounts
        ? ctx.accounts.filter((a) => accounts.includes(a.name))
        : ctx.accounts;
      return json(
        summarize(ctx.db, {
          accountNames: ctx.accountNames,
          accountUuids: resolveUuids(ctx, accounts),
          mailboxPatterns: computeMailboxPatterns(selected),
          sinceEpoch: sinceFromDays(days),
        })
      );
    }
  );
}
