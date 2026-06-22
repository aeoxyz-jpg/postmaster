#!/usr/bin/env osascript -l JavaScript
// Usage argv: <uid> <"describe"|"delete">
// describe -> {found, uid, title?, calendar?}  (for the two-step confirmation summary)
// delete   -> {uid, deleted:true}
function findByUid(Cal, uid) {
  // First match across calendars wins; V1 events have calendar-unique uids and no recurring series.
  var cals = Cal.calendars();
  for (var i = 0; i < cals.length; i++) {
    var m = cals[i].events.whose({ uid: uid })();
    if (m.length > 0) return { cal: cals[i], ev: m[0] };
  }
  return null;
}
function run(argv) {
  var uid = argv[0], mode = argv[1] || "delete";
  var Cal = Application("Calendar");
  var found = findByUid(Cal, uid);
  if (!found) {
    if (mode === "describe") return JSON.stringify({ found: false, uid: uid });
    throw new Error("event not found by uid: " + uid);
  }
  if (mode === "describe") {
    return JSON.stringify({ found: true, uid: uid, title: found.ev.summary(), calendar: found.cal.name() });
  }
  Cal.delete(found.ev);
  return JSON.stringify({ uid: uid, deleted: true });
}
