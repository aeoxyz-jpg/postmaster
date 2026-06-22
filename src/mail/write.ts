import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runOsa } from "../osa/runner.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const jxa = (name: string) => join(HERE, "jxa", name);

export type Runner = (file: string, args: string[]) => Promise<string>;
const defaultRunner: Runner = (file, args) =>
  runOsa({ language: "JavaScript", file, args, timeoutMs: 30000 });

function parse<T>(json: string, script: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(`${script} returned unparseable output: ${json.slice(0, 120)}`);
  }
}

export interface SetStatusResult { id: string; prop: "read" | "flagged"; value: boolean; }

export async function setStatus(
  id: string, prop: "read" | "flagged", value: boolean, opts: { runner?: Runner } = {}
): Promise<SetStatusResult> {
  const runner = opts.runner ?? defaultRunner;
  const json = await runner(jxa("set-status.js"), [id, prop, String(value)]);
  return parse<SetStatusResult>(json, "set-status.js");
}

export interface MoveResult { id: string; movedTo: string; alreadyThere?: boolean; }

export async function moveMessage(
  id: string, targetMailbox: string, opts: { runner?: Runner } = {}
): Promise<MoveResult> {
  const runner = opts.runner ?? defaultRunner;
  const json = await runner(jxa("move.js"), [id, targetMailbox]);
  return parse<MoveResult>(json, "move.js");
}

export interface DraftResult {
  draft_id: string | null;
  account: string;
  mailbox: string | null;
  subject: string;
  fallbackVisible: boolean;
}

export async function createDraft(
  input: { account: string; to: string; subject: string; body: string; cc?: string },
  opts: { runner?: Runner } = {}
): Promise<DraftResult> {
  const runner = opts.runner ?? defaultRunner;
  const args = [input.account, input.to, input.subject, input.body];
  if (input.cc) args.push("--cc", input.cc);
  const json = await runner(jxa("draft.js"), args);
  return parse<DraftResult>(json, "draft.js");
}

export interface DeleteResult { id: string; deleted: boolean; }

export async function deleteMessage(
  id: string, opts: { runner?: Runner } = {}
): Promise<DeleteResult> {
  const runner = opts.runner ?? defaultRunner;
  const json = await runner(jxa("delete.js"), [id]);
  return parse<DeleteResult>(json, "delete.js");
}

export interface SendResult { sent: boolean; to: string; account: string; }

export async function sendMessage(
  input: { account: string; to: string; subject: string; body: string; cc?: string },
  opts: { runner?: Runner } = {}
): Promise<SendResult> {
  const runner = opts.runner ?? defaultRunner;
  const args = [input.account, input.to, input.subject, input.body];
  if (input.cc) args.push("--cc", input.cc);
  const json = await runner(jxa("send.js"), args);
  return parse<SendResult>(json, "send.js");
}
