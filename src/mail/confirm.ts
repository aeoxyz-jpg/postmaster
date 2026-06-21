export interface PendingAction {
  kind: string;
  args: Record<string, unknown>;
  summary: string;
}

interface Entry extends PendingAction {
  expiresAt: number;
}

/** Two-step confirmation for destructive ops. stage() returns a single-use token
 *  + human-readable summary; consume() validates and returns the action to execute. */
export class ConfirmStore {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly entries = new Map<string, Entry>();
  private counter = 0;

  constructor(opts: { ttlMs?: number; now?: () => number } = {}) {
    this.ttlMs = opts.ttlMs ?? 120000;
    this.now = opts.now ?? (() => Date.now());
  }

  stage(kind: string, args: Record<string, unknown>, summary: string): { token: string; summary: string } {
    const token = `confirm-${++this.counter}-${this.now().toString(36)}`;
    this.entries.set(token, { kind, args, summary, expiresAt: this.now() + this.ttlMs });
    return { token, summary };
  }

  consume(token: string): PendingAction {
    const e = this.entries.get(token);
    if (!e || e.expiresAt < this.now()) {
      this.entries.delete(token);
      throw new Error(`confirmation token invalid or expired`);
    }
    this.entries.delete(token);
    return { kind: e.kind, args: e.args, summary: e.summary };
  }
}
