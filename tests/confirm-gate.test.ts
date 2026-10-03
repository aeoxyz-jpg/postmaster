import { describe, it, expect } from "vitest";
import { ConfirmStore } from "../src/mail/confirm.js";
import { confirmGate, type ConfirmGate } from "../src/tools/util.js";

const parse = (r: { content: Array<{ text: string }> }) => JSON.parse(r.content[0].text);

function gate(over: Partial<ConfirmGate<{ id: string }>> = {}, executed: string[] = []): ConfirmGate<{ id: string }> {
  return {
    kind: "delete_message",
    request: "delete",
    stage: async () => ({ args: { id: "m1" }, summary: "Delete m1", review: { summary: "Delete m1" } }),
    matches: (s) => s.id === "m1",
    execute: async (s) => { executed.push(s.id); return { id: s.id, deleted: true }; },
    note: "re-call",
    ...over,
  };
}

describe("confirmGate", () => {
  it("stages without a token and does not execute", async () => {
    const executed: string[] = [];
    const out = parse(await confirmGate(new ConfirmStore(), undefined, gate({}, executed)));
    expect(out).toEqual({ pending: true, confirm_token: expect.any(String), summary: "Delete m1", note: "re-call" });
    expect(executed).toEqual([]);
  });

  it("executes with the staged args after a matching token", async () => {
    const confirms = new ConfirmStore();
    const executed: string[] = [];
    const { confirm_token } = parse(await confirmGate(confirms, undefined, gate({}, executed)));
    const out = parse(await confirmGate(confirms, confirm_token, gate({}, executed)));
    expect(out).toEqual({ id: "m1", deleted: true });
    expect(executed).toEqual(["m1"]);
  });

  it("rejects a token whose staged args no longer match, and burns it", async () => {
    const confirms = new ConfirmStore();
    const executed: string[] = [];
    const { confirm_token } = parse(await confirmGate(confirms, undefined, gate({}, executed)));
    await expect(confirmGate(confirms, confirm_token, gate({ matches: () => false }, executed)))
      .rejects.toThrow("confirm_token does not match this delete request");
    await expect(confirmGate(confirms, confirm_token, gate({}, executed))).rejects.toThrow(/invalid or expired/);
    expect(executed).toEqual([]);
  });

  it("rejects a token staged for a different kind", async () => {
    const confirms = new ConfirmStore();
    const { token } = confirms.stage("send_message", { id: "m1" }, "Send");
    await expect(confirmGate(confirms, token, gate())).rejects.toThrow(/does not match/);
  });
});
