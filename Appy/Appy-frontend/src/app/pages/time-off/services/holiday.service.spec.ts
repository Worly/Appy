import { of } from "rxjs";
import { HolidayService } from "./holiday.service";
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

  it("remove() invalidates holiday, time-off and appointment keys", (done) => {
    const { svc, cache } = make();
    svc.remove(7).subscribe(() => {
      expect(cache.invalidate).toHaveBeenCalledWith(holidayKeys.all, timeOffKeys.all, appointmentKeys.all);
      done();
    });
  });

  it("revert() and restore() invalidate the same keys", (done) => {
    const { svc, cache } = make();
    svc.revert(7).subscribe(() => {
      svc.restore(7).subscribe(() => {
        expect(cache.invalidate).toHaveBeenCalledTimes(2);
        done();
      });
    });
  });
});
