#!/usr/bin/env osascript -l JavaScript
// Usage argv: <id="account::mailbox::rowid">
// Output JSON: {id, headers:{from,to,cc,subject,date,message_id}, body_plain, attachments:[{name,size}]}
function run(argv) {
  const id = argv[0];
  const parts = id.split("::");
  if (parts.length < 3) throw new Error("invalid id, expected account::mailbox::rowid");
  const account = parts[0];
  const key = parts.slice(2).join("::");
  const Mail = Application("Mail");
  const acct = Mail.accounts.byName(account);

  let msg;
  if (/^\d+$/.test(key)) {
    // ROWID == JXA message.id(); id space is per-account, any mailbox works.
    // byId returns a phantom specifier; property access below throws (-> OsaError) if the id isn't found.
    msg = acct.mailboxes[0].messages.byId(parseInt(key, 10));
  } else {
    throw new Error("non-numeric message key not supported in V1");
  }

  const atts = [];
  for (const att of msg.mailAttachments()) atts.push({ name: att.name(), size: att.fileSize() });

  return JSON.stringify({
    id,
    headers: {
      from: msg.sender(),
      to: msg.toRecipients().map((r) => r.address()),
      cc: msg.ccRecipients().map((r) => r.address()),
      subject: msg.subject(),
      date: msg.dateSent().toISOString(),
      message_id: msg.messageId(),
    },
    body_plain: msg.content() || "",
    attachments: atts,
  });
}
