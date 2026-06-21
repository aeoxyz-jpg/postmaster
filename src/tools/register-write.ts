import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setStatus, moveMessage, createDraft, deleteMessage, sendMessage } from "../mail/write.js";
import type { ConfirmStore } from "../mail/confirm.js";
import type { MailContext } from "../mail/context.js";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function providerForId(ctx: MailContext, id: string) {
  const account = id.split("::")[0];
  const acct = ctx.accounts.find((a) => a.name === account);
  if (!acct) throw new Error(`unknown account in id: ${account}`);
  return acct.provider;
}

export function registerWriteTools(server: McpServer, ctx: MailContext, confirms: ConfirmStore): void {
  server.registerTool("mark_read", { description: "Mark a message read.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(id, "read", true)));
  server.registerTool("mark_unread", { description: "Mark a message unread.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(id, "read", false)));
  server.registerTool("flag", { description: "Flag (star) a message.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(id, "flagged", true)));
  server.registerTool("unflag", { description: "Remove the flag (star) from a message.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await setStatus(id, "flagged", false)));

  server.registerTool("move_message",
    { description: "Move a message to a named mailbox within its account.", inputSchema: { id: z.string(), mailbox: z.string() } },
    async ({ id, mailbox }) => json(await moveMessage(id, mailbox)));

  server.registerTool("archive",
    { description: "Archive a message (Gmail: All Mail; iCloud: Archive).", inputSchema: { id: z.string() } },
    async ({ id }) => json(await moveMessage(id, providerForId(ctx, id).archiveMailbox)));

  server.registerTool("create_draft",
    { description: "Create a draft in the account's Drafts mailbox (silent). Returns draft_id. If the silent save can't be verified for this account, a visible compose window is opened instead and fallbackVisible is true (no draft_id).",
      inputSchema: { account: z.string(), to: z.string(), subject: z.string(), body: z.string(), cc: z.string().optional() } },
    async (input) => json(await createDraft(input)));

  // delete is destructive -> two-step confirmation.
  server.registerTool("delete_message",
    { description: "Delete a message (moves to trash). TWO-STEP: call without confirm_token to get a token + summary; call again with the token to execute.",
      inputSchema: { id: z.string(), confirm_token: z.string().optional() } },
    async ({ id, confirm_token }) => {
      if (!confirm_token) {
        const { token, summary } = confirms.stage("delete_message", { id }, `Delete message ${id} (moves to trash)`);
        return json({ pending: true, confirm_token: token, summary, note: "Re-call delete_message with this confirm_token to execute." });
      }
      const action = confirms.consume(confirm_token);
      if (action.kind !== "delete_message" || action.args.id !== id) {
        throw new Error("confirm_token does not match this delete request");
      }
      return json(await deleteMessage(id));
    });

  // send is destructive + outward-facing -> two-step confirmation (like delete).
  server.registerTool("send_message",
    { description: "Send an email from an account. TWO-STEP: call without confirm_token to get a token + a full summary of recipients/subject/body for review; call again with the token to actually send. Sending cannot be undone.",
      inputSchema: { account: z.string(), to: z.string(), subject: z.string(), body: z.string(), cc: z.string().optional(), confirm_token: z.string().optional() } },
    async ({ account, to, subject, body, cc, confirm_token }) => {
      if (!ctx.accounts.some((a) => a.name === account)) {
        throw new Error(`unknown account: ${account}`);
      }
      if (!confirm_token) {
        const summary = `Send from ${account} to ${to}${cc ? ` (cc ${cc})` : ""} — subject: "${subject}"`;
        const { token } = confirms.stage("send_message", { account, to, subject, body, cc: cc ?? null }, summary);
        return json({
          pending: true, confirm_token: token,
          review: { account, to, cc: cc ?? null, subject, body },
          note: "Review the full message above. Re-call send_message with this confirm_token to send. This cannot be undone.",
        });
      }
      const action = confirms.consume(confirm_token);
      if (action.kind !== "send_message"
        || action.args.account !== account || action.args.to !== to
        || action.args.subject !== subject || action.args.body !== body
        || (action.args.cc ?? null) !== (cc ?? null)) {
        throw new Error("confirm_token does not match this send request");
      }
      return json(await sendMessage({ account, to, subject, body, cc }));
    });
}
