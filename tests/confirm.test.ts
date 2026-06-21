import { describe, it, expect } from "vitest";
import { ConfirmStore } from "../src/mail/confirm.js";

describe("ConfirmStore", () => {
  it("issues a token for a pending action and consumes it once", () => {
    const store = new ConfirmStore({ ttlMs: 60000, now: () => 1000 });
    const { token } = store.stage("delete_message", { id: "a::b::1" }, "Delete 1 message from a");
    expect(typeof token).toBe("string");
    const action = store.consume(token);
    expect(action).toMatchObject({ kind: "delete_message", args: { id: "a::b::1" } });
    // second consume fails (single-use)
    expect(() => store.consume(token)).toThrow(/invalid or expired/);
  });

  it("rejects an unknown token", () => {
    const store = new ConfirmStore({ ttlMs: 60000, now: () => 1000 });
    expect(() => store.consume("nope")).toThrow(/invalid or expired/);
  });

  it("expires a token after ttl", () => {
    let t = 1000;
    const store = new ConfirmStore({ ttlMs: 5000, now: () => t });
    const { token } = store.stage("delete_message", { id: "x" }, "summary");
    t = 7000; // past ttl
    expect(() => store.consume(token)).toThrow(/invalid or expired/);
  });

  it("generates distinct tokens", () => {
    const store = new ConfirmStore({ ttlMs: 60000, now: () => 1000 });
    const a = store.stage("delete_message", { id: "1" }, "s").token;
    const b = store.stage("delete_message", { id: "2" }, "s").token;
    expect(a).not.toBe(b);
  });
});
