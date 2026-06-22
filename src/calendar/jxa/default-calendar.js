#!/usr/bin/env osascript -l JavaScript
// Output JSON: {name: string|null}. Returns the title of Calendar's "default calendar for
// new events" via EventKit. Any failure (no EventKit access) -> {name:null} so callers fall back.
function run() {
  try {
    ObjC.import("EventKit");
    var store = $.EKEventStore.alloc.init;
    var cal = store.defaultCalendarForNewEvents;
    if (!cal || cal.isNil()) return JSON.stringify({ name: null });
    return JSON.stringify({ name: ObjC.unwrap(cal.title) });
  } catch (e) {
    return JSON.stringify({ name: null });
  }
}
