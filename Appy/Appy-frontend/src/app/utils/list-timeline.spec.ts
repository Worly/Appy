import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import duration from "dayjs/plugin/duration";
import { AppointmentView } from "../models/appointment";
import { TimeOffOccurrence } from "../models/time-off-occurrence";
import { buildDayTimeline, groupByContentDay } from "./list-timeline";

dayjs.extend(customParseFormat);
dayjs.extend(duration);

function ap(time: string, durationMin: number, id: number): AppointmentView {
  let a = new AppointmentView();
  a.id = id;
  a.time = dayjs(time, "HH:mm");
  a.duration = dayjs.duration({ minutes: durationMin });
  a.date = dayjs("2030-06-03", "YYYY-MM-DD");
  return a;
}

function partialOff(from: string, to: string, label: string): TimeOffOccurrence {
  let o = new TimeOffOccurrence();
  o.isAllDay = false;
  o.label = label;
  o.timeFrom = dayjs(from, "HH:mm");
  o.timeTo = dayjs(to, "HH:mm");
  return o;
}

describe("buildDayTimeline", () => {
  it("merges appointments and partial time-offs sorted by start time", () => {
    let timeline = buildDayTimeline([ap("10:00", 30, 1), ap("14:00", 30, 2)], [partialOff("12:00", "13:00", "Lunch")]);
    expect(timeline.map(e => e.kind)).toEqual(["appointment", "timeoff", "appointment"]);
    expect(timeline[1].kind).toBe("timeoff");
  });

  it("ignores all-day occurrences (those render on the date line, not inline)", () => {
    let allDay = new TimeOffOccurrence();
    allDay.isAllDay = true;
    allDay.label = "Closed";
    let timeline = buildDayTimeline([ap("10:00", 30, 1)], [allDay]);
    expect(timeline.length).toBe(1);
    expect(timeline[0].kind).toBe("appointment");
  });

  it("exposes start and duration for every entry so gaps/overlaps can be computed", () => {
    let timeline = buildDayTimeline([ap("10:00", 30, 1)], [partialOff("11:00", "12:00", "Lunch")]);
    expect(timeline[0].start.format("HH:mm")).toBe("10:00");
    expect(timeline[1].start.format("HH:mm")).toBe("11:00");
    expect(timeline[1].duration.asMinutes()).toBe(60);
  });
});

function appointmentOn(dateISO: string): AppointmentView {
    const a = new AppointmentView();
    a.date = dayjs(dateISO);
    return a;
}
function occurrenceOn(dateISO: string): TimeOffOccurrence {
    return new TimeOffOccurrence({ id: 1, date: dateISO, isAllDay: true });
}

describe("groupByContentDay()", () => {
    it("groups appointments by day, ascending", () => {
        const days = groupByContentDay([appointmentOn("2030-01-15"), appointmentOn("2030-01-10"), appointmentOn("2030-01-15")], []);
        expect(days.map(d => d.date.format("YYYY-MM-DD"))).toEqual(["2030-01-10", "2030-01-15"]);
        expect(days[1].appointments.length).toBe(2);
    });

    it("adds an appointment-less day for a date that only has a time-off", () => {
        const days = groupByContentDay([appointmentOn("2030-01-15")], [occurrenceOn("2030-01-20")]);
        expect(days.map(d => d.date.format("YYYY-MM-DD"))).toEqual(["2030-01-15", "2030-01-20"]);
        const timeOffOnly = days.find(d => d.date.format("YYYY-MM-DD") === "2030-01-20")!;
        expect(timeOffOnly.appointments.length).toBe(0);
    });

    it("does not duplicate a day that has both an appointment and a time-off", () => {
        const days = groupByContentDay([appointmentOn("2030-01-20")], [occurrenceOn("2030-01-20")]);
        expect(days.length).toBe(1);
        expect(days[0].appointments.length).toBe(1);
    });
});
