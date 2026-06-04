import dayjs, { Dayjs } from "dayjs";

export class TimeOffOccurrenceDTO {
  public date?: string;
  public label?: string;
  public notes?: string;
  public isAllDay?: boolean;
  public timeFrom?: string;
  public timeTo?: string;
}

export class TimeOffOccurrence {
  public date?: Dayjs;
  public label?: string;
  public notes?: string;
  public isAllDay: boolean;
  public timeFrom?: Dayjs;
  public timeTo?: Dayjs;

  constructor(dto: TimeOffOccurrenceDTO = new TimeOffOccurrenceDTO()) {
    this.date = dto.date ? dayjs(dto.date) : undefined;
    this.label = dto.label;
    this.notes = dto.notes;
    this.isAllDay = dto.isAllDay ?? false;
    this.timeFrom = dto.timeFrom ? dayjs(dto.timeFrom, "HH:mm:ss") : undefined;
    this.timeTo = dto.timeTo ? dayjs(dto.timeTo, "HH:mm:ss") : undefined;
  }
}
