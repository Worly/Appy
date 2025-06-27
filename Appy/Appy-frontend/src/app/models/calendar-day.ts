import { Appointment, AppointmentView, AppointmentViewDTO } from "./appointment";
import { WorkingHour, WorkingHourDTO } from "./working-hours";
import dayjs from "dayjs";
import { Dayjs } from "dayjs";

export class CalendarDayDTO {
    public date?: string;
    public appointments?: AppointmentViewDTO[];
    public workingHours?: WorkingHourDTO[];
}

export class CalendarDay {
    public date?: Dayjs;
    public appointments?: AppointmentView[];
    public workingHours?: WorkingHour[];

    constructor(dto: CalendarDayDTO = new CalendarDayDTO()) {
        this.date = dto.date ? dayjs(dto.date) : undefined;
        this.appointments = dto.appointments ? dto.appointments.map(a => new AppointmentView(a)) : undefined;
        this.workingHours = dto.workingHours ? dto.workingHours.map(w => new WorkingHour(w)) : undefined;
    }
}