import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { DayOfWeek } from "src/app/models/working-hours";
import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
import { canStopRecurring, timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "./time-off-display";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

const tr = (k: string) => k; // identity translate: assert on the keys themselves

describe("time-off-display", () => {
  it("formats a one-off date range", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.OneOff;
    t.startDate = dayjs("2026-01-02");
    t.endDate = dayjs("2026-01-05");
    expect(timeOffScheduleText(t, tr)).toBe("02.01.2026 – 05.01.2026");
  });

  it("shows a single date when a one-off starts and ends on the same day", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.OneOff;
    t.startDate = dayjs("2026-01-02");
    t.endDate = dayjs("2026-01-02");
    expect(timeOffScheduleText(t, tr)).toBe("02.01.2026");
  });

  it("formats a weekly schedule", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Weekly;
    t.dayOfWeek = DayOfWeek.Monday;
    expect(timeOffScheduleText(t, tr)).toBe("pages.time-off.EVERY MONDAY");
  });

  // Stubs the EVERY_DAY_OF_MONTH template the way each locale's translation file fills it.
  const monthlyTr = (template: string) => (k: string) =>
    k === "pages.time-off.EVERY_DAY_OF_MONTH" ? template : k;

  it("formats a monthly schedule with an English ordinal", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Monthly;
    t.dayOfMonth = 9;
    expect(timeOffScheduleText(t, monthlyTr("Every {day} of month"), "en")).toBe("Every 9th of month");
  });

  it("uses correct English ordinal suffixes (st/nd/rd/th, incl. the 11–13 exception)", () => {
    const tmpl = monthlyTr("Every {day} of month");
    const text = (day: number) => {
      const t = new TimeOff();
      t.recurrence = TimeOffRecurrence.Monthly;
      t.dayOfMonth = day;
      return timeOffScheduleText(t, tmpl, "en");
    };
    expect(text(1)).toBe("Every 1st of month");
    expect(text(2)).toBe("Every 2nd of month");
    expect(text(3)).toBe("Every 3rd of month");
    expect(text(11)).toBe("Every 11th of month");
    expect(text(13)).toBe("Every 13th of month");
    expect(text(21)).toBe("Every 21st of month");
    expect(text(31)).toBe("Every 31st of month");
  });

  it("formats a monthly schedule with a Croatian ordinal", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Monthly;
    t.dayOfMonth = 21;
    expect(timeOffScheduleText(t, monthlyTr("Svaki {day} u mjesecu"), "hr")).toBe("Svaki 21. u mjesecu");
  });

  it("shows a bounded recurring rule's effective range as from – to", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Weekly;
    t.dayOfWeek = DayOfWeek.Monday;
    t.startDate = dayjs("2026-06-22");
    t.endDate = dayjs("2026-12-31");
    expect(timeOffRecurringRangeText(t, tr)).toBe("22.06.2026 – 31.12.2026");
  });

  it("shows an open-ended recurring rule's effective range as From <date>", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Weekly;
    t.dayOfWeek = DayOfWeek.Monday;
    t.startDate = dayjs("2026-06-22");
    expect(timeOffRecurringRangeText(t, tr)).toBe("pages.time-off.FROM_DATE 22.06.2026");
  });

  it("has no effective range for one-offs (their schedule already is the date range)", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.OneOff;
    t.startDate = dayjs("2026-01-02");
    t.endDate = dayjs("2026-01-05");
    expect(timeOffRecurringRangeText(t, tr)).toBe("");
  });

  it("returns ALL_DAY for all-day rules", () => {
    const t = new TimeOff();
    t.isAllDay = true;
    expect(timeOffTimeText(t, tr)).toBe("pages.time-off.ALL_DAY");
  });

  it("returns a time range for partial rules", () => {
    const t = new TimeOff();
    t.isAllDay = false;
    t.timeFrom = dayjs().hour(9).minute(0);
    t.timeTo = dayjs().hour(17).minute(30);
    expect(timeOffTimeText(t, tr)).toBe("09:00 – 17:30");
  });
});

describe("canStopRecurring", () => {
  const today = dayjs("2026-06-22");

  function recurring(start?: string, end?: string): TimeOff {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Weekly;
    t.dayOfWeek = DayOfWeek.Monday;
    t.startDate = start ? dayjs(start) : undefined;
    t.endDate = end ? dayjs(end) : undefined;
    return t;
  }

  it("is true for a started, open-ended recurring rule", () => {
    expect(canStopRecurring(recurring("2026-06-01"), today)).toBe(true);
  });

  it("is true for a started recurring rule still active (end today or later)", () => {
    expect(canStopRecurring(recurring("2026-06-01", "2026-06-22"), today)).toBe(true);
    expect(canStopRecurring(recurring("2026-06-01", "2026-12-31"), today)).toBe(true);
  });

  it("is false for a one-off", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.OneOff;
    t.startDate = dayjs("2026-06-01");
    t.endDate = dayjs("2026-06-30");
    expect(canStopRecurring(t, today)).toBe(false);
  });

  it("is false when the rule starts today or in the future (nothing to keep)", () => {
    expect(canStopRecurring(recurring("2026-06-22"), today)).toBe(false); // starts today
    expect(canStopRecurring(recurring("2026-07-01"), today)).toBe(false); // future
  });

  it("is false when the rule already expired (ended before today)", () => {
    expect(canStopRecurring(recurring("2026-05-01", "2026-06-21"), today)).toBe(false);
  });

  it("is false when a recurring rule has no start date", () => {
    expect(canStopRecurring(recurring(undefined), today)).toBe(false);
  });
});
