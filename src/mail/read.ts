import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runOsa } from "../osa/runner.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const GET_MESSAGE_JXA = join(HERE, "jxa", "get-message.js");

export interface FullMessage {
  id: string;
  headers: { from: string; to: string[]; cc: string[]; subject: string; date: string; message_id: string };
  body_plain: string;
  attachments: Array<{ name: string; size: number }>;
}

export type Runner = (file: string, args: string[]) => Promise<string>;

const defaultRunner: Runner = (file, args) =>
  runOsa({ language: "JavaScript", file, args, timeoutMs: 30000 });

export async function getMessage(
  id: string,
  opts: { runner?: Runner } = {}
): Promise<FullMessage> {
  const runner = opts.runner ?? defaultRunner;
  const json = await runner(GET_MESSAGE_JXA, [id]);
  try {
    return JSON.parse(json) as FullMessage;
  } catch {
    throw new Error(`get-message.js returned unparseable output: ${json.slice(0, 120)}`);
  }
}
