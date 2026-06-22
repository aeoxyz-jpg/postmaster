#!/usr/bin/env osascript -l JavaScript
// Usage argv: <uid> <fieldsJSON>
// fieldsJSON: {title?, start?, end?, location?, notes?, alerts?:[min]}
// Field changes apply in place. If `alerts` is given, the event is recreated with that exact
// alarm set (Calendar can't delete individual alarms) and a NEW uid is returned.
// Output JSON: {uid, recreated, calendar}
function findByUid(Cal, uid) {
  // First match across calendars wins; V1 events have calendar-unique uids and no recurring series.
  var cals = Cal.calendars();
  for (var i = 0; i < cals.length; i++) {
    var m = cals[i].events.whose({ uid: uid })();
    if (m.length > 0) return { cal: cals[i], ev: m[0] };
  }
  return null;
}
function toDate(iso) {
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] != null ? +m[4] : 0, m[5] != null ? +m[5] : 0, 0);
}
function run(argv) {
  var uid = argv[0];
  var f = JSON.parse(argv[1]);
  var Cal = Application("Calendar");
  var found = findByUid(Cal, uid);
  if (!found) throw new Error("event not found by uid: " + uid);
  var ev = found.ev, cal = found.cal;

  if (f.title != null) ev.summary = f.title;
  if (f.location != null) ev.location = f.location;
  if (f.notes != null) ev.description = f.notes;
  if (f.start != null || f.end != null) {
    ev.startDate = new Date(1970, 0, 1, 0, 0, 0); // anchor so neither set violates start<end
    if (f.end != null) { var ed = toDate(f.end); if (ed) ev.endDate = ed; }
    if (f.start != null) { var sd = toDate(f.start); if (sd) ev.startDate = sd; }
  }

  var recreated = false, newUid = uid;
  if (f.alerts != null) {
    // recreate with the exact alarm set (individual alarm deletion is unsupported)
    var nev = Cal.Event({
      summary: ev.summary(), startDate: ev.startDate(), endDate: ev.endDate(),
      alldayEvent: ev.alldayEvent(), location: ev.location() || "", description: ev.description() || "",
    });
    cal.events.push(nev);
    for (var a = 0; a < f.alerts.length; a++) {
      nev.displayAlarms.push(Cal.DisplayAlarm({ triggerInterval: -Math.abs(f.alerts[a]) }));
    }
    newUid = nev.uid();
    try { Cal.delete(ev); } catch (e) {} // delete old AFTER new exists (avoid loss on failure)
    recreated = true;
  }
  return JSON.stringify({ uid: newUid, recreated: recreated, calendar: cal.name() });
}
