import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
import { DayOfWeek } from "src/app/models/working-hours";

const DAY_OF_WEEK_KEYS: Record<DayOfWeek, string> = {
  [DayOfWeek.Sunday]: "SUNDAY",
  [DayOfWeek.Monday]: "MONDAY",
  [DayOfWeek.Tuesday]: "TUESDAY",
  [DayOfWeek.Wednesday]: "WEDNESDAY",
  [DayOfWeek.Thursday]: "THURSDAY",
  [DayOfWeek.Friday]: "FRIDAY",
  [DayOfWeek.Saturday]: "SATURDAY",
};

/** Humanized recurrence schedule, e.g. "02.01.2026 – 05.01.2026", "Every Monday", "Day of month 15". */
export function timeOffScheduleText(t: TimeOff, translate: (key: string) => string): string {
  switch (t.recurrence) {
    case TimeOffRecurrence.OneOff:
      return `${t.startDate?.format("DD.MM.YYYY") ?? ""} – ${t.endDate?.format("DD.MM.YYYY") ?? ""}`;
    case TimeOffRecurrence.Weekly:
      return t.dayOfWeek != null
        ? `${translate("pages.time-off.EVERY")} ${translate(DAY_OF_WEEK_KEYS[t.dayOfWeek])}`
        : "";
    case TimeOffRecurrence.Monthly:
      return `${translate("pages.time-off.DAY_OF_MONTH")} ${t.dayOfMonth}`;
    default:
      return "";
  }
}

/** "All day" or a "HH:mm – HH:mm" range. */
export function timeOffTimeText(t: TimeOff, translate: (key: string) => string): string {
  return t.isAllDay
    ? translate("pages.time-off.ALL_DAY")
    : `${t.timeFrom?.format("HH:mm") ?? ""} – ${t.timeTo?.format("HH:mm") ?? ""}`;
}
