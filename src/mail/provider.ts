export interface MailAccount {
  name: string;
  uuid: string;          // == JXA account.id(), matches imap://<uuid>/ in mailboxes.url
  type: string;          // JXA accountType: "imap" | "iCloud" | ...
  serverName: string;    // JXA server name, e.g. imap.gmail.com
  emailAddresses: string[];
}

export interface AccountProvider {
  readonly id: string;
  /** Does this provider handle the given account? */
  matches(acct: MailAccount): boolean;
  /** SQL `mailboxes.url LIKE` patterns where this account's messages actually live. */
  defaultMailboxLikePatterns(): string[];
  /** Whether a "star" maps to Mail's flagged status. */
  readonly starIsFlag: boolean;
  readonly draftsMailbox: string;
  readonly archiveMailbox: string;
  readonly trashMailbox: string;
}

export class GmailProvider implements AccountProvider {
  readonly id = "gmail";
  readonly starIsFlag = true;
  readonly draftsMailbox = "Drafts";
  readonly archiveMailbox = "All Mail";
  readonly trashMailbox = "Trash";
  matches(acct: MailAccount): boolean {
    const hay = `${acct.serverName} ${acct.emailAddresses.join(" ")}`.toLowerCase();
    return /gmail\.com|googlemail\.com/.test(hay);
  }
  defaultMailboxLikePatterns(): string[] {
    // Gmail stores everything in [Gmail]/All Mail; INBOX/Sent are virtual (no SQL rows).
    return ["%/All%20Mail"];
  }
}

/** Fallback for non-Gmail accounts (iCloud etc.): use standard INBOX/Sent. */
export class GenericProvider implements AccountProvider {
  readonly id = "generic";
  readonly starIsFlag = true;
  readonly draftsMailbox = "Drafts";
  readonly archiveMailbox = "Archive";
  readonly trashMailbox = "Deleted Messages";
  matches(): boolean { return true; }
  defaultMailboxLikePatterns(): string[] {
    return ["%/INBOX", "%/Sent%20Messages", "%/Sent"];
  }
}

const REGISTRY: AccountProvider[] = [new GmailProvider()];
const FALLBACK = new GenericProvider();

export function providerFor(acct: MailAccount): AccountProvider {
  return REGISTRY.find((p) => p.matches(acct)) ?? FALLBACK;
}
