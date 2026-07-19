import dayjs, { Dayjs } from "dayjs";

// Merged list projection returned by GET /holiday/getList — the holiday flattened with its linked
// TimeOff's current state (effective date/time + edited badge), plus the link for navigation.
export interface HolidayListDTO {
  id: number;
  name: string;
  date: string;
  isAllDay: boolean;
  timeFrom?: string;
  timeTo?: string;
  isEdited: boolean;
  linkedTimeOffId?: number;
}

export class HolidayListItem {
  public id: number;
  public name: string;
  public date: Dayjs;
  public isAllDay: boolean;
  public timeFrom?: Dayjs;
  public timeTo?: Dayjs;
  public isEdited: boolean;
  public linkedTimeOffId?: number;

  // Removed ⇔ no linked TimeOff.
  public get isRemoved(): boolean { return this.linkedTimeOffId == null; }

  constructor(dto: HolidayListDTO) {
    this.id = dto.id;
    this.name = dto.name;
    this.date = dayjs(dto.date, "YYYY-MM-DD");
    this.isAllDay = dto.isAllDay;
    this.timeFrom = dto.timeFrom ? dayjs(dto.timeFrom, "HH:mm:ss") : undefined;
    this.timeTo = dto.timeTo ? dayjs(dto.timeTo, "HH:mm:ss") : undefined;
    this.isEdited = dto.isEdited;
    this.linkedTimeOffId = dto.linkedTimeOffId;
  }
}

// The immutable provider snapshot returned by GET /holiday/get/{id} and embedded in a TimeOff DTO.
// A 1:1 view of the ImportedHoliday row — the original date; the TimeOff carries the edited values.
export interface HolidayDTO {
  id: number;
  name: string;
  countryCode: string;
  date: string;
}

export class Holiday {
  public id: number;
  public name: string;
  public countryCode: string;
  public date: Dayjs;

  constructor(dto: HolidayDTO) {
    this.id = dto.id;
    this.name = dto.name;
    this.countryCode = dto.countryCode;
    this.date = dayjs(dto.date, "YYYY-MM-DD");
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
