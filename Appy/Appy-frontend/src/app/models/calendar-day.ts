import { Appointment, AppointmentView, AppointmentViewDTO } from "./appointment";
import { WorkingHour, WorkingHourDTO } from "./working-hours";
import { TimeOffOccurrence, TimeOffOccurrenceDTO } from "./time-off-occurrence";
import dayjs from "dayjs";
import { Dayjs } from "dayjs";

export class CalendarDayDTO {
    public date?: string;
    public appointments?: AppointmentViewDTO[];
    public workingHours?: WorkingHourDTO[];
    public timeOffs?: TimeOffOccurrenceDTO[];
}

export class CalendarDay {
    public date?: Dayjs;
    public appointments?: AppointmentView[];
    public workingHours?: WorkingHour[];
    public timeOffs?: TimeOffOccurrence[];

    constructor(dto: CalendarDayDTO = new CalendarDayDTO()) {
        this.date = dto.date ? dayjs(dto.date) : undefined;
        this.appointments = dto.appointments ? dto.appointments.map(a => new AppointmentView(a)) : undefined;
        this.workingHours = dto.workingHours ? dto.workingHours.map(w => new WorkingHour(w)) : undefined;
        this.timeOffs = dto.timeOffs ? dto.timeOffs.map(t => new TimeOffOccurrence(t)) : [];
    }
}