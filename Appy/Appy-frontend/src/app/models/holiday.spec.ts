import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Holiday, HolidayDTO } from "./holiday";

dayjs.extend(customParseFormat);

describe("Holiday model", () => {
  it("parses the original provider snapshot from the DTO", () => {
    const dto: HolidayDTO = {
      id: 5, name: "Nova godina", countryCode: "HR", date: "2026-04-06",
    };

    const h = new Holiday(dto);

    expect(h.id).toBe(5);
    expect(h.name).toBe("Nova godina");
    expect(h.countryCode).toBe("HR");
    expect(h.date!.format("YYYY-MM-DD")).toBe("2026-04-06");
  });
});
