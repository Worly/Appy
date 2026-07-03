import dayjs, { Dayjs } from "dayjs";

export interface HolidayDTO {
  id: number;
  name: string;
  countryCode: string;
  date?: string;
  originalDate?: string;
  isAllDay: boolean;
  timeFrom?: string;
  timeTo?: string;
  notes?: string;
  isEdited: boolean;
  isRemoved: boolean;
}

export class Holiday {
  public id: number;
  public name: string;
  public countryCode: string;
  public date?: Dayjs;
  public originalDate?: Dayjs;
  public isAllDay: boolean;
  public timeFrom?: Dayjs;
  public timeTo?: Dayjs;
  public notes?: string;
  public isEdited: boolean;
  public isRemoved: boolean;

  constructor(dto: HolidayDTO) {
    this.id = dto.id;
    this.name = dto.name;
    this.countryCode = dto.countryCode;
    this.date = dto.date ? dayjs(dto.date, "YYYY-MM-DD") : undefined;
    this.originalDate = dto.originalDate ? dayjs(dto.originalDate, "YYYY-MM-DD") : undefined;
    this.isAllDay = dto.isAllDay;
    this.timeFrom = dto.timeFrom ? dayjs(dto.timeFrom, "HH:mm:ss") : undefined;
    this.timeTo = dto.timeTo ? dayjs(dto.timeTo, "HH:mm:ss") : undefined;
    this.notes = dto.notes;
    this.isEdited = dto.isEdited;
    this.isRemoved = dto.isRemoved;
  }
}

export interface SupportedCountry {
  countryCode: string;
  name: string;
}

export class HolidayImportSettingsDTO {
  public countryCode?: string;
}

export class HolidayImportSettings {
  public countryCode?: string;

  constructor(dto: HolidayImportSettingsDTO = new HolidayImportSettingsDTO()) {
    this.countryCode = dto.countryCode;
  }

  public getDTO(): HolidayImportSettingsDTO {
    return { countryCode: this.countryCode };
  }
}

// Body for PUT /holiday/edit/{id}.
export interface HolidayEditRequest {
  date: string;        // YYYY-MM-DD
  isAllDay: boolean;
  timeFrom?: string;   // HH:mm:ss
  timeTo?: string;     // HH:mm:ss
  notes?: string;
}
