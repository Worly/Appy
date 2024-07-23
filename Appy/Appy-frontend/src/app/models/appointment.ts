import { Model, REQUIRED_VALIDATION, Validation } from "./base-model";
import { ServiceDTO } from "./service";
import dayjs from "dayjs";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import { parseDuration } from "../utils/time-utils";
import { ClientDTO } from "./client";
import { IconName, IconPrefix } from "@fortawesome/fontawesome-svg-core";
import { Color } from "../components/button/button.component";

export type AppointmentStatus = "Confirmed" | "Unconfirmed";

export type AppointmentStatusInfo = {
    value: AppointmentStatus,
    color: Color,
    iconPrefix: IconPrefix,
    iconName: IconName,
};

export const AppointmentStatusMap: { [key: string]: AppointmentStatusInfo } = {
    "Unconfirmed": {
        value: "Unconfirmed",
        color: "warning",
        iconPrefix: "fas",
        iconName: "question"
    },
    "Confirmed": {
        value: "Confirmed",
        color: "success",
        iconPrefix: "fas",
        iconName: "check"
    }
}

export class AppointmentDTO {
    public id: number = 0;
    public date?: string;
    public time?: string;
    public duration?: string;

    public service?: ServiceDTO;
    public client?: ClientDTO;

    public status?: AppointmentStatus;

    public notes?: string;

    public createdAt?: string;
    public lastUpdatedAt?: string;
}

export class Appointment extends Model<Appointment> {
    public id: number;
    public date?: Dayjs;
    public time?: Dayjs;
    public duration?: Duration;

    public service?: ServiceDTO;
    public client?: ClientDTO;

    public status?: AppointmentStatus;

    public notes?: string;

    public createdAt?: Dayjs;
    public lastUpdatedAt?: Dayjs;

    override validations: Validation<Appointment>[] = [
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
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.client),
            propertyName: "client",
            errorCode: "pages.appointments.errors.MISSING_CLIENT"
        }
    ]

    constructor(dto: AppointmentDTO = new AppointmentDTO()) {
        super();

        this.id = dto.id;
        this.date = dto.date ? dayjs(dto.date) : undefined;
        this.time = dto.time ? dayjs(dto.time, "HH:mm:ss") : undefined;
        this.duration = dto.duration ? parseDuration(dto.duration) : undefined;
        this.service = dto.service;
        this.client = dto.client;
        this.status = dto.status;
        this.notes = dto.notes;
        this.createdAt = dto.createdAt ? dayjs(dto.createdAt) : undefined;
        this.lastUpdatedAt = dto.lastUpdatedAt ? dayjs(dto.lastUpdatedAt) : undefined;

        this.initProperties();
    }

    public getDTO(): AppointmentDTO {
        let dto = new AppointmentDTO();
        dto.id = this.id;
        dto.date = this.date ? this.date.format("YYYY-MM-DD") : undefined;
        dto.time = this.time ? this.time.format("HH:mm:ss") : undefined;
        dto.duration = this.duration ? this.duration.format("HH:mm:ss") : undefined;
        dto.service = this.service;
        dto.client = this.client;
        dto.status = this.status;
        dto.notes = this.notes;

        return dto;
    }
}