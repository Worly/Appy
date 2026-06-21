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

/** Humanized recurrence schedule, e.g. "02.01.2026 – 05.01.2026", "02.01.2026" (single day), "Every Monday", "Day of month 15". */
export function timeOffScheduleText(t: TimeOff, translate: (key: string) => string): string {
  switch (t.recurrence) {
    case TimeOffRecurrence.OneOff: {
      const start = t.startDate?.format("DD.MM.YYYY") ?? "";
      const end = t.endDate?.format("DD.MM.YYYY") ?? "";
      // Collapse a single-day one-off (identical start/end) to one date instead of "from – to".
      return start === end ? start : `${start} – ${end}`;
    }
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

/**
 * Effective date span for a recurring rule, e.g. "22.06.2026 – 31.12.2026" (bounded) or
 * "From 22.06.2026" (open-ended). Empty for one-offs, whose schedule text already is their date range.
 */
export function timeOffRecurringRangeText(t: TimeOff, translate: (key: string) => string): string {
  if (t.recurrence === TimeOffRecurrence.OneOff || t.startDate == null) return "";
  const start = t.startDate.format("DD.MM.YYYY");
  return t.endDate != null
    ? `${start} – ${t.endDate.format("DD.MM.YYYY")}`
    : `${translate("pages.time-off.FROM_DATE")} ${start}`;
}

/** "All day" or a "HH:mm – HH:mm" range. */
export function timeOffTimeText(t: TimeOff, translate: (key: string) => string): string {
  return t.isAllDay
    ? translate("pages.time-off.ALL_DAY")
    : `${t.timeFrom?.format("HH:mm") ?? ""} – ${t.timeTo?.format("HH:mm") ?? ""}`;
}
