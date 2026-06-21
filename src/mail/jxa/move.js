#!/usr/bin/env osascript -l JavaScript
// Usage argv: <id> <targetMailboxName>
// Moves the message to the named mailbox within the SAME account. Output JSON: {id, movedTo}
function resolveMessage(Mail, id) {
  const parts = id.split("::");
  if (parts.length < 3) throw new Error("invalid id, expected account::mailbox::rowid");
  const account = parts[0];
  const mailbox = parts[1];
  const key = parts.slice(2).join("::");
  if (!/^\d+$/.test(key)) throw new Error("non-numeric message key not supported in V1");
  const acct = Mail.accounts.byName(account);
  const rid = parseInt(key, 10);
  // byId is mailbox-scoped for some message types (e.g. drafts), so mailboxes[0] alone is
  // unreliable. Try the mailbox named in the id first (may be duplicated), then any mailbox.
  const boxes = acct.mailboxes();
  const ordered = boxes.filter(function (b) { return b.name() === mailbox; })
    .concat(boxes.filter(function (b) { return b.name() !== mailbox; }));
  for (var i = 0; i < ordered.length; i++) {
    try { var m = ordered[i].messages.byId(rid); m.id(); return { acct: acct, msg: m }; } catch (e) {}
  }
  throw new Error("message not found by id: " + key);
}
function run(argv) {
  const [id, target] = argv;
  const Mail = Application("Mail");
  const { acct, msg } = resolveMessage(Mail, id);
  // pick the first mailbox in this account whose name matches exactly
  const boxes = acct.mailboxes().filter((m) => m.name() === target);
  if (boxes.length === 0) throw new Error("target mailbox not found in account: " + target);
  Mail.move(msg, { to: boxes[0] });
  return JSON.stringify({ id, movedTo: target });
}
