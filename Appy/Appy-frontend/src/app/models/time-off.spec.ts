import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { DayOfWeek } from "./working-hours";
import { TimeOff, TimeOffRecurrence } from "./time-off";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

function baseOneOff(): TimeOff {
  let t = new TimeOff();
  t.label = "Vacation";
  t.recurrence = TimeOffRecurrence.OneOff;
  t.startDate = dayjs("2030-06-01", "YYYY-MM-DD");
  t.endDate = dayjs("2030-06-05", "YYYY-MM-DD");
  t.isAllDay = true;
  return t;
}

describe("TimeOff", () => {
  it("is valid for a well-formed all-day one-off", () => {
    expect(baseOneOff().validate()).toBe(true);
  });

  it("is invalid without a label", () => {
    let t = baseOneOff();
    t.label = "";
    expect(t.validate()).toBe(false);
  });

  it("is invalid when a one-off is missing its end date", () => {
    let t = baseOneOff();
    t.endDate = undefined;
    expect(t.validate()).toBe(false);
  });

  it("is invalid when one-off dates are out of order", () => {
    let t = baseOneOff();
    t.startDate = dayjs("2030-06-10", "YYYY-MM-DD");
    expect(t.validate()).toBe(false);
  });

  it("requires times when not all-day, in order", () => {
    let t = baseOneOff();
    t.isAllDay = false;
    expect(t.validate()).toBe(false);            // times missing
    t.timeFrom = dayjs("13:00:00", "HH:mm:ss");
    t.timeTo = dayjs("12:00:00", "HH:mm:ss");
    expect(t.validate()).toBe(false);            // out of order
    t.timeTo = dayjs("14:00:00", "HH:mm:ss");
    expect(t.validate()).toBe(true);
  });

  it("requires dayOfWeek for weekly", () => {
    let t = baseOneOff();
    t.recurrence = TimeOffRecurrence.Weekly;
    expect(t.validate()).toBe(false);
    t.dayOfWeek = DayOfWeek.Monday;
    expect(t.validate()).toBe(true);
  });

  it("requires dayOfMonth 1..31 for monthly", () => {
    let t = baseOneOff();
    t.recurrence = TimeOffRecurrence.Monthly;
    t.dayOfMonth = 40;
    expect(t.validate()).toBe(false);
    t.dayOfMonth = 15;
    expect(t.validate()).toBe(true);
  });

  it("drops irrelevant fields in getDTO", () => {
    let t = baseOneOff();
    t.recurrence = TimeOffRecurrence.Weekly;
    t.dayOfWeek = DayOfWeek.Monday;
    t.dayOfMonth = 15;
    let dto = t.getDTO();
    expect(dto.dayOfMonth).toBeUndefined();
    expect(dto.dayOfWeek).toBe(DayOfWeek.Monday);
  });
});
