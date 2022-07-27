import * as moment from "moment";
import { BaseModel, REQUIRED_VALIDATION, Validation } from "./base-model";

export class WorkingHourDTO {
    public dayOfWeek?: DayOfWeek;
    public timeFrom?: string;
    public timeTo?: string;
}

export class WorkingHour extends BaseModel {
    public dayOfWeek?: DayOfWeek;
    public timeFrom?: moment.Moment;
    public timeTo?: moment.Moment;

    override validations: Validation[] = [
        {
            isValid: () => REQUIRED_VALIDATION(this.timeFrom),
            propertyName: "timeFrom",
            errorCode: "pages.working-hours.errors.MISSING_TIME_FROM"
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.timeTo),
            propertyName: "timeTo",
            errorCode: "pages.working-hours.errors.MISSING_TIME_TO"
        },
        {
            isValid: () => this.timeFrom?.isBefore(this.timeTo) as boolean,
            propertyName: "timeFrom",
            responsibleProperties: ["timeTo"],
            errorCode: "pages.working-hours.errors.TIMES_NOT_IN_ORDER"
        }
    ]

    constructor(dto: WorkingHourDTO = new WorkingHourDTO()) {
        super();

        this.dayOfWeek = dto.dayOfWeek;
        this.timeFrom = dto.timeFrom ? moment(dto.timeFrom, "HH:mm:ss") : undefined;
        this.timeTo = dto.timeTo ? moment(dto.timeTo, "HH:mm:ss") : undefined;

        this.initProperties();
    }

    public getDTO(): WorkingHourDTO {
        let dto = new WorkingHourDTO();
        dto.dayOfWeek = this.dayOfWeek;
        dto.timeFrom = this.timeFrom ? this.timeFrom.format("HH:mm:ss") : undefined;
        dto.timeTo = this.timeTo ? this.timeTo.format("HH:mm:ss") : undefined;

        return dto;
    }
}

export enum DayOfWeek {
    Sunday = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6
}