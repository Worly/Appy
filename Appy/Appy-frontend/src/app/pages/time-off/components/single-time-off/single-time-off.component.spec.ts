import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { of } from "rxjs";
import { HolidayDTO } from "src/app/models/holiday";
import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
import { SingleTimeOffComponent } from "./single-time-off.component";

dayjs.extend(customParseFormat);

function make(opts: { timeOffService?: any; holidayService?: any; notifyDialogService?: any } = {}) {
  // (timeOffService, translateService, router, holidayService, notifyDialogService)
  return new SingleTimeOffComponent(
    opts.timeOffService ?? null as any,
    { translate: (k: string) => k, getSelectedLanguageCode: () => "en" } as any,
    null as any,
    opts.holidayService ?? {},
    opts.notifyDialogService ?? { yesNoDialog: () => of(true) },
  );
}

// A TimeOff carrying its embedded holiday, exactly as GET /timeoff/get/{id} returns for an imported holiday.
function holidayTimeOff(holiday: Partial<HolidayDTO> = {}): TimeOff {
  const h: HolidayDTO = {
    id: 1, name: "Easter Monday", countryCode: "HR", date: "2026-04-13", originalDate: "2026-04-06",
    isAllDay: true, isEdited: false, linkedTimeOffId: 5, ...holiday,
  };
  return new TimeOff({
    id: h.linkedTimeOffId ?? 0, label: h.name, recurrence: TimeOffRecurrence.OneOff,
    startDate: h.date, endDate: h.date, isAllDay: h.isAllDay, timeFrom: h.timeFrom, timeTo: h.timeTo,
    holiday: h,
  });
}

describe("SingleTimeOffComponent — holiday mode", () => {
  it("applies the embedded holiday and computes the Changes rows for an edited one", () => {
    const t = holidayTimeOff({ date: "2026-04-13", originalDate: "2026-04-06", isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00", isEdited: true });
    const c = make({ timeOffService: { get: () => of(t) } });
    c.id = 5;

    expect(c.isHoliday).toBe(true);
    expect(c.isHolidayEdited).toBe(true);
    expect(c.changedDate).toBe(true);   // 13 Apr vs 06 Apr
    expect(c.changedTime).toBe(true);   // timed vs all-day
  });

  it("reverts and emits onChanged, keyed on the ImportedHoliday id", (done) => {
    const revert = jasmine.createSpy("revert").and.returnValue(of(undefined));
    const t = holidayTimeOff({ id: 9, isEdited: true, isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00" });
    const c = make({ timeOffService: { get: () => of(t) }, holidayService: { revert } });
    c.id = 5;
    c.onChanged.subscribe(() => { expect(revert).toHaveBeenCalledWith(9); done(); });

    c.openRevertDialog();
  });

  it("treats a plain time-off (no embedded holiday) as not a holiday", () => {
    const t = new TimeOff({ id: 3, label: "Vacation", recurrence: TimeOffRecurrence.OneOff, startDate: "2026-04-13", endDate: "2026-04-15", isAllDay: true });
    const c = make({ timeOffService: { get: () => of(t) } });
    c.id = 3;

    expect(c.isHoliday).toBe(false);
    expect(c.schedule).not.toBe("");
  });
});
