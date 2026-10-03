import { describe, it, expect } from "vitest";
import { computeMailboxPatterns, resolveUuids, selectAccounts } from "../src/mail/context.js";
import { GmailProvider, GenericProvider } from "../src/mail/provider.js";

describe("computeMailboxPatterns", () => {
  it("unions provider patterns across selected accounts", () => {
    const accts = [
      { name: "g", uuid: "u1", type: "imap", serverName: "imap.gmail.com", emailAddresses: [], provider: new GmailProvider() },
      { name: "i", uuid: "u2", type: "iCloud", serverName: "me.com", emailAddresses: [], provider: new GenericProvider() },
    ];
    const pats = computeMailboxPatterns(accts);
    expect(pats).toContain("%/All%20Mail");
    expect(pats).toContain("%/INBOX");
  });

  it("dedups identical patterns across accounts using the same provider", () => {
    const accts = [
      { provider: new GenericProvider() },
      { provider: new GenericProvider() },
    ];
    const pats = computeMailboxPatterns(accts);
    // GenericProvider yields 3 patterns; two accounts must not double them.
    expect(pats).toEqual(new GenericProvider().defaultMailboxLikePatterns());
  });
});

describe("resolveUuids", () => {
  const ctx = {
    accounts: [
      { name: "g", uuid: "u1" },
      { name: "i", uuid: "u2" },
    ],
  } as any;
  it("returns all uuids when names omitted", () => {
    expect(resolveUuids(ctx)).toEqual(["u1", "u2"]);
  });
  it("maps names to uuids", () => {
    expect(resolveUuids(ctx, ["i"])).toEqual(["u2"]);
  });
  it("throws on unknown account name", () => {
    expect(() => resolveUuids(ctx, ["nope"])).toThrow(/unknown account/);
  });
});

describe("selectAccounts", () => {
  const ctx = { accounts: [{ name: "g", uuid: "u1" }, { name: "i", uuid: "u2" }] } as any;
  it("returns all accounts when names omitted or empty", () => {
    expect(selectAccounts(ctx).map((a) => a.name)).toEqual(["g", "i"]);
    expect(selectAccounts(ctx, []).map((a) => a.name)).toEqual(["g", "i"]);
  });
  it("throws on an unknown name instead of silently dropping it", () => {
    expect(() => selectAccounts(ctx, ["g", "nope"])).toThrow(/unknown account: nope/);
  });
});
