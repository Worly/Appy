import { appointmentKeys, clientKeys, serviceKeys, workingHourKeys } from "./keys";

// Keys are `as const` tuples; cast to a plain array so Jasmine's matcher typing accepts the comparison.
const arr = (k: readonly unknown[]) => k as unknown[];

describe("key factories", () => {
    it("appointmentKeys expose all / list(date) / detail(id)", () => {
        expect(arr(appointmentKeys.all)).toEqual(["appointment"]);
        expect(arr(appointmentKeys.list("2026-06-06"))).toEqual(["appointment", "list", "2026-06-06"]);
        expect(arr(appointmentKeys.detail(5))).toEqual(["appointment", "detail", 5]);
    });

    it("clientKeys expose all / list(archived) / detail(id)", () => {
        expect(arr(clientKeys.all)).toEqual(["client"]);
        expect(arr(clientKeys.list(true))).toEqual(["client", "list", true]);
        expect(arr(clientKeys.detail(7))).toEqual(["client", "detail", 7]);
    });

    it("serviceKeys expose all / list(archived) / detail(id)", () => {
        expect(arr(serviceKeys.all)).toEqual(["service"]);
        expect(arr(serviceKeys.list(false))).toEqual(["service", "list", false]);
        expect(arr(serviceKeys.detail(9))).toEqual(["service", "detail", 9]);
    });

    it("workingHourKeys expose all", () => {
        expect(arr(workingHourKeys.all)).toEqual(["workingHour"]);
    });
});
