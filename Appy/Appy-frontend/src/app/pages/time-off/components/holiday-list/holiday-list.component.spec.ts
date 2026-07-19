import { of } from "rxjs";
import { HolidayListComponent } from "./holiday-list.component";

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

function make(holidayService: any): HolidayListComponent {
  // (HolidayService, ChangeDetectorRef, TranslateService)
  const translate = { translate: (k: string) => k, getSelectedLanguageCode: () => "en" };
  const changeDetector = { detectChanges: () => {} };
  return new HolidayListComponent(holidayService, changeDetector as any, translate as any);
}

describe("HolidayListComponent", () => {
  it("loads the list for the current scope on input change", () => {
    const holidayService = makeHolidayServiceStub();
    const c = make(holidayService);
    c.scope = "Active";

    c.ngOnChanges();

    expect(holidayService.getList).toHaveBeenCalledWith("Active");
  });

  it("reloads the list for the current scope on refresh", () => {
    const holidayService = makeHolidayServiceStub();
    const c = make(holidayService);
    c.scope = "History";

    c.refresh();

    expect(holidayService.getList).toHaveBeenCalledWith("History");
  });
});
