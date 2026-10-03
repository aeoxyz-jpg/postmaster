import { join } from "node:path";
import { runOsa } from "./runner.js";

/** Runs a JXA script file with argv and returns its stdout. Injectable so tests never touch osascript. */
export type Runner = (file: string, args: string[]) => Promise<string>;

export function osaRunner(timeoutMs: number): Runner {
  return (file, args) => runOsa({ language: "JavaScript", file, args, timeoutMs });
}

export function parseJxa<T>(json: string, script: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(`${script} returned unparseable output: ${json.slice(0, 120)}`);
  }
}

/** Bind a JXA script directory + default runner into a `run(script, args, runner?)` call
 *  that executes the script and parses its JSON output. */
export function jxaCaller(dir: string, defaultRunner: Runner) {
  return async <T>(script: string, args: string[], runner: Runner = defaultRunner): Promise<T> =>
    parseJxa<T>(await runner(join(dir, script), args), script);
}
