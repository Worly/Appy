import * as moment from "moment";
import { BaseModel, REQUIRED_VALIDATION, Validation } from "./base-model";
import { ServiceDTO } from "./service";

export class AppointmentDTO {
    public id: number = 0;
    public date?: string;
    public time?: string;
    public duration?: string;

    public service?: ServiceDTO;
}

export class FreeTimeDTO {
    public from: string = "";
    public to: string = "";
}

export class FreeTime {
    public from: moment.Moment;
    public to: moment.Moment;

    constructor(dto: FreeTimeDTO) {
        this.from = moment(dto.from, "HH:mm:ss");
        this.to = moment(dto.to, "HH:mm:ss");
    }
}

export class Appointment extends BaseModel {
    public id: number;
    public date?: moment.Moment;
    public time?: moment.Moment;
    public duration?: moment.Duration;

    public service?: ServiceDTO;

    override validations: Validation[] = [
        {
            isValid: () => REQUIRED_VALIDATION(this.date),
            propertyName: "date",
            errorCode: "pages.appointments.errors.MISSING_DATE"
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.time),
            propertyName: "time",
            errorCode: "pages.appointments.errors.MISSING_TIME"
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.duration),
            propertyName: "duration",
            errorCode: "pages.appointments.errors.MISSING_DURATION"
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.service),
            propertyName: "service",
            errorCode: "pages.appointments.errors.MISSING_SERVICE"
        }
    ]

    constructor(dto: AppointmentDTO = new AppointmentDTO()) {
        super();
        
        this.id = dto.id;
        this.date = dto.date ? moment(dto.date) : undefined;
        this.time = dto.time ? moment(dto.time, "HH:mm:ss") : undefined;
        this.duration = dto.duration ? moment.duration(dto.duration) : undefined;
        this.service = dto.service;

        this.initProperties();
    }

    public getDTO(): AppointmentDTO {
        let dto = new AppointmentDTO();
        dto.id = this.id;
        dto.date = this.date ? this.date.format("yyyy-MM-DD") : undefined;
        dto.time = this.time ? this.time.format("HH:mm:ss") : undefined;
        dto.duration = this.duration ? moment.utc(this.duration.asMilliseconds()).format("HH:mm:ss") : undefined;
        dto.service = this.service;
        
        return dto;
    }
}