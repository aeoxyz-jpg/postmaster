#!/usr/bin/env osascript -l JavaScript
// Output JSON: [{name, uuid, type, serverName, emailAddresses}]
function run() {
  const Mail = Application("Mail");
  const out = [];
  for (const a of Mail.accounts()) {
    try {
      let serverName = "";
      try { serverName = a.serverName() || ""; } catch (e) {}
      let emails = [];
      try { emails = a.emailAddresses() || []; } catch (e) {}
      let type = "";
      try { type = String(a.accountType()); } catch (e) {}
      out.push({ name: a.name(), uuid: a.id(), type, serverName, emailAddresses: emails });
    } catch (e) {
      // skip an account whose name/id can't be read
    }
  }
  return JSON.stringify(out);
}
