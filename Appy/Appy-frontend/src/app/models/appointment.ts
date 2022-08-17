import { BaseModel, REQUIRED_VALIDATION, Validation } from "./base-model";
import { ServiceDTO } from "./service";
import dayjs from "dayjs";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import { parseDuration } from "../utils/time-utils";

export class AppointmentDTO {
    public id: number = 0;
    public date?: string;
    public time?: string;
    public duration?: string;

    public service?: ServiceDTO;
}

export class Appointment extends BaseModel {
    public id: number;
    public date?: Dayjs;
    public time?: Dayjs;
    public duration?: Duration;

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
        this.date = dto.date ? dayjs(dto.date) : undefined;
        this.time = dto.time ? dayjs(dto.time, "HH:mm:ss") : undefined;
        this.duration = dto.duration ? parseDuration(dto.duration) : undefined;
        this.service = dto.service;

        this.initProperties();
    }

    public getDTO(): AppointmentDTO {
        let dto = new AppointmentDTO();
        dto.id = this.id;
        dto.date = this.date ? this.date.format("YYYY-MM-DD") : undefined;
        dto.time = this.time ? this.time.format("HH:mm:ss") : undefined;
        dto.duration = this.duration ? this.duration.format("HH:mm:ss") : undefined;
        dto.service = this.service;

        return dto;
    }
}