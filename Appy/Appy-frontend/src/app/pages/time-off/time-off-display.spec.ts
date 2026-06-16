import dayjs from "dayjs";
import { DayOfWeek } from "src/app/models/working-hours";
import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
import { timeOffScheduleText, timeOffTimeText } from "./time-off-display";

const tr = (k: string) => k; // identity translate: assert on the keys themselves

describe("time-off-display", () => {
  it("formats a one-off date range", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.OneOff;
    t.startDate = dayjs("2026-01-02");
    t.endDate = dayjs("2026-01-05");
    expect(timeOffScheduleText(t, tr)).toBe("02.01.2026 – 05.01.2026");
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
