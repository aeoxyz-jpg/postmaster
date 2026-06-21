#!/usr/bin/env osascript -l JavaScript
// Usage argv: <account> <to> <subject> <body> [--cc <addr>]
// Silently saves a draft into the account's Drafts mailbox(es).
// Output JSON: {draft_id|null, account, mailbox|null, subject, fallbackVisible:false}
function draftBoxes(acct) {
  return acct.mailboxes().filter((m) => m.name().toLowerCase().indexOf("draft") >= 0);
}
function idSet(boxes) {
  const s = {};
  for (const b of boxes) { for (const m of b.messages()) { s[String(m.id())] = true; } }
  return s;
}
function parseArgs(argv) {
  const opts = { cc: null };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--cc") opts.cc = argv[++i];
    else pos.push(argv[i]);
  }
  return { opts, pos };
}
function run(argv) {
  const { opts, pos } = parseArgs(argv);
  const [account, to, subject, body] = pos;
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;
  const acct = Mail.accounts.byName(account);
  const fromAddr = acct.emailAddresses()[0];

  const boxesBefore = draftBoxes(acct);
  const before = idSet(boxesBefore);

  const outgoing = Mail.OutgoingMessage({ subject: subject, content: body, visible: false });
  Mail.outgoingMessages.push(outgoing);
  outgoing.toRecipients.push(Mail.ToRecipient({ address: to }));
  if (opts.cc) outgoing.ccRecipients.push(Mail.CcRecipient({ address: opts.cc }));
  if (fromAddr) outgoing.sender = fromAddr;
  outgoing.save();
  delay(0.6); // let Mail materialize the draft into the Drafts mailbox

  // diff: find the newly-appeared draft id
  const boxesAfter = draftBoxes(acct);
  let foundId = null, foundBox = null;
  for (const b of boxesAfter) {
    for (const m of b.messages()) {
      const mid = String(m.id());
      if (!before[mid]) { foundId = mid; foundBox = b.name(); break; }
    }
    if (foundId) break;
  }
  if (!foundId) {
    // Silent save couldn't be verified for this account — fall back to a visible
    // compose window so the user still gets their draft to save/send manually.
    var vis = Mail.OutgoingMessage({ subject: subject, content: body, visible: true });
    Mail.outgoingMessages.push(vis);
    vis.toRecipients.push(Mail.ToRecipient({ address: to }));
    if (opts.cc) vis.ccRecipients.push(Mail.CcRecipient({ address: opts.cc }));
    if (fromAddr) vis.sender = fromAddr;
    return JSON.stringify({
      draft_id: null, account: account, mailbox: null, subject: subject, fallbackVisible: true,
    });
  }
  return JSON.stringify({
    draft_id: account + "::" + foundBox + "::" + foundId,
    account: account, mailbox: foundBox, subject: subject, fallbackVisible: false,
  });
}
