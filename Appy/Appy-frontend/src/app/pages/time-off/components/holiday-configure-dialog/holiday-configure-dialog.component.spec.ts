import { HolidayImportSettings } from "src/app/models/holiday";
import { HolidayConfigureDialogComponent } from "./holiday-configure-dialog.component";

function make(holidayService: any = {}): HolidayConfigureDialogComponent {
  return new HolidayConfigureDialogComponent(holidayService);
}

describe("HolidayConfigureDialogComponent — configure change gate", () => {
  it("opens the confirm dialog when changing an existing country with imported holidays present", () => {
    const c = make();
    (c as any).settings = new HolidayImportSettings({ countryCode: "HR" });
    c.selectedCountryCode = "SI";
    c.hasImportedHolidays = true;
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
    c.hasImportedHolidays = false;
    const saveSpy = spyOn(c, "saveSettings");

    c.confirmConfigure();

    expect(saveSpy).toHaveBeenCalled();
  });

  it("saves directly when the country is unchanged", () => {
    const c = make();
    (c as any).settings = new HolidayImportSettings({ countryCode: "HR" });
    c.selectedCountryCode = "HR";
    c.hasImportedHolidays = true;
    const saveSpy = spyOn(c, "saveSettings");

    c.confirmConfigure();

    expect(saveSpy).toHaveBeenCalled();
  });
});
