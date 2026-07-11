import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { of } from "rxjs";
import { Holiday } from "src/app/models/holiday";
import { RemovedHolidayComponent } from "./removed-holiday.component";

dayjs.extend(customParseFormat);

function make(holidayService: any, notifyDialogService: any = { yesNoDialog: () => of(true) }) {
  // (holidayService, translateService, notifyDialogService)
  return new RemovedHolidayComponent(
    holidayService,
    { translate: (k: string) => k, getSelectedLanguageCode: () => "en" } as any,
    notifyDialogService,
  );
}

function removedHoliday(id: number): Holiday {
  return new Holiday({
    id, name: "New Year", countryCode: "HR", date: "2026-01-01", originalDate: "2026-01-01",
    isAllDay: true, isEdited: false, linkedTimeOffId: undefined,
  });
}

describe("RemovedHolidayComponent", () => {
  it("fetches the holiday by ImportedHoliday id and renders it", () => {
    const getById = jasmine.createSpy("getById").and.returnValue(of(removedHoliday(3)));
    const c = make({ getById });
    c.importedHolidayId = 3;

    expect(getById).toHaveBeenCalledWith(3);
    expect(c.holiday?.name).toBe("New Year");
    expect(c.schedule).not.toBe("");
    expect(c.time).not.toBe("");
  });

  it("restores and emits onChanged", (done) => {
    const restore = jasmine.createSpy("restore").and.returnValue(of(undefined));
    const c = make({ getById: () => of(removedHoliday(7)), restore }, { yesNoDialog: () => of(true) });
    c.importedHolidayId = 7;
    c.onChanged.subscribe(() => { expect(restore).toHaveBeenCalledWith(7); done(); });

    c.openRestoreDialog();
  });
});
