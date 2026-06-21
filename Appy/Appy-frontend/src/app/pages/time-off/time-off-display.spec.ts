import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { DayOfWeek } from "src/app/models/working-hours";
import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
import { timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "./time-off-display";

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

  it("formats a monthly schedule", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Monthly;
    t.dayOfMonth = 15;
    expect(timeOffScheduleText(t, tr)).toBe("pages.time-off.DAY_OF_MONTH 15");
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
