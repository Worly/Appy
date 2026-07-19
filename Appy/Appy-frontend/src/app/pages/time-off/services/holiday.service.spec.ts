import { of } from "rxjs";
import { HolidayService } from "./holiday.service";
import { HolidayImportSettings } from "src/app/models/holiday";
import { appointmentKeys, holidayKeys, timeOffKeys } from "src/app/shared/services/data/keys";

describe("HolidayService — cache invalidation", () => {
  function make() {
    const http = { put: jasmine.createSpy("put").and.returnValue(of(null)) };
    const cache = { invalidate: jasmine.createSpy("invalidate") };
    // Bypass the DI constructor: build a bare instance and inject the collaborators the mutations use.
    const svc = Object.create(HolidayService.prototype) as any;
    svc.httpClient = http;
    svc.cache = cache;
    return { svc, http, cache };
  }

  it("revert() and restore() invalidate the same keys", (done) => {
    const { svc, cache } = make();
    svc.revert(7).subscribe(() => {
      svc.restore(7).subscribe(() => {
        expect(cache.invalidate).toHaveBeenCalledTimes(2);
        expect(cache.invalidate).toHaveBeenCalledWith(holidayKeys.all, timeOffKeys.all, appointmentKeys.all);
        done();
      });
    });
  });

  it("saveSettings() invalidates holiday, time-off and appointment keys and seeds the settings cache", (done) => {
    const http = { put: jasmine.createSpy("put").and.returnValue(of({ countryCode: "HR" })) };
    const cache = { invalidate: jasmine.createSpy("invalidate") };
    const queryClient = { setQueryData: jasmine.createSpy("setQueryData") };
    const svc = Object.create(HolidayService.prototype) as any;
    svc.httpClient = http;
    svc.cache = cache;
    svc.queryClient = queryClient;

    svc.saveSettings(new HolidayImportSettings({ countryCode: "SI" })).subscribe((saved: HolidayImportSettings) => {
      expect(cache.invalidate).toHaveBeenCalledWith(holidayKeys.all, timeOffKeys.all, appointmentKeys.all);
      expect(queryClient.setQueryData).toHaveBeenCalledWith([...holidayKeys.settings], saved);
      done();
    });
  });
});
