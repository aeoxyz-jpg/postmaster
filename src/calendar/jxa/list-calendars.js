#!/usr/bin/env osascript -l JavaScript
// Output JSON: [{name, writable}]
function run() {
  const Cal = Application("Calendar");
  const out = [];
  for (const c of Cal.calendars()) {
    let writable = true;
    try { writable = c.writable(); } catch (e) {}
    out.push({ name: c.name(), writable: writable });
  }
  return JSON.stringify(out);
}
