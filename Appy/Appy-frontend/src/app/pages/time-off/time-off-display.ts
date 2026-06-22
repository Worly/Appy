import { Dayjs } from "dayjs";
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

/** Humanized recurrence schedule, e.g. "02.01.2026 – 05.01.2026", "02.01.2026" (single day), "Every Monday", "Every 9th of month". */
export function timeOffScheduleText(t: TimeOff, translate: (key: string) => string, languageCode: string = "en"): string {
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
      // e.g. "Every 9th of month" / "Svaki 9. u mjesecu" — the day is formatted as a locale-aware ordinal.
      return t.dayOfMonth != null
        ? translate("pages.time-off.EVERY_DAY_OF_MONTH").replace("{day}", ordinalDay(t.dayOfMonth, languageCode))
        : "";
    default:
      return "";
  }
}

/** A day-of-month as a locale-aware ordinal: "9th" / "21st" (English) or "9." (Croatian and other locales). */
function ordinalDay(day: number, languageCode: string): string {
  if (languageCode !== "en") return `${day}.`;
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
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

/**
 * Whether a recurring rule can be "stopped" (clamped to yesterday, keeping past occurrences) rather
 * than hard-deleted. Only meaningful for a recurring rule that has already started and is still
 * active — for one-offs, future/today-starting, or already-expired rules, stopping at yesterday
 * yields zero occurrences (i.e. equivalent to a delete), so the editor just deletes those outright.
 */
export function canStopRecurring(t: TimeOff, today: Dayjs): boolean {
  if (t.recurrence === TimeOffRecurrence.OneOff) return false;
  if (t.startDate == null) return false;
  if (!t.startDate.isBefore(today, "date")) return false;        // must have already started
  if (t.endDate != null && t.endDate.isBefore(today, "date")) return false; // must still be active
  return true;
}
