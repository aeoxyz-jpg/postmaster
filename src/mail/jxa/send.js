#!/usr/bin/env osascript -l JavaScript
// Usage argv: <account> <to> <subject> <body> [--cc <addr>]
// Constructs an OutgoingMessage from the given account and sends it.
// Output JSON: {sent:true, to, account} ; throws if send() returns false.
function parseArgs(argv) {
  var opts = { cc: null };
  var pos = [];
  for (var i = 0; i < argv.length; i++) {
    if (argv[i] === "--cc") opts.cc = argv[++i];
    else pos.push(argv[i]);
  }
  return { opts: opts, pos: pos };
}
function run(argv) {
  var p = parseArgs(argv);
  var account = p.pos[0], to = p.pos[1], subject = p.pos[2], body = p.pos[3];
  var Mail = Application("Mail");
  var acct = Mail.accounts.byName(account);
  var fromAddr = acct.emailAddresses()[0];
  var outgoing = Mail.OutgoingMessage({ subject: subject, content: body, visible: false });
  Mail.outgoingMessages.push(outgoing);
  outgoing.toRecipients.push(Mail.ToRecipient({ address: to }));
  if (p.opts.cc) outgoing.ccRecipients.push(Mail.CcRecipient({ address: p.opts.cc }));
  if (fromAddr) outgoing.sender = fromAddr;
  var ok = outgoing.send();
  if (!ok) throw new Error("send failed (SMTP error or offline)");
  return JSON.stringify({ sent: true, to: to, account: account });
}
