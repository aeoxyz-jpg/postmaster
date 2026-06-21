import { describe, it, expect } from "vitest";
import { enumerateAccounts, buildAccountMap } from "../src/mail/detect.js";

const FAKE_JSON = JSON.stringify([
  { name: "testuser", uuid: "AAAA-testuser", type: "imap", serverName: "imap.gmail.com", emailAddresses: ["testuser@example.com"] },
  { name: "iCloud", uuid: "IIII-icloud", type: "iCloud", serverName: "imap.mail.me.com", emailAddresses: ["x@icloud.com"] },
]);

describe("enumerateAccounts", () => {
  it("parses JXA output into MailAccount[] and assigns providers", async () => {
    const accts = await enumerateAccounts({ runner: async () => FAKE_JSON });
    expect(accts.map((a) => a.name)).toEqual(["testuser", "iCloud"]);
    expect(accts[0].provider.id).toBe("gmail");
    expect(accts[1].provider.id).toBe("generic");
  });
  it("builds a uuid->name map", async () => {
    const accts = await enumerateAccounts({ runner: async () => FAKE_JSON });
    const map = buildAccountMap(accts);
    expect(map.get("AAAA-testuser")).toBe("testuser");
    expect(map.get("IIII-icloud")).toBe("iCloud");
  });
  it("throws a diagnostic error on unparseable output", async () => {
    await expect(enumerateAccounts({ runner: async () => "not json" }))
      .rejects.toThrow(/unparseable output/);
  });
});
