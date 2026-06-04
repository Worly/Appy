import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import dayjs from "dayjs";
import { AppointmentView } from "../models/appointment";
import { TimeOffOccurrence } from "../models/time-off-occurrence";

export type TimelineEntry =
  | { kind: "appointment"; start: Dayjs; duration: Duration; appointment: AppointmentView }
  | { kind: "timeoff"; start: Dayjs; duration: Duration; occurrence: TimeOffOccurrence };

// Merge one day's appointments with its PARTIAL (non-all-day) time-offs into a single
// list sorted by start time, then by duration. All-day occurrences are excluded — they are
// rendered on the date divider, not inline. The result feeds the same gap/overlap logic
// the list already runs between consecutive appointments.
export function buildDayTimeline(appointments: AppointmentView[], occurrences: TimeOffOccurrence[]): TimelineEntry[] {
  let entries: TimelineEntry[] = [];

  for (let a of appointments)
    entries.push({ kind: "appointment", start: a.time as Dayjs, duration: a.duration as Duration, appointment: a });

  for (let o of occurrences) {
    if (o.isAllDay || o.timeFrom == null || o.timeTo == null)
      continue;
    entries.push({
      kind: "timeoff",
      start: o.timeFrom,
      duration: dayjs.duration(o.timeTo.valueOf() - o.timeFrom.valueOf()),
      occurrence: o,
    });
  }

  entries.sort((x, y) => {
    let d = x.start.unix() - y.start.unix();
    if (d != 0) return d;
    return x.duration.asMilliseconds() - y.duration.asMilliseconds();
  });

  return entries;
}
