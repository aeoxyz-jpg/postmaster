#!/usr/bin/env osascript -l JavaScript
// Usage argv: <id>. Moves the message to the account's trash (Mail.delete).
// Output JSON: {id, deleted:true}
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
  const [id] = argv;
  const Mail = Application("Mail");
  const { msg } = resolveMessage(Mail, id);
  Mail.delete(msg);
  return JSON.stringify({ id, deleted: true });
}
