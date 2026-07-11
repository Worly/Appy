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

/** A calendar date with its localized weekday after it, e.g. "21.06.2026, Monday". */
export function timeOffDateText(d: Dayjs): string {
  return d.format("DD.MM.YYYY, dddd");
}

/** Humanized recurrence schedule, e.g. "02.01.2026, Friday – 05.01.2026, Monday", "02.01.2026, Friday" (single day), "Every Monday", "Every 9th of month". */
export function timeOffScheduleText(t: TimeOff, translate: (key: string) => string, languageCode: string = "en"): string {
  switch (t.recurrence) {
    case TimeOffRecurrence.OneOff: {
      const start = t.startDate != null ? timeOffDateText(t.startDate) : "";
      const end = t.endDate != null ? timeOffDateText(t.endDate) : "";
      // A single-day one-off (identical start/end) renders as one date; a span renders as "from – to".
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
 * Effective date span for a recurring rule, e.g. "22.06.2026, Monday – 31.12.2026, Thursday" (bounded)
 * or "From 22.06.2026, Monday" (open-ended). Empty for one-offs, whose schedule text already is their date range.
 */
export function timeOffRecurringRangeText(t: TimeOff, translate: (key: string) => string): string {
  if (t.recurrence === TimeOffRecurrence.OneOff || t.startDate == null) return "";
  const start = timeOffDateText(t.startDate);
  return t.endDate != null
    ? `${start} – ${timeOffDateText(t.endDate)}`
    : `${translate("pages.time-off.FROM_DATE")} ${start}`;
}

/**
 * Inclusive count of selected days for a one-off rule, humanized and pluralized — e.g. "1 day" /
 * "4 days" (en) or "1 dan" / "4 dana" (hr). Empty for recurring rules, when either bound is missing,
 * or for an inverted range (To before From, possible mid-edit).
 */
export function timeOffDayCountText(t: TimeOff, translate: (key: string) => string, languageCode: string = "en"): string {
  if (t.recurrence !== TimeOffRecurrence.OneOff || t.startDate == null || t.endDate == null) return "";
  const count = t.endDate.diff(t.startDate, "day") + 1; // inclusive: same start/end is one day
  if (count < 1) return "";
  const key = isPluralOne(count, languageCode) ? "pages.time-off.DAYS_COUNT_ONE" : "pages.time-off.DAYS_COUNT_OTHER";
  return translate(key).replace("{count}", count.toString());
}

/**
 * Whether `count` takes the locale's "one" plural form. English uses it only for exactly 1; Croatian
 * uses it for counts ending in 1 except the 11 exception (1 dan, 21 dan — but 11 dana). For "dan" the
 * few/many forms coincide ("dana"), so a single "other" form covers everything else.
 */
function isPluralOne(count: number, languageCode: string): boolean {
  if (languageCode === "en") return count === 1;
  return count % 10 === 1 && count % 100 !== 11;
}

/**
 * A holiday projected onto the one-off, single-day TimeOff shape the display helpers expect. Accepts
 * the full Holiday or the lean HolidayListItem — only its date/time fields matter here. Built via the
 * DTO constructor so the model's validating setters fire once, after initProperties.
 */
export function holidayAsTimeOff(h: { date?: Dayjs; isAllDay: boolean; timeFrom?: Dayjs; timeTo?: Dayjs }): TimeOff {
  return new TimeOff({
    id: 0,
    recurrence: TimeOffRecurrence.OneOff,
    startDate: h.date?.format("YYYY-MM-DD"),
    endDate: h.date?.format("YYYY-MM-DD"),
    isAllDay: h.isAllDay,
    timeFrom: h.timeFrom?.format("HH:mm:ss"),
    timeTo: h.timeTo?.format("HH:mm:ss"),
  });
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
