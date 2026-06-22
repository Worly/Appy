import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
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
