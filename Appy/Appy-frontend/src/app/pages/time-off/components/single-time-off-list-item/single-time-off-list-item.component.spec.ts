import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { HolidayListItem } from "src/app/models/holiday";
import { SingleTimeOffListItemComponent } from "./single-time-off-list-item.component";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

function makeItem(): SingleTimeOffListItemComponent {
  // Only TranslateService is used, and only for text formatting; a pass-through identity is enough.
  return new SingleTimeOffListItemComponent({ translate: (k: string) => k, getSelectedLanguageCode: () => "en" } as any);
}

describe("SingleTimeOffListItemComponent — holiday mode", () => {
  it("shows the edited badge for an edited holiday", () => {
    const c = makeItem();
    c.holiday = new HolidayListItem({ id: 1, name: "Easter Monday", date: "2026-04-13", isAllDay: true, isEdited: true, linkedTimeOffId: 10 });
    expect(c.label).toBe("Easter Monday");
    expect(c.badge).toBe("edited");
    expect(c.removed).toBe(false);
    expect(c.schedule).not.toBe("");
    expect(c.time).not.toBe("");
  });

  it("marks a removed holiday", () => {
    const c = makeItem();
    c.holiday = new HolidayListItem({ id: 2, name: "Labour Day", date: "2026-05-01", isAllDay: true, isEdited: false, linkedTimeOffId: undefined });
    expect(c.badge).toBe("removed");
    expect(c.removed).toBe(true);
  });
});
