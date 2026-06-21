import { describe, it, expect } from "vitest";
import { GmailProvider, GenericProvider, providerFor, type MailAccount } from "../src/mail/provider.js";

const gmail: MailAccount = {
  name: "testuser", uuid: "AAAA-testuser", type: "imap",
  serverName: "imap.gmail.com", emailAddresses: ["testuser@example.com"],
};
const icloud: MailAccount = {
  name: "iCloud", uuid: "IIII-icloud", type: "iCloud",
  serverName: "imap.mail.me.com", emailAddresses: ["x@icloud.com"],
};

describe("GmailProvider", () => {
  const p = new GmailProvider();
  it("matches gmail by server name", () => expect(p.matches(gmail)).toBe(true));
  it("does not match iCloud", () => expect(p.matches(icloud)).toBe(false));
  it("targets [Gmail]/All Mail for search", () => {
    expect(p.defaultMailboxLikePatterns()).toContain("%/All%20Mail");
  });
  it("maps star to flag", () => expect(p.starIsFlag).toBe(true));
});

describe("providerFor", () => {
  it("returns GmailProvider for a gmail account", () => expect(providerFor(gmail).id).toBe("gmail"));
  it("falls back to GenericProvider for iCloud", () => expect(providerFor(icloud).id).toBe("generic"));
});

describe("provider folder semantics", () => {
  it("gmail uses All Mail / Trash / Drafts", () => {
    const p = new GmailProvider();
    expect(p.archiveMailbox).toBe("All Mail");
    expect(p.trashMailbox).toBe("Trash");
    expect(p.draftsMailbox).toBe("Drafts");
  });
  it("generic uses Archive / Deleted Messages / Drafts", () => {
    const p = new GenericProvider();
    expect(p.archiveMailbox).toBe("Archive");
    expect(p.trashMailbox).toBe("Deleted Messages");
    expect(p.draftsMailbox).toBe("Drafts");
  });
});
