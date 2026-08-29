import { fakeAsync, tick } from "@angular/core/testing";
import { convertToParamMap } from "@angular/router";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import durationPlugin from "dayjs/plugin/duration";
import { of } from "rxjs";
import { Appointment } from "src/app/models/appointment";
import { ClientDTO } from "src/app/models/client";
import { ServiceDTO } from "src/app/models/service";
import { AppointmentEditComponent } from "./appointment-edit.component";

// The Appointment model parses dates and durations on construction and on every property set.
dayjs.extend(customParseFormat);
dayjs.extend(durationPlugin);

function service(id: number, duration: string): ServiceDTO {
  return { id, name: `Service${id}`, displayName: `Service${id}`, duration };
}

function client(id: number): ClientDTO {
  return { id, name: `Client${id}` };
}

function savedAppointment(): Appointment {
  return new Appointment({
    id: 7,
    date: "2026-03-01",
    time: "10:00:00",
    duration: "01:00:00",
    service: service(1, "01:00:00"),
    client: client(1),
    notes: "as saved"
  });
}

// ngOnInit is the subject: it combines route data, params and query params behind a debounce,
// so every case drives it inside fakeAsync and ticks the debounce out.
function init(opts: { isNew?: boolean, id?: string, queryParams?: { [key: string]: string }, loaded?: Appointment }): AppointmentEditComponent {
  const appointmentService = { get: () => of(opts.loaded) };
  const route = {
    data: of(opts.isNew ? { isNew: true } : {}),
    paramMap: of(convertToParamMap(opts.id != null ? { id: opts.id } : {})),
    queryParamMap: of(convertToParamMap(opts.queryParams ?? {}))
  };

  const c = new AppointmentEditComponent(
    null as any, null as any, route as any, appointmentService as any, null as any, null as any, null as any);

  c.ngOnInit();
  tick();

  return c;
}

describe("AppointmentEditComponent — unsaved edits carried in the URL", () => {
  it("applies every edited field from the URL over the saved appointment", fakeAsync(() => {
    const c = init({
      id: "7",
      loaded: savedAppointment(),
      queryParams: {
        date: "2026-03-05",
        time: "14:30:00",
        duration: "00:45:00",
        service: JSON.stringify(service(2, "00:30:00")),
        client: JSON.stringify(client(2)),
        notes: "edited"
      }
    });

    expect(c.appointment!.date!.format("YYYY-MM-DD")).toBe("2026-03-05");
    expect(c.appointment!.time!.format("HH:mm:ss")).toBe("14:30:00");
    expect(c.appointment!.duration!.format("HH:mm:ss")).toBe("00:45:00");
    expect(c.appointment!.service!.id).toBe(2);
    expect(c.appointment!.client!.id).toBe(2);
    expect(c.appointment!.notes).toBe("edited");
    expect(c.appointment!.id).toBe(7);
  }));

  it("keeps the saved values of the fields the URL does not carry", fakeAsync(() => {
    const c = init({ id: "7", loaded: savedAppointment(), queryParams: { date: "2026-03-05" } });

    expect(c.appointment!.date!.format("YYYY-MM-DD")).toBe("2026-03-05");
    expect(c.appointment!.time!.format("HH:mm:ss")).toBe("10:00:00");
    expect(c.appointment!.duration!.format("HH:mm:ss")).toBe("01:00:00");
    expect(c.appointment!.service!.id).toBe(1);
    expect(c.appointment!.client!.id).toBe(1);
    expect(c.appointment!.notes).toBe("as saved");
  }));

  it("shows the saved appointment untouched when the URL carries no edits", fakeAsync(() => {
    const c = init({ id: "7", loaded: savedAppointment() });

    expect(c.appointment!.date!.format("YYYY-MM-DD")).toBe("2026-03-01");
    expect(c.appointment!.time!.format("HH:mm:ss")).toBe("10:00:00");
    expect(c.appointment!.duration!.format("HH:mm:ss")).toBe("01:00:00");
    expect(c.appointment!.service!.id).toBe(1);
    expect(c.appointment!.client!.id).toBe(1);
    expect(c.appointment!.notes).toBe("as saved");
  }));

  it("keeps a saved duration that differs from the URL service's own duration", fakeAsync(() => {
    const c = init({
      id: "7",
      loaded: savedAppointment(),
      queryParams: { service: JSON.stringify(service(2, "00:30:00")) }
    });

    expect(c.appointment!.service!.id).toBe(2);
    expect(c.appointment!.duration!.format("HH:mm:ss")).toBe("01:00:00");
  }));

  it("seeds a new appointment from the URL params", fakeAsync(() => {
    const c = init({
      isNew: true,
      queryParams: {
        date: "2026-03-05",
        time: "14:30:00",
        duration: "00:45:00",
        service: JSON.stringify(service(2, "00:30:00")),
        client: JSON.stringify(client(2)),
        notes: "edited"
      }
    });

    expect(c.appointment!.id).toBe(0);
    expect(c.appointment!.date!.format("YYYY-MM-DD")).toBe("2026-03-05");
    expect(c.appointment!.time!.format("HH:mm:ss")).toBe("14:30:00");
    expect(c.appointment!.duration!.format("HH:mm:ss")).toBe("00:45:00");
    expect(c.appointment!.service!.id).toBe(2);
    expect(c.appointment!.client!.id).toBe(2);
    expect(c.appointment!.notes).toBe("edited");
  }));

  it("takes a new appointment's duration from its service when the URL carries none", fakeAsync(() => {
    const c = init({ isNew: true, queryParams: { service: JSON.stringify(service(2, "00:30:00")) } });

    expect(c.appointment!.duration!.format("HH:mm:ss")).toBe("00:30:00");
  }));
});
