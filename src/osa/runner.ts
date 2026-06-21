import { execFile } from "node:child_process";

export class OsaError extends Error {
  constructor(message: string, readonly stderr: string = "") {
    super(message);
    this.name = "OsaError";
  }
}

export interface RunOsaOpts {
  language: "JavaScript" | "AppleScript";
  /** Inline script. Mutually exclusive with `file`. */
  script?: string;
  /** Path to a .js/.scpt file. Mutually exclusive with `script`. */
  file?: string;
  /** argv passed to the script's run(argv). */
  args?: string[];
  /** Hard timeout; the process is killed if exceeded. Default 30s. */
  timeoutMs?: number;
}

export function runOsa(opts: RunOsaOpts): Promise<string> {
  const argv: string[] = ["-l", opts.language];
  if (opts.script != null) argv.push("-e", opts.script);
  else if (opts.file != null) argv.push(opts.file);
  else return Promise.reject(new OsaError("runOsa requires script or file"));
  if (opts.args) argv.push(...opts.args);

  const timeoutMs = opts.timeoutMs ?? 30000;
  return new Promise<string>((resolve, reject) => {
    execFile(
      "/usr/bin/osascript",
      argv,
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const killed = (err as NodeJS.ErrnoException & { killed?: boolean }).killed;
          const msg = killed ? `osascript timed out after ${timeoutMs}ms` : `osascript failed: ${stderr.trim() || err.message}`;
          reject(new OsaError(msg, stderr));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}
