import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setStatus, moveMessage, createDraft, deleteMessage, sendMessage } from "../mail/write.js";
import { resolveLiveId, describeMessage } from "../mail/resolve-id.js";
import { resolveDefaultAccount } from "../mail/default-account.js";
import type { ConfirmStore } from "../mail/confirm.js";
import type { MailContext } from "../mail/context.js";
import { json, confirmGate } from "./util.js";

function providerForId(ctx: MailContext, id: string) {
  const account = id.split("::")[0];
  const acct = ctx.accounts.find((a) => a.name === account);
  if (!acct) throw new Error(`unknown account in id: ${account}`);
  return acct.provider;
}

export function registerWriteTools(server: McpServer, ctx: MailContext, confirms: ConfirmStore): void {
  server.registerTool("mark_read", { description: "Mark a message read.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(resolveLiveId(ctx, id), "read", true)));
  server.registerTool("mark_unread", { description: "Mark a message unread.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(resolveLiveId(ctx, id), "read", false)));
  server.registerTool("flag", { description: "Flag (star) a message.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(resolveLiveId(ctx, id), "flagged", true)));
  server.registerTool("unflag", { description: "Remove the flag (star) from a message.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(resolveLiveId(ctx, id), "flagged", false)));

  server.registerTool("move_message",
    { description: "Move a message to a named mailbox within its account.", inputSchema: { id: z.string(), mailbox: z.string() } },
    async ({ id, mailbox }) => json(await moveMessage(resolveLiveId(ctx, id), mailbox)));

  server.registerTool("archive",
    { description: "Archive a message (Gmail: All Mail; iCloud: Archive). If the message is already there, reports alreadyThere:true.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await moveMessage(resolveLiveId(ctx, id), providerForId(ctx, id).archiveMailbox)));

  server.registerTool("create_draft",
    { description: "Create a draft in the account's Drafts mailbox (silent). Returns draft_id. account is optional — omitted uses your default account (auto-seeded on first use). If the silent save can't be verified for this account, a visible compose window is opened instead and fallbackVisible is true (no draft_id).",
      inputSchema: { account: z.string().optional(), to: z.string(), subject: z.string(), body: z.string(), cc: z.string().optional() } },
    async ({ account, to, subject, body, cc }) => {
      const { account: acct, reseeded } = resolveDefaultAccount(ctx.accounts, account);
      const res = await createDraft({ account: acct, to, subject, body, cc });
      return json({ ...res, usedAccount: acct, defaultReseeded: reseeded });
    });

  // delete is destructive -> two-step confirmation.
  server.registerTool("delete_message",
    { description: "Delete a message (moves to trash). TWO-STEP: call without confirm_token to get a token + summary; call again with the token to execute.",
      inputSchema: { id: z.string(), confirm_token: z.string().optional() } },
    async ({ id, confirm_token }) => confirmGate(confirms, confirm_token, {
      kind: "delete_message",
      request: "delete",
      stage: async () => {
        const d = describeMessage(ctx, id);
        const summary = d
          ? `Delete message "${d.subject}" from ${d.from} (${d.date}) — moves to trash`
          : `Delete message ${id} (moves to trash)`;
        return { args: { id }, summary, review: { summary } };
      },
      matches: (staged) => staged.id === id,
      execute: () => deleteMessage(resolveLiveId(ctx, id)),
      note: "Re-call delete_message with this confirm_token to execute.",
    }));

  // send is destructive + outward-facing -> two-step confirmation (like delete).
  server.registerTool("send_message",
    { description: "Send an email. account is optional — omitted uses your default account (auto-seeded on first use). TWO-STEP: call without confirm_token to get a token + a full summary of sender/recipients/subject/body for review; call again with the token to actually send. Sending cannot be undone.",
      inputSchema: { account: z.string().optional(), to: z.string(), subject: z.string(), body: z.string(), cc: z.string().optional(), confirm_token: z.string().optional() } },
    async ({ account, to, subject, body, cc, confirm_token }) => confirmGate(confirms, confirm_token, {
      kind: "send_message",
      request: "send",
      // Resolve the default ONLY at stage time; the staged token is the source of truth for
      // what the user reviewed. (Re-resolving at confirm could pick a different account if the
      // default changed in between, and wrongly reject an already-reviewed send.)
      stage: async () => {
        const { account: acct, reseeded } = resolveDefaultAccount(ctx.accounts, account);
        const summary = `Send from ${acct} to ${to}${cc ? ` (cc ${cc})` : ""} — subject: "${subject}"`;
        return {
          args: { account: acct, to, subject, body, cc: cc ?? null },
          summary,
          review: { review: { account: acct, to, cc: cc ?? null, subject, body }, defaultReseeded: reseeded },
        };
      },
      matches: (staged) =>
        (account == null || account === staged.account) && staged.to === to
        && staged.subject === subject && staged.body === body
        && (staged.cc ?? null) === (cc ?? null),
      execute: (staged) => sendMessage({ account: staged.account, to, subject, body, cc }),
      note: "Review the full message above. Re-call send_message with this confirm_token to send. This cannot be undone.",
    }));
}
