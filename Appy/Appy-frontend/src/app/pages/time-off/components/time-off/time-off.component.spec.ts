import { TimeOffComponent } from "./time-off.component";
import { Holiday } from "src/app/models/holiday";
import { HolidayImportSettings } from "src/app/models/holiday";

function make(): TimeOffComponent {
  // (Router, Location, ActivatedRoute, HolidayService, ChangeDetectorRef)
  return new TimeOffComponent(null as any, null as any, null as any, null as any, null as any);
}

describe("TimeOffComponent — configure change gate", () => {
  it("opens the confirm dialog when changing an existing country with imported holidays present", () => {
    const c = make();
    (c as any).settings = new HolidayImportSettings({ countryCode: "HR" });
    c.selectedCountryCode = "SI";
    c.holidays = [new Holiday({ id: 1, name: "x", countryCode: "HR", isAllDay: true, isEdited: false, isRemoved: false })];
    const configure = { close: jasmine.createSpy("close") };
    const confirm = { open: jasmine.createSpy("open") };
    (c as any).configureDialog = configure; (c as any).confirmChangeDialog = confirm;
    const saveSpy = spyOn(c, "saveSettings");

    c.confirmConfigure();

    expect(confirm.open).toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("saves directly when there is nothing to lose (no prior country)", () => {
    const c = make();
    (c as any).settings = new HolidayImportSettings({ countryCode: undefined });
    c.selectedCountryCode = "HR";
    c.holidays = [];
    const saveSpy = spyOn(c, "saveSettings");

    c.confirmConfigure();

    expect(saveSpy).toHaveBeenCalled();
  });
});
