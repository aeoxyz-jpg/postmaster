#!/usr/bin/env osascript -l JavaScript
// Usage argv: <calendarName> <eventsJSON>
// eventsJSON: [{title, start, end, allDay, alerts:[min], location?, notes?}]
//   start/end are ISO local strings: "YYYY-MM-DD" (all-day) or "YYYY-MM-DDTHH:MM" (timed).
// Output JSON: {calendar, created:[{title, uid}], skipped:[{title, reason}]}
function toDate(iso) {
  // Build a Date in LOCAL time from an ISO-local string (no tz conversion).
  var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  var y = +m[1], mo = +m[2] - 1, d = +m[3], h = m[4] != null ? +m[4] : 0, mi = m[5] != null ? +m[5] : 0;
  return new Date(y, mo, d, h, mi, 0);
}
function run(argv) {
  var calName = argv[0];
  var events = JSON.parse(argv[1]);
  var Cal = Application("Calendar");
  var cals = Cal.calendars.whose({ name: calName })();
  if (cals.length === 0) throw new Error("calendar not found: " + calName);
  var cal = cals[0];

  var created = [], skipped = [];
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    if (!e.start || !e.end) { skipped.push({ title: e.title, reason: "no resolved date" }); continue; }
    var sd = toDate(e.start), ed = toDate(e.end);
    if (!sd || !ed) { skipped.push({ title: e.title, reason: "unparseable date" }); continue; }
    var ev = Cal.Event({
      summary: e.title,
      startDate: sd,
      endDate: ed,
      alldayEvent: !!e.allDay,
      description: e.notes || "",
      location: e.location || "",
    });
    cal.events.push(ev);
    var alerts = e.alerts || [];
    for (var a = 0; a < alerts.length; a++) {
      ev.displayAlarms.push(Cal.DisplayAlarm({ triggerInterval: -Math.abs(alerts[a]) }));
    }
    created.push({ title: e.title, uid: ev.uid() });
  }
  return JSON.stringify({ calendar: calName, created: created, skipped: skipped });
}
