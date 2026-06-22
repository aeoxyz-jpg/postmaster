#!/usr/bin/env osascript -l JavaScript
// Usage argv: <startISO|""> <endISO|""> <query|""> <limit> <calendarsJSON|""> <includeReadOnly:"0"|"1">
// Lists existing events (with their uid) across calendars, filtered by start-date range
// and an optional case-insensitive substring on title/location. Output JSON:
// [{uid, title, calendar, start, end, allDay, location, writable}]
// By default only WRITABLE calendars are scanned: their events are the ones that can be
// fed into update/delete, and skipping huge read-only subscriptions (Holidays/Birthdays)
// keeps this fast. AppleScript .whose() carries ~1.5s/calendar of fixed cost, so narrowing
// by `calendars` is the fast path.
function run(argv) {
  var startISO = argv[0] || "";
  var endISO = argv[1] || "";
  var query = (argv[2] || "").toLowerCase();
  var limit = parseInt(argv[3] || "50", 10);
  var calsJson = argv[4] || "";
  var includeReadOnly = (argv[5] || "0") === "1";
  var start = startISO ? new Date(startISO) : null;
  var end = endISO ? new Date(endISO) : null;
  var wantCals = null;
  if (calsJson) { try { wantCals = JSON.parse(calsJson); } catch (e) { wantCals = null; } }

  var Cal = Application("Calendar");
  var cals = Cal.calendars();
  var out = [];
  for (var i = 0; i < cals.length; i++) {
    var c = cals[i];
    var name = c.name();
    if (wantCals && wantCals.indexOf(name) === -1) continue;
    var writable = true; try { writable = c.writable(); } catch (e) {}
    if (!includeReadOnly && !writable) continue;
    // .whose() pushes the date filter into Calendar so we don't load every event ever.
    var evs;
    if (start && end) {
      evs = c.events.whose({ _and: [{ startDate: { _greaterThanEquals: start } }, { startDate: { _lessThanEquals: end } }] })();
    } else if (start) {
      evs = c.events.whose({ startDate: { _greaterThanEquals: start } })();
    } else if (end) {
      evs = c.events.whose({ startDate: { _lessThanEquals: end } })();
    } else {
      evs = c.events();
    }
    for (var j = 0; j < evs.length; j++) {
      var e = evs[j];
      var title = ""; try { title = e.summary(); } catch (x) {}
      var loc = ""; try { loc = e.location() || ""; } catch (x) {}
      if (query) {
        if ((title + " " + loc).toLowerCase().indexOf(query) === -1) continue;
      }
      var uid = "", s = null, en = null, ad = false;
      try { uid = e.uid(); } catch (x) {}
      try { s = e.startDate(); } catch (x) {}
      try { en = e.endDate(); } catch (x) {}
      try { ad = e.alldayEvent(); } catch (x) {}
      out.push({
        uid: uid, title: title, calendar: name,
        start: s ? s.toISOString() : null, end: en ? en.toISOString() : null,
        allDay: ad, location: loc, writable: writable,
      });
    }
  }
  out.sort(function (a, b) { return (a.start || "").localeCompare(b.start || ""); });
  if (out.length > limit) out = out.slice(0, limit);
  return JSON.stringify(out);
}
