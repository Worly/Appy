import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { of } from "rxjs";
import { Holiday } from "src/app/models/holiday";
import { SingleTimeOffComponent } from "./single-time-off.component";

dayjs.extend(customParseFormat);

function make(holidayService: any) {
  // (timeOffService, translateService, router, holidayService)
  return new SingleTimeOffComponent(null as any, { translate: (k: string) => k, getSelectedLanguageCode: () => "en" } as any, null as any, holidayService);
}

describe("SingleTimeOffComponent — holiday mode", () => {
  it("computes the Changes rows for an edited holiday", () => {
    const c = make({});
    c.holiday = new Holiday({ id: 1, name: "Easter Monday", countryCode: "HR", date: "2026-04-13", originalDate: "2026-04-06", isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00", isEdited: true, isRemoved: false });
    expect(c.isHolidayEdited).toBe(true);
    expect(c.changedDate).toBe(true);   // 13 Apr vs 06 Apr
    expect(c.changedTime).toBe(true);   // timed vs all-day
  });

  it("reverts and emits onChanged", (done) => {
    const revert = jasmine.createSpy("revert").and.returnValue(of(undefined));
    const c = make({ revert });
    c.holiday = new Holiday({ id: 9, name: "x", countryCode: "HR", date: "2026-04-13", originalDate: "2026-04-06", isAllDay: true, isEdited: true, isRemoved: false });
    (c as any).revertDialog = { close: () => {} };
    c.onChanged.subscribe(() => { expect(revert).toHaveBeenCalledWith(9); done(); });

    c.confirmRevert();
  });
});
