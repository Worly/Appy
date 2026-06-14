import { TimeOffOccurrence } from "./time-off-occurrence";

describe("TimeOffOccurrence", () => {
    it("maps id from the DTO", () => {
        const o = new TimeOffOccurrence({ id: 42, date: "2030-06-01" });
        expect(o.id).toBe(42);
    });
});
