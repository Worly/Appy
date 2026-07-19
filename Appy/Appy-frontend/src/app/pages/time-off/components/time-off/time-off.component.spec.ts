import { TimeOffComponent } from "./time-off.component";

function make(): TimeOffComponent {
  // (Router, Location, ActivatedRoute)
  return new TimeOffComponent(null as any, null as any, null as any);
}

describe("TimeOffComponent", () => {
  it("maps the Recurring tab to the Recurring list type, others to OneOff", () => {
    const c = make();
    c.activeTab = "Recurring";
    expect(c.listType).toBe("Recurring");
    c.activeTab = "Holidays";
    expect(c.listType).toBe("OneOff");
    c.activeTab = "OneOff";
    expect(c.listType).toBe("OneOff");
  });

  it("flags only the Holidays tab as holidays", () => {
    const c = make();
    c.activeTab = "Holidays";
    expect(c.isHolidays).toBe(true);
    c.activeTab = "OneOff";
    expect(c.isHolidays).toBe(false);
  });

  it("persists tab and scope to the URL on change", () => {
    const c = make();
    const updateUrl = spyOn(c as any, "updateUrl");

    c.setTab("Holidays");
    expect(c.activeTab).toBe("Holidays");

    c.setScope("History");
    expect(c.scope).toBe("History");

    expect(updateUrl).toHaveBeenCalledTimes(2);
  });
});
