import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { jxaCaller, osaRunner, type Runner } from "../osa/jxa.js";

export type { Runner };
const run = jxaCaller(join(dirname(fileURLToPath(import.meta.url)), "jxa"), osaRunner(30000));

export interface FullMessage {
  id: string;
  headers: { from: string; to: string[]; cc: string[]; subject: string; date: string; message_id: string };
  body_plain: string;
  attachments: Array<{ name: string; size: number }>;
}

export async function getMessage(
  id: string,
  opts: { runner?: Runner } = {}
): Promise<FullMessage> {
  return run<FullMessage>("get-message.js", [id], opts.runner);
}
