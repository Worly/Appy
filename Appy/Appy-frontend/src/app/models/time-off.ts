import { EditModel, REQUIRED_VALIDATION, Validation } from "./base-model";
import dayjs, { Dayjs } from "dayjs";
import { DayOfWeek } from "./working-hours";

export enum TimeOffRecurrence {
  OneOff = "OneOff",
  Weekly = "Weekly",
  Monthly = "Monthly",
}

// API-facing tokens for the list endpoint (match the backend enum names exactly).
export type TimeOffListType = "OneOff" | "Recurring";
export type TimeOffScope = "Active" | "Expired";

export class TimeOffDTO {
  public id: number = 0;
  public label?: string;
  public notes?: string;
  public recurrence?: TimeOffRecurrence;
  public startDate?: string;
  public endDate?: string;
  public dayOfWeek?: DayOfWeek;
  public dayOfMonth?: number;
  public isAllDay?: boolean;
  public timeFrom?: string;
  public timeTo?: string;
}

export class TimeOff extends EditModel<TimeOff> {
  public static readonly ENTITY_TYPE: string = "timeOff";

  public id: number;
  public label?: string;
  public notes?: string;
  public recurrence: TimeOffRecurrence = TimeOffRecurrence.OneOff;
  public startDate?: Dayjs;
  public endDate?: Dayjs;
  public dayOfWeek?: DayOfWeek;
  public dayOfMonth?: number;
  public isAllDay: boolean = false;
  public timeFrom?: Dayjs;
  public timeTo?: Dayjs;

  override validations: Validation<TimeOff>[] = [
    {
      isValid: () => REQUIRED_VALIDATION(this.label),
      propertyName: "label",
      errorCode: "pages.time-off.errors.MISSING_LABEL"
    },
    {
      isValid: () => this.isAllDay || (REQUIRED_VALIDATION(this.timeFrom) && REQUIRED_VALIDATION(this.timeTo)),
      propertyName: "timeFrom",
      responsibleProperties: ["timeTo", "isAllDay"],
      errorCode: "pages.time-off.errors.MISSING_TIME"
    },
    {
      isValid: () => this.isAllDay || (this.timeFrom != null && this.timeTo != null && this.timeFrom.isBefore(this.timeTo)),
      propertyName: "timeFrom",
      responsibleProperties: ["timeTo", "isAllDay"],
      errorCode: "pages.time-off.errors.TIMES_NOT_IN_ORDER"
    },
    {
      isValid: () => this.recurrence != TimeOffRecurrence.OneOff || (REQUIRED_VALIDATION(this.startDate) && REQUIRED_VALIDATION(this.endDate)),
      propertyName: "startDate",
      responsibleProperties: ["endDate", "recurrence"],
      errorCode: "pages.time-off.errors.MISSING_DATE_RANGE"
    },
    {
      isValid: () => !(this.startDate != null && this.endDate != null) || this.startDate.isSameOrBefore(this.endDate),
      propertyName: "startDate",
      responsibleProperties: ["endDate"],
      errorCode: "pages.time-off.errors.DATES_NOT_IN_ORDER"
    },
    {
      isValid: () => this.recurrence != TimeOffRecurrence.Weekly || this.dayOfWeek != null,
      propertyName: "dayOfWeek",
      responsibleProperties: ["recurrence"],
      errorCode: "pages.time-off.errors.MISSING_DAY_OF_WEEK"
    },
    {
      isValid: () => this.recurrence != TimeOffRecurrence.Monthly || (this.dayOfMonth != null && this.dayOfMonth >= 1 && this.dayOfMonth <= 31),
      propertyName: "dayOfMonth",
      responsibleProperties: ["recurrence"],
      errorCode: "pages.time-off.errors.INVALID_DAY_OF_MONTH"
    },
  ];

  constructor(dto: TimeOffDTO = new TimeOffDTO()) {
    super();

    this.id = dto.id;
    this.label = dto.label;
    this.notes = dto.notes;
    this.recurrence = dto.recurrence ?? TimeOffRecurrence.OneOff;
    this.startDate = dto.startDate ? dayjs(dto.startDate, "YYYY-MM-DD") : undefined;
    this.endDate = dto.endDate ? dayjs(dto.endDate, "YYYY-MM-DD") : undefined;
    this.dayOfWeek = dto.dayOfWeek;
    this.dayOfMonth = dto.dayOfMonth;
    this.isAllDay = dto.isAllDay ?? false;
    this.timeFrom = dto.timeFrom ? dayjs(dto.timeFrom, "HH:mm:ss") : undefined;
    this.timeTo = dto.timeTo ? dayjs(dto.timeTo, "HH:mm:ss") : undefined;

    this.initProperties();
  }

  public getDTO(): TimeOffDTO {
    let dto = new TimeOffDTO();
    dto.id = this.id;
    dto.label = this.label;
    dto.notes = this.notes;
    dto.recurrence = this.recurrence;
    dto.startDate = this.startDate ? this.startDate.format("YYYY-MM-DD") : undefined;
    dto.endDate = this.endDate ? this.endDate.format("YYYY-MM-DD") : undefined;
    dto.dayOfWeek = this.recurrence == TimeOffRecurrence.Weekly ? this.dayOfWeek : undefined;
    dto.dayOfMonth = this.recurrence == TimeOffRecurrence.Monthly ? this.dayOfMonth : undefined;
    dto.isAllDay = this.isAllDay;
    dto.timeFrom = this.isAllDay || !this.timeFrom ? undefined : this.timeFrom.format("HH:mm:ss");
    dto.timeTo = this.isAllDay || !this.timeTo ? undefined : this.timeTo.format("HH:mm:ss");
    return dto;
  }
}
