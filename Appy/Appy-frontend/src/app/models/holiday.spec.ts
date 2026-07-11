import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Holiday, HolidayDTO } from "./holiday";

dayjs.extend(customParseFormat);

describe("Holiday model", () => {
  it("parses dates and times from the DTO", () => {
    const dto: HolidayDTO = {
      id: 5, name: "Nova godina", countryCode: "HR",
      date: "2026-04-13", originalDate: "2026-04-06",
      isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00",
      notes: "note", isEdited: true, linkedTimeOffId: 42,
    };

    const h = new Holiday(dto);

    expect(h.id).toBe(5);
    expect(h.name).toBe("Nova godina");
    expect(h.date!.format("YYYY-MM-DD")).toBe("2026-04-13");
    expect(h.originalDate!.format("YYYY-MM-DD")).toBe("2026-04-06");
    expect(h.timeFrom!.format("HH:mm")).toBe("12:00");
    expect(h.isEdited).toBe(true);
    expect(h.isRemoved).toBe(false); // has a linked TimeOff
  });
});
