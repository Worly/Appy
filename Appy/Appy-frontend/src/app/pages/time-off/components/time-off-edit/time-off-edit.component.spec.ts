import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
import { DayOfWeek } from "src/app/models/working-hours";
import { TimeOffEditComponent } from "./time-off-edit.component";

// The TimeOff model validates on every property set, and those validators lean on these plugins.
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

// The method under test (onStartDateChange) only touches `this.timeOff`/`this.type`, so we can
// exercise it on a bare instance without Angular's TestBed — matching this codebase's habit of
// unit-testing logic directly (see time-off-display.spec.ts).
function makeComponent(): TimeOffEditComponent {
  return new TimeOffEditComponent(null as any, null as any, null as any, null as any);
}

describe("TimeOffEditComponent — one-off From/To linkage", () => {
  it("moves the To date to the new From date when To equalled the previous From (single-day range)", () => {
    const c = makeComponent();
    c.type = "oneoff";
    c.timeOff.recurrence = TimeOffRecurrence.OneOff;
    c.timeOff.startDate = dayjs("2026-01-02");
    c.timeOff.endDate = dayjs("2026-01-02");

    c.onStartDateChange(dayjs("2026-01-10"));

    expect(c.timeOff.startDate!.format("YYYY-MM-DD")).toBe("2026-01-10");
    expect(c.timeOff.endDate!.format("YYYY-MM-DD")).toBe("2026-01-10");
  });

  it("leaves the To date unchanged when it differs from the previous From (multi-day range)", () => {
    const c = makeComponent();
    c.type = "oneoff";
    c.timeOff.recurrence = TimeOffRecurrence.OneOff;
    c.timeOff.startDate = dayjs("2026-01-02");
    c.timeOff.endDate = dayjs("2026-01-05");

    c.onStartDateChange(dayjs("2026-01-10"));

    expect(c.timeOff.startDate!.format("YYYY-MM-DD")).toBe("2026-01-10");
    expect(c.timeOff.endDate!.format("YYYY-MM-DD")).toBe("2026-01-05");
  });

  it("does not move the To date for recurring rules even when it equals the previous From", () => {
    const c = makeComponent();
    c.type = "recurring";
    c.timeOff.recurrence = TimeOffRecurrence.Weekly;
    c.timeOff.startDate = dayjs("2026-01-02");
    c.timeOff.endDate = dayjs("2026-01-02");

    c.onStartDateChange(dayjs("2026-01-10"));

    expect(c.timeOff.startDate!.format("YYYY-MM-DD")).toBe("2026-01-10");
    expect(c.timeOff.endDate!.format("YYYY-MM-DD")).toBe("2026-01-02");
  });
});

describe("TimeOffEditComponent — delete confirmation", () => {
  // A fake observable that records subscription but never emits, so the success handler
  // (which calls location.back()) never runs — we only assert which service method was invoked.
  const fakeObs = () => ({ subscribe: () => ({ unsubscribe() {} }) });

  function makeWithService() {
    const service = {
      delete: jasmine.createSpy("delete").and.callFake(fakeObs),
      stop: jasmine.createSpy("stop").and.callFake(fakeObs),
    };
    const c = new TimeOffEditComponent(service as any, null as any, null as any, null as any);
    c.isNew = false;
    return { c, service };
  }

  function setOneOff(c: TimeOffEditComponent): void {
    c.type = "oneoff";
    c.timeOff.recurrence = TimeOffRecurrence.OneOff;
    c.timeOff.startDate = dayjs();
    c.timeOff.endDate = dayjs();
  }

  function setStartedRecurring(c: TimeOffEditComponent): void {
    c.type = "recurring";
    c.timeOff.recurrence = TimeOffRecurrence.Weekly;
    c.timeOff.dayOfWeek = DayOfWeek.Monday;
    c.timeOff.startDate = dayjs().subtract(40, "day"); // already started
    c.timeOff.endDate = undefined;                      // still active (open-ended)
  }

  it("never deletes immediately — delete() opens the dialog without touching the service", () => {
    const { c, service } = makeWithService();
    setOneOff(c);

    c.delete();

    expect(service.delete).not.toHaveBeenCalled();
    expect(service.stop).not.toHaveBeenCalled();
    expect(c.canStop).toBe(false); // a one-off can't be stopped → plain confirmation
  });

  it("deletes a one-off only after the deletion is confirmed", () => {
    const { c, service } = makeWithService();
    setOneOff(c);

    c.delete();
    c.confirmDelete();

    expect(service.delete).toHaveBeenCalledTimes(1);
    expect(service.stop).not.toHaveBeenCalled();
  });

  it("flags canStop for an active started recurring rule and still waits for confirmation", () => {
    const { c, service } = makeWithService();
    setStartedRecurring(c);

    c.delete();

    expect(c.canStop).toBe(true);
    expect(service.delete).not.toHaveBeenCalled();
    expect(service.stop).not.toHaveBeenCalled();
  });

  it("stops (keeps history) when confirming with the default stop mode", () => {
    const { c, service } = makeWithService();
    setStartedRecurring(c);

    c.delete();
    c.confirmDelete();

    expect(service.stop).toHaveBeenCalledTimes(1);
    expect(service.delete).not.toHaveBeenCalled();
  });

  it("deletes entirely when confirming a recurring rule with the remove mode", () => {
    const { c, service } = makeWithService();
    setStartedRecurring(c);

    c.delete();
    c.deleteMode = "remove";
    c.confirmDelete();

    expect(service.delete).toHaveBeenCalledTimes(1);
    expect(service.stop).not.toHaveBeenCalled();
  });

  it("does nothing on a new (unsaved) rule", () => {
    const { c, service } = makeWithService();
    setOneOff(c);
    c.isNew = true;

    c.delete();

    expect(service.delete).not.toHaveBeenCalled();
    expect(service.stop).not.toHaveBeenCalled();
  });
});
