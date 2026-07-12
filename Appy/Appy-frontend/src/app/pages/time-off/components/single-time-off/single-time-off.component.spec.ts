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

// A holiday-linked TimeOff: the TimeOff carries the current (possibly edited) values, the embedded
// holiday is the immutable original snapshot.
function holidayTimeOff(current: Partial<{ startDate: string; isAllDay: boolean; timeFrom: string; timeTo: string }>, original: Partial<HolidayDTO> = {}): TimeOff {
  const holiday: HolidayDTO = { id: 1, name: "Easter Monday", countryCode: "HR", date: "2026-04-06", ...original };
  return new TimeOff({
    id: 5, label: holiday.name, recurrence: TimeOffRecurrence.OneOff,
    startDate: current.startDate ?? holiday.date, endDate: current.startDate ?? holiday.date,
    isAllDay: current.isAllDay ?? true, timeFrom: current.timeFrom, timeTo: current.timeTo,
    holiday,
  });
}

describe("SingleTimeOffComponent — holiday mode", () => {
  it("derives the edited state by comparing the TimeOff against the original snapshot", () => {
    // Original 06 Apr all-day; current moved to 13 Apr and timed.
    const t = holidayTimeOff({ startDate: "2026-04-13", isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00" }, { date: "2026-04-06" });
    const c = make({ timeOffService: { get: () => of(t) } });
    c.id = 5;

    expect(c.timeOff?.holiday).toBeTruthy();
    expect(c.changedDate).toBe(true);   // 13 Apr vs 06 Apr
    expect(c.changedTime).toBe(true);   // timed vs all-day
    expect(c.isHolidayEdited).toBe(true);
  });

  it("treats an untouched holiday as not edited", () => {
    const t = holidayTimeOff({ startDate: "2026-04-06", isAllDay: true }, { date: "2026-04-06" });
    const c = make({ timeOffService: { get: () => of(t) } });
    c.id = 5;

    expect(c.timeOff?.holiday).toBeTruthy();
    expect(c.isHolidayEdited).toBe(false);
  });

  it("reverts and emits onChanged, keyed on the ImportedHoliday id", (done) => {
    const revert = jasmine.createSpy("revert").and.returnValue(of(undefined));
    const t = holidayTimeOff({ startDate: "2026-04-13", isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00" }, { id: 9, date: "2026-04-06" });
    const c = make({ timeOffService: { get: () => of(t) }, holidayService: { revert } });
    c.id = 5;
    c.onChanged.subscribe(() => { expect(revert).toHaveBeenCalledWith(9); done(); });

    c.openRevertDialog();
  });

  it("removes the holiday by deleting its linked TimeOff via TimeOffService", (done) => {
    const del = jasmine.createSpy("delete").and.returnValue(of(undefined));
    const t = holidayTimeOff({ startDate: "2026-04-06", isAllDay: true }, { date: "2026-04-06" });
    const c = make({ timeOffService: { get: () => of(t), delete: del } });
    c.id = 5;
    c.onChanged.subscribe(() => { expect(del).toHaveBeenCalledWith(5); done(); }); // the TimeOff id, not the holiday id

    c.openRemoveDialog();
  });

  it("treats a plain time-off (no embedded holiday) as not a holiday", () => {
    const t = new TimeOff({ id: 3, label: "Vacation", recurrence: TimeOffRecurrence.OneOff, startDate: "2026-04-13", endDate: "2026-04-15", isAllDay: true });
    const c = make({ timeOffService: { get: () => of(t) } });
    c.id = 3;

    expect(c.timeOff?.holiday).toBeUndefined();
    expect(c.schedule).not.toBe("");
  });
});
