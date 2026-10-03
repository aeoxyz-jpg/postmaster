import type { ConfirmStore } from "../mail/confirm.js";

export function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export interface ConfirmGate<A extends Record<string, unknown>> {
  /** ConfirmStore kind; a token staged for another kind is rejected. */
  kind: string;
  /** Word used in the mismatch error: "confirm_token does not match this <request> request". */
  request: string;
  /** Build what gets staged. `review` fields are returned to the caller alongside the token. */
  stage: () => Promise<{ args: A; summary: string; review: Record<string, unknown> }>;
  /** Re-validate the current call against what was reviewed. */
  matches: (staged: A) => boolean;
  /** Execute using the staged args (the source of truth for what the user approved). */
  execute: (staged: A) => Promise<unknown>;
  note: string;
}

/** Shared two-step confirmation for destructive tools: without a token, stage the action
 *  and return it for review; with a token, consume it (single use, even on mismatch) and
 *  execute only if it was staged for this kind and still matches the call. */
export async function confirmGate<A extends Record<string, unknown>>(
  confirms: ConfirmStore, token: string | undefined, gate: ConfirmGate<A>
) {
  if (!token) {
    const { args, summary, review } = await gate.stage();
    const { token: confirm_token } = confirms.stage(gate.kind, args, summary);
    return json({ pending: true, confirm_token, ...review, note: gate.note });
  }
  const action = confirms.consume(token);
  const staged = action.args as A;
  if (action.kind !== gate.kind || !gate.matches(staged)) {
    throw new Error(`confirm_token does not match this ${gate.request} request`);
  }
  return json(await gate.execute(staged));
}
