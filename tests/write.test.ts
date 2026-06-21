import { describe, it, expect } from "vitest";
import { setStatus } from "../src/mail/write.js";
import { moveMessage } from "../src/mail/write.js";
import { createDraft } from "../src/mail/write.js";
import { deleteMessage } from "../src/mail/write.js";
import { sendMessage } from "../src/mail/write.js";

describe("setStatus", () => {
  it("passes id/prop/value to JXA and returns the parsed result", async () => {
    let got: string[] = [];
    const res = await setStatus("a::b::1", "read", true, {
      runner: async (_f, args) => { got = args; return JSON.stringify({ id: "a::b::1", prop: "read", value: true }); },
    });
    expect(got).toEqual(["a::b::1", "read", "true"]);
    expect(res).toMatchObject({ prop: "read", value: true });
  });
});

describe("moveMessage", () => {
  it("passes id + target mailbox to JXA", async () => {
    let got: string[] = [];
    const res = await moveMessage("a::b::1", "Archive", {
      runner: async (_f, args) => { got = args; return JSON.stringify({ id: "a::b::1", movedTo: "Archive" }); },
    });
    expect(got).toEqual(["a::b::1", "Archive"]);
    expect(res.movedTo).toBe("Archive");
  });
});

describe("createDraft", () => {
  it("passes account/to/subject/body (+cc) to JXA and returns draft id", async () => {
    let got: string[] = [];
    const res = await createDraft(
      { account: "testuser", to: "x@y.com", subject: "Hi", body: "Body", cc: "z@y.com" },
      { runner: async (_f, args) => { got = args; return JSON.stringify({ draft_id: "testuser::Drafts::55", account: "testuser", mailbox: "Drafts", subject: "Hi", fallbackVisible: false }); } }
    );
    expect(got).toEqual(["testuser", "x@y.com", "Hi", "Body", "--cc", "z@y.com"]);
    expect(res.draft_id).toBe("testuser::Drafts::55");
  });

  it("createDraft surfaces fallbackVisible when silent save is unverified", async () => {
    const res = await createDraft(
      { account: "testuser", to: "x@y.com", subject: "Hi", body: "B" },
      { runner: async () => JSON.stringify({ draft_id: null, account: "testuser", mailbox: null, subject: "Hi", fallbackVisible: true }) }
    );
    expect(res.draft_id).toBeNull();
    expect(res.fallbackVisible).toBe(true);
  });
});

describe("deleteMessage", () => {
  it("passes id to JXA and returns deleted:true", async () => {
    let got: string[] = [];
    const res = await deleteMessage("a::b::9", {
      runner: async (_f, args) => { got = args; return JSON.stringify({ id: "a::b::9", deleted: true }); },
    });
    expect(got).toEqual(["a::b::9"]);
    expect(res.deleted).toBe(true);
  });
});

describe("sendMessage", () => {
  it("passes account/to/subject/body (+cc) to JXA and returns sent:true", async () => {
    let got: string[] = [];
    const res = await sendMessage(
      { account: "testuser", to: "x@y.com", subject: "Hi", body: "Body", cc: "z@y.com" },
      { runner: async (_f, args) => { got = args; return JSON.stringify({ sent: true, to: "x@y.com", account: "testuser" }); } }
    );
    expect(got).toEqual(["testuser", "x@y.com", "Hi", "Body", "--cc", "z@y.com"]);
    expect(res.sent).toBe(true);
  });
});
