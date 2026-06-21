import { describe, it, expect } from "vitest";
import { getMessage } from "../src/mail/read.js";

const FAKE = JSON.stringify({
  id: "testuser::All Mail::101",
  headers: { from: "agent@realty.com", to: ["me@x.com"], cc: [], subject: "Offer accepted", date: "2026-06-01T10:00:00.000Z", message_id: "<abc@x>" },
  body_plain: "Timeline:\nInspection in 7 days.",
  attachments: [],
});

describe("getMessage", () => {
  it("passes the id to JXA and returns the parsed message", async () => {
    let received: string[] = [];
    const msg = await getMessage("testuser::All Mail::101", {
      runner: async (_file, args) => { received = args; return FAKE; },
    });
    expect(received).toEqual(["testuser::All Mail::101"]);
    expect(msg.headers.subject).toBe("Offer accepted");
    expect(msg.body_plain).toContain("Inspection in 7 days");
  });

  it("throws a diagnostic error on unparseable output", async () => {
    await expect(getMessage("x::y::1", { runner: async () => "not json" }))
      .rejects.toThrow(/unparseable output/);
  });
});
