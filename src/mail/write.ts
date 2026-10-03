import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { jxaCaller, osaRunner, type Runner } from "../osa/jxa.js";

export type { Runner };
const run = jxaCaller(join(dirname(fileURLToPath(import.meta.url)), "jxa"), osaRunner(30000));

export interface SetStatusResult { id: string; prop: "read" | "flagged"; value: boolean; }

export async function setStatus(
  id: string, prop: "read" | "flagged", value: boolean, opts: { runner?: Runner } = {}
): Promise<SetStatusResult> {
  return run<SetStatusResult>("set-status.js", [id, prop, String(value)], opts.runner);
}

export interface MoveResult { id: string; movedTo: string; alreadyThere?: boolean; }

export async function moveMessage(
  id: string, targetMailbox: string, opts: { runner?: Runner } = {}
): Promise<MoveResult> {
  return run<MoveResult>("move.js", [id, targetMailbox], opts.runner);
}

export interface DraftResult {
  draft_id: string | null;
  account: string;
  mailbox: string | null;
  subject: string;
  fallbackVisible: boolean;
}

interface ComposeInput { account: string; to: string; subject: string; body: string; cc?: string }

function composeArgs(input: ComposeInput): string[] {
  const args = [input.account, input.to, input.subject, input.body];
  if (input.cc) args.push("--cc", input.cc);
  return args;
}

export async function createDraft(
  input: ComposeInput, opts: { runner?: Runner } = {}
): Promise<DraftResult> {
  return run<DraftResult>("draft.js", composeArgs(input), opts.runner);
}

export interface DeleteResult { id: string; deleted: boolean; }

export async function deleteMessage(
  id: string, opts: { runner?: Runner } = {}
): Promise<DeleteResult> {
  return run<DeleteResult>("delete.js", [id], opts.runner);
}

export interface SendResult { sent: boolean; to: string; account: string; }

export async function sendMessage(
  input: ComposeInput, opts: { runner?: Runner } = {}
): Promise<SendResult> {
  return run<SendResult>("send.js", composeArgs(input), opts.runner);
}
