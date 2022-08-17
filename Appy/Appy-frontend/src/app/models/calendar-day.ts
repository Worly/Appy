import { Appointment, AppointmentDTO } from "./appointment";
import { WorkingHour, WorkingHourDTO } from "./working-hours";
import dayjs from "dayjs";
import { Dayjs } from "dayjs";

export class CalendarDayDTO {
    public date?: string;
    public appointments?: AppointmentDTO[];
    public workingHours?: WorkingHourDTO[];
}

export class CalendarDay {
    public date?: Dayjs;
    public appointments?: Appointment[];
    public workingHours?: WorkingHour[];

    constructor(dto: CalendarDayDTO = new CalendarDayDTO()) {
        this.date = dto.date ? dayjs(dto.date) : undefined;
        this.appointments = dto.appointments ? dto.appointments.map(a => new Appointment(a)) : undefined;
        this.workingHours = dto.workingHours ? dto.workingHours.map(w => new WorkingHour(w)) : undefined;
    }
}