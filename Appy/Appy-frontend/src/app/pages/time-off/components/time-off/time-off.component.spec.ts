import { of } from "rxjs";
import { TimeOffComponent } from "./time-off.component";
import { HolidayImportSettings, HolidayListItem } from "src/app/models/holiday";

function make(holidayService?: any): TimeOffComponent {
  // (Router, Location, ActivatedRoute, HolidayService, ChangeDetectorRef)
  return new TimeOffComponent(null as any, null as any, null as any, holidayService ?? null as any, null as any);
}

function makeHolidayServiceStub() {
  const pagedResult = {
    items$: of([]),
    loading$: of(false),
    loadingForwards$: of(false),
    hasMore: () => false,
    loadMore: () => {},
  };
  return { getList: jasmine.createSpy("getList").and.returnValue(pagedResult) };
}

describe("TimeOffComponent — configure change gate", () => {
  it("opens the confirm dialog when changing an existing country with imported holidays present", () => {
    const c = make();
    (c as any).settings = new HolidayImportSettings({ countryCode: "HR" });
    c.selectedCountryCode = "SI";
    c.holidays = [new HolidayListItem({ id: 1, name: "x", isAllDay: true, isEdited: false, linkedTimeOffId: 1 })];
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

describe("TimeOffComponent — holiday list reload on tab/scope change", () => {
  it("loads the holiday list when switching to the Holidays tab", () => {
    const holidayService = makeHolidayServiceStub();
    const c = make(holidayService);
    c.activeTab = "OneOff";
    spyOn(c as any, "updateUrl");

    c.setTab("Holidays");

    expect(holidayService.getList).toHaveBeenCalled();
  });

  it("reloads the holiday list when changing scope while on the Holidays tab", () => {
    const holidayService = makeHolidayServiceStub();
    const c = make(holidayService);
    c.activeTab = "Holidays";
    spyOn(c as any, "updateUrl");
    holidayService.getList.calls.reset();

    c.setScope("History");

    expect(holidayService.getList).toHaveBeenCalled();
  });
});
